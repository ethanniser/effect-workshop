import {
  Context,
  Effect,
  Layer,
  Queue,
  Result,
  Schema,
  Stream,
  pipe,
} from "effect";
import WebSocket from "ws";

import * as C from "../shared/config.ts";
import * as M from "./model.ts";

export class WebSocketConnection extends Context.Service<
  WebSocketConnection,
  M.ClientWebSocketConnection
>()("WebSocketConnection") {
  public static readonly Live = (name: string, color: M.Color) =>
    Layer.effect(
      WebSocketConnection,
      Effect.gen(function* () {
        const port = yield* C.PORT;

        const host = yield* C.HOST;

        const ws = yield* Effect.sync(
          () => new WebSocket(`ws://${host}:${port}`)
        );

        yield* Effect.callback<void, M.WebSocketError>((emit) => {
          ws.on("open", () => emit(Effect.succeed(undefined)));

          ws.on("error", (error) =>
            emit(Effect.fail(new M.WebSocketError({ error })))
          );
        });

        yield* pipe(
          M.StartupMessage.make({ _tag: "startup", color, name }),

          Schema.encodeEffect(M.StartupMessageFromJSON),

          Effect.flatMap((message) => Effect.sync(() => ws.send(message))),

          Effect.mapError(
            (parseError) =>
              new M.BadStartupMessageError({
                error: { _tag: "parseError", parseError },
              })
          )
        );

        const messagesStream = Stream.callback<
          Result.Result<
            M.ClientIncomingMessage,
            M.UnknownIncomingMessageError
          >,
          M.WebSocketError
        >(
          Effect.fn(function* (queue) {
            ws.on("message", (message) => {
              const messageString = message.toString();

              console.log(messageString);

              const result = pipe(
                Schema.decodeResult(M.ClientIncomingMessageFromJSON)(
                  messageString
                ),
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
          Stream.tap((message) =>
            Effect.logDebug(`MESSAGE RECEIVED: ${JSON.stringify(message)}`)
          ),

          Stream.onError((error) =>
            Effect.logError(`ERROR: ${JSON.stringify(error)}`)
          ),

          Stream.catchCause(() => Stream.empty),

          Stream.filter(Result.isSuccess),

          Stream.map((result) => result.success)
        );

        const sendQueue = yield* Queue.unbounded<M.ClientOutgoingMessage>();

        const sendFiber = yield* pipe(
          Queue.take(sendQueue),

          Effect.flatMap((message) =>
            pipe(message, Schema.encodeEffect(M.ClientOutgoingMessageFromJSON))
          ),

          Effect.flatMap((messageString) =>
            Effect.sync(() => ws.send(messageString))
          ),

          Effect.catch((error) => Effect.logError(error)),

          Effect.forever,

          Effect.forkDetach
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
}
