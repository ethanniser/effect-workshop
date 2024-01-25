import { Console, Effect } from "effect";
import { BunContext, Runtime } from "@effect/platform-bun";
import { Command, Options } from "@effect/cli";

const optionOne = Options.text("one").pipe(Options.optional);

const run = Command.make(
  "test",
  //   { optionOne },
  //   ({ optionOne }) => Console.log(optionOne)
  {
    nest: [{ optionOne }],
  },
  ({ nest: [{ optionOne }] }) => Console.log(optionOne)
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
