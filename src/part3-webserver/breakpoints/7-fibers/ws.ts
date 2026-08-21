import {
  Console,
  Effect,
  Fiber,
  FiberSet,
  HashMap,
  Layer,
  PubSub,
  Queue,
  Ref,
  Schedule,
  Schema,
  type Scope,
  Stream,
  pipe,
} from "effect";
import type { SchemaError } from "effect/Schema";
import type { WebSocket, WebSocketServer } from "ws";

import * as M from "./model.ts";
import { CurrentConnections, WSSServer, getAvailableColors } from "./shared.ts";

type WsWebSocket = WebSocket;

const createConnectionsStream = (
  wss: WebSocketServer
): Stream.Stream<WebSocket, Error> =>
  Stream.callback<WebSocket, Error>(
    Effect.fn(function* (queue) {
      yield* Effect.acquireRelease(
        Effect.sync(() => {
          wss.on("connection", (ws: WsWebSocket) =>
            Queue.offerUnsafe(queue, ws)
          );
          wss.on("error", (err) => Queue.fail(queue, err));
          wss.on("close", () => Queue.end(queue));
        }),
        () =>
          Effect.sync(() => {
            wss.removeAllListeners();
          })
      );
    })
  ).pipe(Stream.tap(() => Console.log("New connection")));

const parseMessage = Schema.decodeEffect(
  Schema.fromJsonString(M.ServerIncomingMessage)
);

const encodeMessage = Schema.encodeEffect(
  Schema.fromJsonString(M.ServerOutgoingMessage)
);

const parseStartupMessage = Schema.decodeEffect(
  Schema.fromJsonString(M.StartupMessage)
);

const initializeConnection = (
  ws: WebSocket,
  sendToWsQueue: PubSub.Subscription<M.ServerOutgoingMessage>,
  broadcastQueue: PubSub.PubSub<M.ServerOutgoingMessage>
): Effect.Effect<
  void,
  | SchemaError
  | M.BadStartupMessageError
  | M.UnknownIncomingMessageError,
  CurrentConnections | Scope.Scope
> =>
  Effect.gen(function* () {
    console.log("Initializing connection");
    const currentConnectionsRef = yield* CurrentConnections;

    const { color, name } = yield* pipe(
      Effect.callback<M.StartupMessage, SchemaError>((emit) => {
        ws.once("message", (data) => {
          pipe(data.toString(), parseStartupMessage, emit);
        });
      }),

      Effect.mapError(
        (parseError) =>
          new M.BadStartupMessageError({
            error: { _tag: "parseError", parseError },
          })
      ),

      Effect.flatMap((message) =>
        Effect.gen(function* () {
          const availableColors = yield* getAvailableColors;

          if (!availableColors.includes(message.color)) {
            return yield* new M.BadStartupMessageError({
              error: {
                _tag: "colorAlreadyTaken",
                color: message.color,
              },
            });
          }

          return message;
        })
      )
    );

    yield* Console.log(`New connection: ${name} (${color})`);

    yield* PubSub.publish(broadcastQueue, { _tag: "join", name, color });

    const rawMessagesStream = Stream.callback<string, Error>(
      Effect.fn(function* (queue) {
        yield* Effect.acquireRelease(
          Effect.sync(() => {
            ws.on("message", (data) =>
              Queue.offerUnsafe(queue, data.toString())
            );
            ws.on("error", (err) => Queue.fail(queue, err));
            ws.on("close", () => Queue.end(queue));
          }),
          () =>
            Effect.sync(() => {
              ws.removeAllListeners();
            })
        );
      })
    );

    const parsedMessagesStream = pipe(
      rawMessagesStream,
      Stream.mapEffect((message) => parseMessage(message)),
      Stream.mapError(
        (parseError) => new M.UnknownIncomingMessageError({ parseError })
      )
    );

    const messagesWithInfoStream = parsedMessagesStream.pipe(
      Stream.map((message) => ({
        ...message,
        name,
        color,
        timestamp: Date.now(),
      })),

      Stream.concat(Stream.make({ _tag: "leave", name, color } as const)),

      Stream.tapError((err) => Console.error(err))
    );

    const broadcastFiber = yield* pipe(
      Stream.runForEach(messagesWithInfoStream, (message) =>
        PubSub.publish(broadcastQueue, message)
      ),
      Effect.forkChild
    );

    const manualSendQueue = yield* Queue.unbounded<M.ServerOutgoingMessage>();

    const toSendStream = Stream.fromQueue(manualSendQueue).pipe(
      Stream.merge(Stream.fromSubscription(sendToWsQueue))
    );

    const sendToWsFiber = yield* pipe(
      Stream.runForEach(toSendStream, (message) =>
        encodeMessage(message).pipe(
          Effect.flatMap((msg) => Effect.sync(() => ws.send(msg)))
        )
      ),
      Effect.forkChild
    );

    const connection: M.WebSocketConnection = {
      _rawWS: ws,
      name,
      color,
      timeConnected: Date.now(),
      messages: parsedMessagesStream,
      sendQueue: manualSendQueue,
      close: Effect.sync(() => ws.close()),
    };

    yield* Effect.addFinalizer(() => connection.close);

    yield* Ref.update(currentConnectionsRef, (connections) =>
      HashMap.set(connections, name, connection)
    );

    yield* Fiber.join(broadcastFiber);
    yield* Fiber.join(sendToWsFiber);
  });

