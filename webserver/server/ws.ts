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
  Fiber,
  Console,
  Schedule,
  Deferred,
} from "effect";
import WebSocket from "ws";
import {
  BadStartupMessageError,
  type ConnectionStore,
  IncomingMessage,
  StartupMessage,
  UnknownIncomingMessageError,
  WebSocketError,
  type WebSocketConnection,
  type MessagePubSub,
  OutgoingMessage,
  StartupMessageFromJSON,
  IncomingMessageFromJSON,
} from "./model";
import * as S from "@effect/schema/Schema";
import { formatError } from "@effect/schema/TreeFormatter";

const ConnectionStore = Context.Tag<ConnectionStore>();
export const ConnectionStoreLive = Layer.effect(
  ConnectionStore,
  Ref.make(HashMap.empty<string, WebSocketConnection>())
);
const MessagePubSub = Context.Tag<MessagePubSub>();
export const MessagePubSubLive = Layer.effect(
  MessagePubSub,
  PubSub.unbounded<OutgoingMessage>()
);

function registerConnection(ws: WebSocket) {
  return Effect.gen(function* (_) {
    const setupInfo = yield* _(
      Effect.async<never, BadStartupMessageError, StartupMessage>((emit) => {
        ws.once("message", (message) => {
          const messageString = message.toString();
          pipe(
            messageString,
            S.decodeUnknownEither(StartupMessageFromJSON),
            Either.mapLeft(
              (parseError) =>
                new BadStartupMessageError({
                  parseError,
                  rawMessage: messageString,
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
      UnknownIncomingMessageError | WebSocketError,
      IncomingMessage
    >((emit) => {
      ws.on("message", (message) => {
        const messageString = message.toString();
        pipe(
          messageString,
          S.decodeUnknownEither(IncomingMessageFromJSON),
          Either.mapLeft(
            (parseError) =>
              new UnknownIncomingMessageError({
                parseError,
                rawMessage: messageString,
              })
          ),
          Either.mapBoth({
            onRight: (message) => Chunk.make(message),
            onLeft: (error) => Option.some(error),
          }),
          emit
        );
      });
      ws.on("error", (error) => {
        emit(Effect.fail(Option.some(new WebSocketError({ error }))));
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

    const fiber = yield* _(
      Effect.gen(function* (_) {
        const messagePubSub = yield* _(MessagePubSub);

        // this fiber finishes when the connection is closed and the stream ends
        const sendFiber = yield* _(
          messagesStream,
          Stream.tap((message) =>
            PubSub.publish(messagePubSub, {
              _tag: "message",
              name: setupInfo.name,
              message: message.message,
              timestamp: Date.now(),
            })
          ),
          Stream.ensuring(
            PubSub.publish(messagePubSub, {
              _tag: "leave",
              name: setupInfo.name,
            })
          ),
          Stream.runDrain,
          Effect.fork
        );

        // this fiber finishes when the connection is closed and the stream ends
        const receiveFiber = yield* _(
          Stream.fromPubSub(messagePubSub),
          Stream.tap((message) =>
            Effect.logDebug(`TO: ${setupInfo.name}: ${JSON.stringify(message)}`)
          ),
          Stream.tap((message) =>
            Effect.sync(() => {
              ws.send(JSON.stringify(message));
            })
          ),
          Stream.runDrain,
          Effect.fork
        );

        // so other fibers can run
        yield* _(Effect.yieldNow());

        yield* _(
          PubSub.publish(messagePubSub, {
            _tag: "join",
            name: setupInfo.name,
          })
        );

        return Fiber.zipRight(sendFiber, receiveFiber);
      })
    );

    const connection: WebSocketConnection = {
      _rawWS: ws,
      name: setupInfo.name,
      messages: messagesStream,
      fiber,
    };

    const connectionStore = yield* _(ConnectionStore);
    yield* _(
      Ref.update(connectionStore, (store) =>
        HashMap.set(store, setupInfo.name, connection)
      )
    );
  }).pipe(
    Effect.catchAll((error) => Console.error(formatError(error.parseError)))
  );
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
  })
).pipe(Layer.provide(ConnectionStoreLive), Layer.provide(MessagePubSubLive));
