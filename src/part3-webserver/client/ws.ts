import {
  Chunk,
  Config,
  Context,
  Effect,
  Either,
  Layer,
  Option,
  Queue,
  Stream,
  pipe,
} from "effect";
import {
  UnknownIncomingMessageError,
  WebSocketError,
  type ClientWebSocketConnection,
  ClientIncomingMessage,
  ClientIncomingMessageFromJSON,
  BadStartupMessageError,
  StartupMessage,
  StartupMessageFromJSON,
  ClientOutgoingMessage,
  ClientOutgoingMessageFromJSON,
} from "./model";
import WebSocket from "ws";
import * as S from "@effect/schema/Schema";

export const WebSocketConnection = Context.Tag<ClientWebSocketConnection>();
type Name = {
  readonly _: unique symbol;
};
export const Name = Context.Tag<Name, string>();

export const WebSocketConnectionLive = Layer.effect(
  WebSocketConnection,
  Effect.gen(function* (_) {
    const port = yield* _(
      Config.integer("PORT").pipe(Config.withDefault(3000))
    );
    const ws = yield* _(
      Effect.sync(() => new WebSocket(`ws://localhost:${port}`))
    );

    yield* _(
      Effect.async<never, WebSocketError, void>((emit) => {
        ws.on("open", () => {
          emit(Effect.succeed(undefined));
        });
        ws.on("error", (error) => {
          emit(Effect.fail(new WebSocketError({ error })));
        });
      })
    );

    const name = yield* _(Name);

    yield* _(
      {
        _tag: "startup",
        name,
      },
      S.encode(StartupMessageFromJSON),
      Effect.flatMap((message) => Effect.sync(() => ws.send(message))),
      Effect.mapError(
        (error) => new BadStartupMessageError({ parseError: error })
      )
    );

    const messagesStream = Stream.async<
      never,
      UnknownIncomingMessageError | WebSocketError,
      ClientIncomingMessage
    >((emit) => {
      ws.on("message", (message) => {
        const messageString = message.toString();
        console.log(messageString);
        pipe(
          messageString,
          S.decodeUnknownEither(ClientIncomingMessageFromJSON),
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
        Effect.logDebug(`MESSAGE RECIEVED: ${JSON.stringify(message)}`)
      ),
      Stream.onError((error) =>
        Effect.logError(`ERROR: ${JSON.stringify(error)}`)
      ),
      Stream.either,
      Stream.filter(Either.isRight),
      Stream.map((either) => either.right)
    );

    const sendQueue = yield* _(Queue.unbounded<ClientOutgoingMessage>());

    const sendFiber = yield* _(
      Queue.take(sendQueue),
      Effect.flatMap((message) =>
        S.encode(ClientOutgoingMessageFromJSON)(message)
      ),
      Effect.flatMap((messageString) =>
        Effect.sync(() => ws.send(messageString))
      ),
      Effect.catchAll((error) => Effect.logError(error)),
      Effect.forever,
      Effect.forkDaemon
    );

    const connection: ClientWebSocketConnection = {
      _rawWS: ws,
      name,
      timeConnected: Date.now(),
      messages: messagesStream,
      send: sendQueue,
      sendFiber,
    };

    return connection;
  })
);
