import {
  Chunk,
  Context,
  Effect,
  Either,
  Layer,
  Option,
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
} from "./model";
import WebSocket from "ws";
import * as S from "@effect/schema/Schema";

const WebSocketConnection = Context.Tag<ClientWebSocketConnection>();
type Name = {
  readonly _: unique symbol;
};
const Name = Context.Tag<Name, string>();

const WebSocketConnectionLive = Layer.effect(
  WebSocketConnection,
  Effect.gen(function* (_) {
    const ws = yield* _(
      Effect.sync(() => new WebSocket("ws://localhost:8080"))
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
      Effect.flatMap((message) => Effect.sync(() => ws.send(message)))
    );

    const messagesStream = Stream.async<
      never,
      UnknownIncomingMessageError | WebSocketError,
      ClientIncomingMessage
    >((emit) => {
      ws.on("message", (message) => {
        const messageString = message.toString();
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
        Effect.logDebug(`FROM: ${name}: ${JSON.stringify(message)}`)
      ),
      Stream.onError((error) =>
        Effect.logError(`FROM: ${name}: ${JSON.stringify(error)}`)
      ),
      Stream.either,
      Stream.filter(Either.isRight),
      Stream.map((either) => either.right)
    );

    throw new Error("TODO");
  })
);
