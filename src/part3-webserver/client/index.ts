import {
  Console,
  Effect,
  Fiber,
  Layer,
  Match,
  Queue,
  ReadonlyArray,
  Ref,
  Stream,
  pipe,
} from "effect";
import { BunContext, Runtime, Terminal } from "@effect/platform-bun";
import { Args, Command, Options, Prompt } from "@effect/cli";
import { WebSocketConnection, WebSocketConnectionLive } from "./ws";

const rootCommand = Command.make("root", {}, () =>
  Effect.gen(function* (_) {
    const name = yield* _(Prompt.text({ message: "Please enter your name" }));
    const displayBuffer = yield* _(Ref.make<readonly string[]>([]));
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
          Stream.tap((message) =>
            pipe(
              terminal.columns,
              Effect.flatMap((columns) =>
                Ref.getAndUpdate(displayBuffer, (buffer) => {
                  if (buffer.length >= columns - 1) {
                    return buffer.slice(1).concat(message);
                  }
                  return buffer.concat(message);
                })
              )
            )
          ),
          Stream.catchAll((error) => Effect.logError(error)),
          Stream.runDrain,
          Effect.fork
        );

        const readFiber = yield* _(
          Effect.gen(function* (_) {}),
          Effect.forever,
          Effect.fork
        );

        yield* _(Fiber.joinAll([recieveFiber, readFiber]));
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