export const Live: Layer.Layer<
  never,
  Error,
  CurrentConnections | Scope.Scope | WSSServer
> = Layer.effectDiscard(
  Effect.gen(function* () {
    const wss = yield* WSSServer;

    const currentConnectionsRef = yield* CurrentConnections;

    const fiberSet = yield* FiberSet.make<
      void,
      | M.UnknownIncomingMessageError
      | M.BadStartupMessageError
      | SchemaError
    >();

    const pubsub = yield* PubSub.unbounded<M.ServerOutgoingMessage>();

    const connectionsStream = createConnectionsStream(wss);

    const initializeConnectionsFiber = yield* pipe(
      connectionsStream,
      Stream.runForEach((ws) =>
        Effect.gen(function* () {
          const subscription = yield* PubSub.subscribe(pubsub);

          const fiber = yield* pipe(
            initializeConnection(ws, subscription, pubsub),
            Effect.forkChild
          );

          yield* FiberSet.add(fiberSet, fiber);
        })
      ),
      Effect.forkChild
    );

    const connectionLogFiber = yield* pipe(
      Effect.gen(function* () {
        const connections = yield* Ref.get(currentConnectionsRef);

        yield* Console.log(`Current connections: ${HashMap.size(connections)}`);

        for (const [name, connection] of HashMap.entries(connections)) {
          yield* Console.log(
            `Connection: ${name} (${connection.color}) - ${Math.floor(
              (Date.now() - connection.timeConnected) / 1000
            )}s`
          );
        }

        /**
         * forcefully sending a message to all clients
         */
        const message: M.ServerOutgoingMessage = {
          _tag: "message",
          name: "Server",
          color: "white",
          message: "THIS IS THE SERVER SPEAKING!",
          timestamp: Date.now(),
        };

        // yield* PubSub.publish(pubsub, message);

        /**
         * just to one client
         * forcefully sending a message to all clients
         */
        const ethanMessage: M.ServerOutgoingMessage = {
          _tag: "message",
          name: "Server",
          color: "red",
          message: "*I know it's you Ethan!*",
          timestamp: Date.now(),
        };

        const randomConnection = HashMap.get(connections, "ethan");

        if (randomConnection._tag === "Some") {
          yield* Queue.offer(randomConnection.value.sendQueue, ethanMessage);
        }
      }),

      Effect.repeat(Schedule.spaced("1 seconds")),

      Effect.forkChild
    );

    yield* Fiber.join(initializeConnectionsFiber);
    yield* Fiber.join(connectionLogFiber);
  })
);
