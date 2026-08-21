import {
  Console,
  Context,
  Effect,
  HashMap,
  Layer,
  PubSub,
  Queue,
  Ref,
  Result,
  Schedule,
  Schema,
  Stream,
  pipe,
} from "effect";
import { type WebSocket, WebSocketServer } from "ws";
import type * as Fiber from "effect/Fiber";

import * as M from "./model.ts";
import { NodeServer } from "./node.ts";
import { ConnectionStore, getAvailableColors } from "./shared.ts";

export class MessagePubSub extends Context.Service<
  MessagePubSub,
  M.MessagePubSub
>()("MessagePubSub") {
  public static readonly Live: Layer.Layer<MessagePubSub, never, never> =
    Layer.effect(MessagePubSub, PubSub.unbounded<M.ServerOutgoingMessage>());
}

function registerConnection(
  ws: WebSocket
): Effect.Effect<void, never, MessagePubSub | ConnectionStore> {
  return Effect.gen(function* () {
    const setupInfo = yield* Effect.callback<
      M.StartupMessage,
      M.BadStartupMessageError,
      ConnectionStore
    >((emit) => {
      ws.once("message", (message) => {
        pipe(
          message.toString(),

          Schema.decodeUnknownEffect(M.StartupMessageFromJSON),

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
                yield* new M.BadStartupMessageError({
                  error: {
                    _tag: "colorAlreadyTaken",
                    color: message.color,
                  },
                });
              }
              return message;
            })
          ),

          emit
        );
      });
    });

    yield* Effect.logDebug(`New connection from ${setupInfo.name}`);

    const messagesStream = Stream.callback<
      Result.Result<M.ServerIncomingMessage, M.UnknownIncomingMessageError>,
      M.WebSocketError
    >(
      Effect.fn(function* (queue) {
        ws.on("message", (message) => {
          const messageString = message.toString();

          const result = pipe(
            Schema.decodeResult(M.ServerIncomingMessageFromJSON)(messageString),
            Result.mapError(
              (parseError) =>
                new M.UnknownIncomingMessageError({
                  parseError,
                  rawMessage: messageString,
                })
            )
          );

          Queue.offerUnsafe(queue, result);
        });

        ws.on("error", (error) =>
          Queue.fail(queue, new M.WebSocketError({ error }))
        );

        ws.on("close", () => Queue.end(queue));
      })
    ).pipe(
      Stream.map((result) =>
        pipe(
          result,
          Result.tap((message) =>
            Effect.logDebug(
              `FROM: ${setupInfo.name}: ${JSON.stringify(message)}`
            )
          )
        )
      ),

      Stream.catchCause(() => Stream.empty),

      Stream.filter(Result.isSuccess),

      Stream.map((result) => result.success)
    );

    const sendQueue = yield* Queue.unbounded<M.ServerOutgoingMessage>();

    const { sendFiber, receiveFiber } = yield* Effect.gen(function* () {
      const messagePubSub = yield* MessagePubSub;

      // this fiber finishes when the connection is closed and the stream ends
      const receiveFiber = yield* pipe(
        messagesStream,

        Stream.tap((message) =>
          PubSub.publish(messagePubSub, {
            _tag: "message",
            name: setupInfo.name,
            color: setupInfo.color,
            message: message.message,
            timestamp: Date.now(),
          })
        ),

        Stream.ensuring(
          Effect.zip(
            PubSub.publish(messagePubSub, {
              _tag: "leave",
              name: setupInfo.name,
              color: setupInfo.color,
            }),
            Effect.gen(function* () {
              const connectionStore = yield* ConnectionStore;
              yield* Ref.update(connectionStore, (store) =>
                HashMap.remove(store, setupInfo.name)
              );
            })
          )
        ),

        Stream.runDrain,

        Effect.forkChild
      );

      // this fiber finishes when the connection is closed and the stream ends
      const sendFiber = yield* pipe(
        Stream.fromPubSub(messagePubSub),

        Stream.tap((message) =>
          Effect.logDebug(`TO: ${setupInfo.name}: ${JSON.stringify(message)}`)
        ),

        Stream.mapEffect((message) =>
          pipe(
            Schema.encodeEffect(M.ServerOutgoingMessageFromJSON)(message),
            Effect.flatMap((messageString) =>
              Effect.sync(() => ws.send(messageString))
            ),
            Effect.catch((error) => Effect.logError(error))
          )
        ),

        Stream.runDrain,

        Effect.zip(
          Effect.forever(
            pipe(
              Queue.take(sendQueue),
              Effect.flatMap((message) =>
                Schema.encodeEffect(M.ServerOutgoingMessageFromJSON)(message)
              ),
              Effect.flatMap((messageString) =>
                Effect.sync(() => ws.send(messageString))
              ),
              Effect.catch((error) => Effect.logError(error))
            )
          ),
          { concurrent: true }
        ),

        Effect.forkChild
      );

      // so other fibers can run
      yield* Effect.yieldNow;

      yield* PubSub.publish(messagePubSub, {
        _tag: "join",
        name: setupInfo.name,
        color: setupInfo.color,
      });

      return {
        sendFiber: sendFiber as Fiber.Fiber<void, never>,
        receiveFiber: receiveFiber as Fiber.Fiber<void, never>,
      };
    });

    const close = Effect.sync(() => ws.close());

    const connection: M.ServerWebSocketConnection = {
      _rawWS: ws,
      name: setupInfo.name,
      color: setupInfo.color,
      timeConnected: Date.now(),
      messages: messagesStream,
      send: sendQueue,
      sendFiber,
      receiveFiber,
      close,
    };

    const connectionStore = yield* ConnectionStore;

    yield* Ref.update(connectionStore, (store) =>
      HashMap.set(store, setupInfo.name, connection)
    );
  }).pipe(Effect.catch((error) => Console.error(error)));
}

