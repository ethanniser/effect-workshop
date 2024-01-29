import { Command, Options, Prompt } from "@effect/cli";
import { NodeContext, Runtime } from "@effect/platform-node";
import { Effect } from "effect";

const run = Command.make("prompter", {
  verbose: Options.boolean("verbose").pipe(Options.withAlias("v")),
}).pipe(
  Command.withHandler(({ verbose }) =>
    Effect.gen(function* (_) {
      const name = yield* _(Prompt.run(Prompt.text({ message: "Name?" })));
      console.log(`Hello ${name}! (verbose: ${verbose})`);
    })
  ),
  Command.run({
    name: "prompter",
    version: "1.0.0",
  })
);

run(process.argv).pipe(Effect.provide(NodeContext.layer), Runtime.runMain);
