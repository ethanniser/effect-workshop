import {
  Config,
  ConfigProvider,
  Console,
  Effect,
  Layer,
  Option,
  pipe,
} from "effect";
import * as Schema from "@effect/schema/Schema";
import { BunContext, Runtime } from "@effect/platform-bun";
import { Command, Options } from "@effect/cli";

const BendConfig = Config.all({
  timeout: Config.integer("TIMEOUT"),
  baseUrl: Config.string("BASE_URL"),
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

const headersOption = Options.text("header").pipe(
  Options.withAlias("H"),
  Options.repeated,
  Options.optional,
  Options.withDescription("the http headers to use")
);

const outputOption = Options.text("output").pipe(
  Options.withAlias("o"),
  Options.optional,
  Options.withDescription("the output file")
);

const run = Command.make(
  "bend",
  { methodOption, headersOption, outputOption },
  ({ methodOption, headersOption, outputOption }) =>
    Console.log({
      methodOption,
      headersOption,
      outputOption,
    })
).pipe(
  Command.withDescription("an effect http client"),
  Command.run({
    name: "Test",
    version: "1.0.0",
  })
);

const main = Effect.suspend(() => run(globalThis.process.argv));

main.pipe(
  Effect.provide(BunContext.layer),
  Effect.withConfigProvider(
    ConfigProvider.nested(ConfigProvider.fromEnv(), "BEND")
  ),
  Effect.tapErrorCause(Effect.logError),
  Runtime.runMain
);