export class WSSServer extends Context.Service<WSSServer, WebSocketServer>()(
  "WSSServer"
) {
  public static readonly Live: Layer.Layer<WSSServer, never, NodeServer> =
    Layer.effect(
      WSSServer,
      Effect.gen(function* () {
        const server = yield* NodeServer;
        return new WebSocketServer({ server });
      })
    );
}

export const WebSocketLive: Layer.Layer<
  never,
  never,
  ConnectionStore | WSSServer
> = Layer.effectDiscard(
  Effect.gen(function* () {
    const wss = yield* WSSServer;

    const connectionStream = Stream.callback<WebSocket>(
      Effect.fn(function* (queue) {
        wss.on("connection", (ws) => Queue.offerUnsafe(queue, ws));
      })
    );

    /**
     * This fiber lives for the duration of the program
     */
    yield* pipe(
      connectionStream,

      Stream.tap((ws) => registerConnection(ws)),

      Stream.runDrain,

      Effect.forkDetach
    );

    /**
     * This fiber lives for the duration of the program
     */
    const pubsub = yield* MessagePubSub;

    yield* pipe(
      Stream.fromPubSub(pubsub),

      Stream.tap((message) =>
        Console.info(`BROADCASTING: ${JSON.stringify(message)}`)
      ),

      Stream.runDrain,

      Effect.forkDetach
    );

    /**
     * This fiber lives for the duration of the program
     */
    yield* pipe(
      Effect.gen(function* () {
        const connectionStore = yield* ConnectionStore;

        const connections = yield* Ref.get(connectionStore);

        yield* Console.log(`Current Connections: ${HashMap.size(connections)}`);

        for (const connection of HashMap.values(connections)) {
          yield* Console.log(
            `${connection.name} connected for ${Date.now() - connection.timeConnected}ms`
          );
        }
      }),

      Effect.repeat(Schedule.spaced("1 seconds")),

      Effect.forkDetach
    );
  })
).pipe(Layer.provide(MessagePubSub.Live));
