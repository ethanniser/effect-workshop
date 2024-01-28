import { Console, Effect, Layer, Match, Stream } from "effect";
import { BunContext, Runtime, Terminal } from "@effect/platform-bun";
import { Args, Command, Options, Prompt } from "@effect/cli";
import { Name, WebSocketConnection, WebSocketConnectionLive } from "./ws";
import * as S from "@effect/schema/Schema";

const fooOption = Options.text("foo");
const baseCommand = Command.make("base", { fooOption }, () => Effect.unit);

const namePrompt = Prompt.text({ message: "Please enter your name" });
const promptCommand = Command.prompt("prompt", namePrompt, (name) =>
  Effect.gen(function* (_) {
    const { fooOption } = yield* _(baseCommand);
    yield* _(Console.log(name, fooOption));
  })
);

const run = baseCommand.pipe(
  Command.withSubcommands([promptCommand]),
  Command.withDescription("a chat client"),
  Command.run({
    name: "Chat",
    version: "1.0.0",
  })
);

const main = Effect.suspend(() => run(globalThis.process.argv));

main.pipe(Effect.provide(BunContext.layer), Runtime.runMain);
