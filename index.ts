import { Config, Console, Effect, Layer, pipe } from "effect";
import * as Schema from "@effect/schema/Schema";
import { BunContext, KeyValueStore, Runtime } from "@effect/platform-bun";
import { Command, Args, Options } from "@effect/cli";
import { never } from "effect/Fiber";

const BendConfig = Config.all({
  timeout: Config.integer("BEND_TIMEOUT"),
  baseUrl: Config.string("BEND_BASE_URL"),
}).pipe(
  Config.withDefault({
    timeout: 5000,
    baseUrl: "",
  })
);

const methodOption = Options.text("method").pipe(
  Options.withAlias("X"),
  Options.withDefault("GET"),
  Options.withSchema(
    Schema.literal("GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS")
  ),
  Options.withDescription("the http method to use")
);

const headersOption = Options.text("headers").pipe(
  Options.withAlias("H"),
  Options.withDefault(""),
  Options.withDescription("the http headers to use")
);

const outputOption = Options.file("output").pipe(
  Options.withAlias("o"),
  Options.withDefault(""),
  Options.withDescription("the output file")
);

const run = Command.make(
  "bend",
  { methodOption, headersOption },
  ({ methodOption: method, headersOption: headers }) =>
    Console.log({
      method,
      headers,
    })
).pipe(
  Command.withDescription("an effect http client"),
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
