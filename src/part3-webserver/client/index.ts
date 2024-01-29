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

const write = (bufferRef: Ref.Ref<readonly string[]>) =>
  Effect.gen(function* (_) {
    const terminal = yield* _(Terminal.Terminal);
    const buffer = yield* _(Ref.get(bufferRef));
    yield* _(terminal.display("\x1Bc"));
    const prompt = "\nENTER MESSAGE >> ";
    const messages = buffer.join("\n") + prompt;
    yield* _(terminal.display(messages));
  });

const rootCommand = Command.make("root", {}, () =>
  Effect.gen(function* (_) {
    const name = yield* _(Prompt.text({ message: "Please enter your name" }));
    const displayBuffer = yield* _(
      Ref.make<readonly string[]>([`Connected to server as ${name}`])
    );
    yield* _(write(displayBuffer));
    yield* _(
      Effect.gen(function* (_) {
        const wsConnection = yield* _(WebSocketConnection);
        const terminal = yield* _(Terminal.Terminal);
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
              ),
              Effect.zip(write(displayBuffer))
            )
          ),
          Stream.catchAll((error) => Effect.logError(error)),
          Stream.runDrain,
          Effect.fork
        );

        const readFiber = yield* _(
          terminal.readLine,
          Effect.flatMap((message) =>
            Queue.offer(wsConnection.send, { _tag: "message", message })
          ),
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
