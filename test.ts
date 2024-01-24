import { Console, Effect } from "effect";
import { BunContext, Runtime } from "@effect/platform-bun";
import { Command, Options } from "@effect/cli";

const outputOption = Options.file("output").pipe(
  Options.withAlias("o"),
  Options.optional,
  Options.withDescription("the output file")
);

const run = Command.make("test", { outputOption }, ({ outputOption }) =>
  Console.log({
    outputOption,
  })
).pipe(
  Command.run({
    name: "Test",
    version: "1.0.0",
  })
);

const main = Effect.suspend(() => run(globalThis.process.argv));

main.pipe(
  Effect.provide(BunContext.layer),
  Effect.tapErrorCause(Effect.logError),
  Runtime.runMain
);
