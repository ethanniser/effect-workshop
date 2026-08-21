import {
  Console,
  Effect,
  HashMap,
  Layer,
  Queue,
  Ref,
  Schedule,
  Schema,
  Stream,
  pipe,
} from "effect";
import type { SchemaError } from "effect/Schema";
import { type WebSocket, type WebSocketServer } from "ws";

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
            wss.removeAllListeners("connection");
            wss.removeAllListeners("error");
            wss.removeAllListeners("close");
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
  publish: (message: M.ServerOutgoingMessage) => Effect.Effect<void>
): Effect.Effect<
  void,
  M.BadStartupMessageError | M.UnknownIncomingMessageError,
  CurrentConnections
> =>
  Effect.gen(function* () {
    console.log("Initializing connection");
    const connectionsRef = yield* CurrentConnections;

    const { color, name } = yield* pipe(
      Effect.callback<M.StartupMessage, SchemaError>((emit) => {
        ws.once("message", (data) =>
          pipe(data.toString(), parseStartupMessage, emit)
        );
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
              error: { _tag: "colorAlreadyTaken", color: message.color },
            });
          }

          return message;
        })
      )
    );

    yield* Console.log(`New connection: ${name} (${color})`);

    yield* publish({ _tag: "join", name, color });

    const connection: M.WebSocketConnection = {
      _rawWS: ws,
      name,
      color,
      timeConnected: Date.now(),
      send: (message) =>
        pipe(
          message,
          encodeMessage,
          Effect.andThen((msg) => Effect.sync(() => ws.send(msg)))
        ),
      close: Effect.sync(() => ws.close()),
    };

    yield* Ref.update(connectionsRef, (connections) =>
      HashMap.set(connections, name, connection)
    );

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
      ),

      Stream.map((message) => ({
        ...message,
        name,
        color,
        timestamp: Date.now(),
      })),

      Stream.concat(Stream.make({ _tag: "leave", name, color } as const)),

      Stream.tapError((err) => Console.error(err))
    );

    yield* Stream.runForEach(parsedMessagesStream, publish);
  });

export const Live: Layer.Layer<
  never,
  Error | M.BadStartupMessageError | M.UnknownIncomingMessageError,
  CurrentConnections | WSSServer
> = Layer.effectDiscard(
  Effect.gen(function* () {
    const wss = yield* WSSServer;

    const currentConnectionsRef = yield* CurrentConnections;

    const publish = (message: M.ServerOutgoingMessage) =>
      Effect.gen(function* () {
        console.log("Publishing message", message);

        const connections = yield* Ref.get(currentConnectionsRef);

        yield* Effect.forEach(HashMap.values(connections), (conn) =>
          conn.send(message)
        );
      }).pipe(
        Effect.catch((err) => Console.error(err)),
        Effect.asVoid
      );

    const connectionsStream = createConnectionsStream(wss).pipe(
      Stream.tapError((err) => Console.error(err))
    );

    yield* Stream.runForEach(connectionsStream, (ws) =>
      initializeConnection(ws, publish)
    );

    yield* pipe(
      Effect.gen(function* () {
        const connections = yield* Ref.get(currentConnectionsRef);
        yield* Console.log(`Current connections: ${HashMap.size(connections)}`);
      }),

      Effect.repeat(Schedule.spaced("1 seconds"))
    );
    // hmmmm why dont these work?
  })
);
