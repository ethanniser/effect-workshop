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

export const WebSocketConnection = Context.Tag<M.ClientWebSocketConnection>();

export const WebSocketConnectionLive = (name: string, color: M.Color) =>
  Layer.effect(
    WebSocketConnection,
    Effect.gen(function* (_) {
      const port = yield* _(
        Config.integer("PORT").pipe(Config.withDefault(3000))
      );
      const ws = yield* _(
        Effect.sync(() => new WebSocket(`ws://localhost:${port}`))
      );

      yield* _(
        Effect.async<never, M.WebSocketError, void>((emit) => {
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
        never,
        M.UnknownIncomingMessageError | M.WebSocketError,
        M.ClientIncomingMessage
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

      const connection: M.ClientWebSocketConnection = {
        _rawWS: ws,
        name,
        color,
        timeConnected: Date.now(),
        messages: messagesStream,
        send: sendQueue,
        sendFiber,
      };

      return connection;
    })
  );
