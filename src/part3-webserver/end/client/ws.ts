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
import * as M from "./model";
import WebSocket from "ws";
import * as S from "@effect/schema/Schema";
import * as C from "../shared/config";

export class WebSocketConnection extends Context.Tag("WebSocketConnection")<
  WebSocketConnection,
  M.ClientWebSocketConnection
>() {}

export const WebSocketConnectionLive = (name: string, color: M.Color) =>
  Layer.effect(
    WebSocketConnection,
    Effect.gen(function* (_) {
      const port = yield* _(C.PORT);
      const host = yield* _(C.HOST);
      const ws = yield* _(
        Effect.sync(() => new WebSocket(`ws://${host}:${port}`))
      );

      yield* _(
        Effect.async<void, M.WebSocketError>((emit) => {
          ws.on("open", () => {
            emit(Effect.succeed(undefined));
          });
          ws.on("error", (error) => {
            emit(Effect.fail(new M.WebSocketError({ error })));
          });
        })
      );

      yield* _(
        {
          _tag: "startup",
          color,
          name,
        },
        S.encode(M.StartupMessageFromJSON),
        Effect.flatMap((message) => Effect.sync(() => ws.send(message))),
        Effect.mapError(
          (error) =>
            new M.BadStartupMessageError({
              error: {
                _tag: "parseError",
                parseError: error,
              },
            })
        )
      );

      const messagesStream = Stream.async<
        M.ClientIncomingMessage,
        M.UnknownIncomingMessageError | M.WebSocketError
      >((emit) => {
        ws.on("message", (message) => {
          const messageString = message.toString();
          console.log(messageString);
          pipe(
            messageString,
            S.decodeUnknownEither(M.ClientIncomingMessageFromJSON),
            Either.mapLeft(
              (parseError) =>
                new M.UnknownIncomingMessageError({
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
          emit(Effect.fail(Option.some(new M.WebSocketError({ error }))));
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

      const sendQueue = yield* _(Queue.unbounded<M.ClientOutgoingMessage>());

      const sendFiber = yield* _(
        Queue.take(sendQueue),
        Effect.flatMap((message) =>
          S.encode(M.ClientOutgoingMessageFromJSON)(message)
        ),
        Effect.flatMap((messageString) =>
          Effect.sync(() => ws.send(messageString))
        ),
        Effect.catchAll((error) => Effect.logError(error)),
        Effect.forever,
        Effect.forkDaemon
      );

      const close = Effect.sync(() => ws.close());

      const connection: M.ClientWebSocketConnection = {
        _rawWS: ws,
        name,
        color,
        timeConnected: Date.now(),
        messages: messagesStream,
        send: sendQueue,
        sendFiber,
        close,
      };

      return connection;
    })
  );
