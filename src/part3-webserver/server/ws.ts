import { WebSocketServer } from "ws";
import { NodeServer } from "./node";
import {
  Context,
  Effect,
  HashMap,
  Layer,
  PubSub,
  Stream,
  Ref,
  Chunk,
  pipe,
  Either,
  Option,
  Console,
  Schedule,
  Queue,
} from "effect";
import WebSocket from "ws";
import * as M from "./model";
import { ConnectionStore, getAvailableColors } from "./shared";
import * as S from "@effect/schema/Schema";
import { formatError } from "@effect/schema/TreeFormatter";

const MessagePubSub = Context.Tag<M.MessagePubSub>();
export const MessagePubSubLive = Layer.effect(
  MessagePubSub,
  PubSub.unbounded<M.ServerOutgoingMessage>()
);

function registerConnection(ws: WebSocket) {
  return Effect.gen(function* (_) {
    const setupInfo = yield* _(
      Effect.async<
        M.ConnectionStore,
        M.BadStartupMessageError,
        M.StartupMessage
      >((emit) => {
        ws.once("message", (message) => {
          pipe(
            message.toString(),
            S.decodeUnknown(M.StartupMessageFromJSON),
            Effect.mapError(
              (parseError) =>
                new M.BadStartupMessageError({
                  error: { _tag: "parseError", parseError },
                })
            ),
            Effect.flatMap((message) =>
              Effect.gen(function* (_) {
                const availableColors = yield* _(getAvailableColors);
                if (!availableColors.includes(message.color)) {
                  yield* _(
                    new M.BadStartupMessageError({
                      error: {
                        _tag: "colorAlreadyTaken",
                        color: message.color,
                      },
                    })
                  );
                }
                return message;
              })
            ),
            emit
          );
        });
      })
    );

    yield* _(Effect.logDebug(`New connection from ${setupInfo.name}`));

    const messagesStream = Stream.async<
      never,
      M.UnknownIncomingMessageError | M.WebSocketError,
      M.ServerIncomingMessage
    >((emit) => {
      ws.on("message", (message) => {
        const messageString = message.toString();
        pipe(
          messageString,
          S.decodeUnknown(M.ServerIncomingMessageFromJSON),
          Effect.mapError(
            (parseError) =>
              new M.UnknownIncomingMessageError({
                parseError,
                rawMessage: messageString,
              })
          ),
          Effect.mapBoth({
            onSuccess: (message) => Chunk.make(message),
            onFailure: (error) => Option.some(error),
          }),
          emit
        );
      });
      ws.on("error", (error) => {
        emit(Effect.fail(Option.some(new M.WebSocketError({ error }))));
      });
      ws.on("close", () => {
        emit(Effect.fail(Option.none()));
      });
    }).pipe(
      Stream.tap((message) =>
        Effect.logDebug(`FROM: ${setupInfo.name}: ${JSON.stringify(message)}`)
      ),
      Stream.onError((error) =>
        Effect.logError(`FROM: ${setupInfo.name}: ${JSON.stringify(error)}`)
      ),
      Stream.either,
      Stream.filter(Either.isRight),
      Stream.map((either) => either.right)
    );

    const sendQueue = yield* _(Queue.unbounded<M.ServerOutgoingMessage>());

    const { sendFiber, receiveFiber } = yield* _(
      Effect.gen(function* (_) {
        const messagePubSub = yield* _(MessagePubSub);

        // this fiber finishes when the connection is closed and the stream ends
        const receiveFiber = yield* _(
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
              Effect.gen(function* (_) {
                const connectionStore = yield* _(ConnectionStore);
                yield* _(
                  Ref.update(connectionStore, (store) =>
                    HashMap.remove(store, setupInfo.name)
                  )
                );
              })
            )
          ),
          Stream.runDrain,
          Effect.fork
        );

        // this fiber finishes when the connection is closed and the stream ends
        const sendFiber = yield* _(
          Stream.fromPubSub(messagePubSub),
          Stream.tap((message) =>
            Effect.logDebug(`TO: ${setupInfo.name}: ${JSON.stringify(message)}`)
          ),
          Stream.tap((message) =>
            pipe(
              S.encode(M.ServerOutgoingMessageFromJSON)(message),
              Effect.flatMap((messageString) =>
                Effect.sync(() => ws.send(messageString))
              )
            )
          ),
          Stream.catchAll((error) => Effect.logError(error)),
          Stream.runDrain,
          Effect.zipLeft(
            pipe(
              Queue.take(sendQueue),
              Effect.flatMap((message) =>
                S.encode(M.ServerOutgoingMessageFromJSON)(message)
              ),
              Effect.flatMap((messageString) =>
                Effect.sync(() => ws.send(messageString))
              ),
              Effect.catchAll((error) => Effect.logError(error)),
              Effect.forever
            ),
            { concurrent: true }
          ),
          Effect.fork
        );

        // so other fibers can run
        yield* _(Effect.yieldNow());

        yield* _(
          PubSub.publish(messagePubSub, {
            _tag: "join",
            name: setupInfo.name,
            color: setupInfo.color,
          })
        );

        return { sendFiber, receiveFiber };
      })
    );

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

    const connectionStore = yield* _(ConnectionStore);
    yield* _(
      Ref.update(connectionStore, (store) =>
        HashMap.set(store, setupInfo.name, connection)
      )
    );
  }).pipe(Effect.catchAll((error) => Console.error(error)));
}

export const WSSServer = Context.Tag<WebSocketServer>();
export const WSSServerLive = Layer.effect(
  WSSServer,
  NodeServer.pipe(Effect.map((server) => new WebSocketServer({ server })))
);

export const WebSocketLive = Layer.effectDiscard(
  Effect.gen(function* (_) {
    const wss = yield* _(WSSServer);
    const connectionStream = Stream.async<never, never, WebSocket>((emit) => {
      wss.on("connection", (ws) => {
        emit(Effect.succeed(Chunk.make(ws)));
      });
    });

    // This fiber lives for the duration of the program
    yield* _(
      connectionStream,
      Stream.tap((ws) => registerConnection(ws)),
      Stream.runDrain,
      Effect.forkDaemon
    );

    // This fiber lives for the duration of the program
    const pubsub = yield* _(MessagePubSub);
    yield* _(
      Stream.fromPubSub(pubsub),
      Stream.tap((message) =>
        Console.info(`BROADCASTING: ${JSON.stringify(message)}`)
      ),
      Stream.runDrain,
      Effect.forkDaemon
    );

    // This fiber lives for the duration of the program
    yield* _(
      Effect.gen(function* (_) {
        const connectionStore = yield* _(ConnectionStore);
        const connections = yield* _(Ref.get(connectionStore));
        yield* _(
          Console.log(`Current Connections: ${HashMap.size(connections)}`)
        );
        for (const connection of HashMap.values(connections)) {
          const message = `${connection.name} connected for ${
            Date.now() - connection.timeConnected
          }ms`;
          yield* _(Console.log(message));
        }
      }),
      Effect.repeat(Schedule.spaced("1 seconds")),
      Effect.forkDaemon
    );
  })
).pipe(Layer.provide(MessagePubSubLive));
