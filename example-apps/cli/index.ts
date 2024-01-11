import { Effect, Layer, pipe } from "effect";
import { BunContext, KeyValueStore, Runtime } from "@effect/platform-bun";
import { Command } from "@effect/cli";

const bar = Command.make("bar", {}, () => Effect.log("bar"));

const run = Command.make("foo", {}, () => Effect.log("hi")).pipe(
  Command.withDescription("a test cli"),
  Command.withSubcommands([bar]),
  Command.run({
    name: "Test",
    version: "1.0.0",
  })
);

const main = Effect.suspend(() => run(globalThis.process.argv.slice(2)));

main.pipe(
  Effect.provide(BunContext.layer),
  Effect.tapErrorCause(Effect.logError),
  Runtime.runMain
);
