import { Console, Effect, Fiber, Layer, Match, Queue, Stream } from "effect";
import { BunContext, Runtime, Terminal } from "@effect/platform-bun";
import { Args, Command, Options, Prompt } from "@effect/cli";
import { WebSocketConnection, WebSocketConnectionLive } from "./ws";
import * as S from "@effect/schema/Schema";

const rootCommand = Command.make("root", {}, () =>
  Effect.gen(function* (_) {
    const name = yield* _(Prompt.text({ message: "Please enter your name" }));
    yield* _(
      Effect.gen(function* (_) {
        const wsConnection = yield* _(WebSocketConnection);
        const terminal = yield* _(Terminal.Terminal);
        yield* _(terminal.display(`Connected to server as ${name}\n`));
        const recieveFiber = yield* _(
          wsConnection.messages,
          Stream.map((message) =>
            Match.value(message).pipe(
              Match.when(
                { _tag: "join" },
                (_) => `${_.name} has joined the chat.`
              ),
              Match.when(
                { _tag: "leave" },
                (_) => `${_.name} has left the chat.`
              ),
              Match.when(
                { _tag: "message" },
                (_) =>
                  `${new Date(_.timestamp).toLocaleTimeString()} - ${_.name}: ${
                    _.message
                  }`
              ),
              Match.exhaustive
            )
          ),
          Stream.tap((message) => terminal.display(message)),
          Stream.catchAll((error) => Effect.logError(error)),
          Stream.runDrain,
          Effect.fork
        );

        const sendFiber = yield* _(
          terminal.readLine,
          Effect.flatMap((message) =>
            Queue.offer(wsConnection.send, { _tag: "message", message })
          ),
          Effect.forever,
          Effect.fork
        );

        yield* _(Fiber.joinAll([recieveFiber, sendFiber]));
      }),
      Effect.provide(WebSocketConnectionLive(name))
    );
  })
);

const run = rootCommand.pipe(
  Command.withDescription("a chat client"),
  Command.run({
    name: "Chat",
    version: "1.0.0",
  })
);

const main = Effect.suspend(() => run(globalThis.process.argv));

main.pipe(Effect.provide(BunContext.layer), Runtime.runMain);
