import { Console, Effect, Layer, Match, Stream } from "effect";
import { BunContext, Runtime, Terminal } from "@effect/platform-bun";
import { Args, Command, Options, Prompt } from "@effect/cli";
import { Name, WebSocketConnection, WebSocketConnectionLive } from "./ws";
import * as S from "@effect/schema/Schema";

const namePrompt = Prompt.text({ message: "Please enter your name" });

const nameCommand = Command.prompt("join", namePrompt, (name) =>
  Effect.gen(function* (_) {
    const wsConnection = yield* _(WebSocketConnection);
    const terminal = yield* _(Terminal.Terminal);
    yield* _(terminal.display(`Connected to server as ${name}\n`));
    yield* _(
      wsConnection.messages,
      Stream.map((message) =>
        Match.value(message).pipe(
          Match.when({ _tag: "join" }, (_) => `${_.name} has joined the chat.`),
          Match.when({ _tag: "leave" }, (_) => `${_.name} has left the chat.`),
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
      Stream.tap((message) => Effect.sync(() => terminal.display(message))),
      Stream.runDrain
    );
  }).pipe(
    Effect.provide(
      WebSocketConnectionLive.pipe(Layer.provide(Layer.succeed(Name, name)))
    )
  )
);

const baseCommand = Command.make("base", {}, () => Effect.unit);

const run = baseCommand.pipe(
  Command.withSubcommands([nameCommand]),
  Command.withDescription("a chat client"),
  Command.run({
    name: "Chat",
    version: "1.0.0",
  })
);

const main = Effect.suspend(() => run(globalThis.process.argv));

main.pipe(Effect.provide(BunContext.layer), Runtime.runMain);
