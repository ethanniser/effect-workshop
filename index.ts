#!/usr/bin/env bun

import {
  Config,
  ConfigError,
  ConfigProvider,
  Console,
  Effect,
  Either,
  HashMap,
  Layer,
  Option,
  pipe,
} from "effect";
import * as Schema from "@effect/schema/Schema";
import { BunContext, Runtime, FileSystem } from "@effect/platform-bun";
import { Args, Command, Options } from "@effect/cli";
import { HttpClient, HttpClientLive } from "./httpClient";

const BendConfig = Config.all({
  baseUrl: Config.string("BASE_URL").pipe(Config.option),
});

// const timeoutOption = Options.integer("timeout").pipe(
//   Options.withAlias("t"),
//   Options.withFallbackConfig(
//     Config.integer("TIMEOUT").pipe(Config.withDefault(2000))
//   ),
//   Options.withSchema(Schema.DurationFromMillis),
//   Options.withDescription("the timeout in milliseconds")
// );

const dataOption = Options.text("data").pipe(
  Options.withAlias("d"),
  Options.optional,
  Options.withDescription("the data to send")
);

const methodOption = Options.text("method").pipe(
  Options.withAlias("X"),
  Options.withDefault("GET"),
  Options.withSchema(Schema.literal("GET", "POST", "PUT", "DELETE")),
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

const urlArgument = Args.text({ name: "url" }).pipe(
  Args.withDescription("the url to fetch")
);

function parseToHashMap(
  input: readonly string[]
): HashMap.HashMap<string, string> {
  return input.reduce((acc, header) => {
    const [key, value] = header.split(":");
    return HashMap.set(acc, key, value);
  }, HashMap.empty<string, string>());
}

const run = Command.make(
  "bend",
  { urlArgument, methodOption, headersOption, outputOption, dataOption },
  ({ urlArgument, methodOption, headersOption, outputOption, dataOption }) =>
    Effect.gen(function* (_) {
      const config = yield* _(BendConfig);
      const httpClient = yield* _(HttpClient);
      const url = Option.match(config.baseUrl, {
        onNone: () => urlArgument,
        onSome: (baseUrl) => baseUrl + urlArgument,
      });
      const body = Option.getOrUndefined(dataOption);
      const headers = Option.match(headersOption, {
        onNone: () => undefined,
        onSome: (headers) => parseToHashMap(headers),
      });
      const result = yield* _(
        httpClient.fetch(url, {
          method: methodOption,
          body,
          headers,
        })
      );

      yield* _(Console.log("STATUS: ", result.status, result.statusText));

      for (const [key, value] of HashMap.toEntries(result.headers)) {
        yield* _(Console.log("HEADER: ", key, value));
      }

      const fs = yield* _(FileSystem.FileSystem);

      yield* _(
        Option.match(outputOption, {
          onNone: () => Console.log("BODY: ", result.body),
          onSome: (output) =>
            result.body ? fs.writeFileString(output, result.body) : Effect.unit,
        })
      );
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
  Effect.provide(HttpClientLive),
  Effect.withConfigProvider(
    ConfigProvider.nested(ConfigProvider.fromEnv(), "BEND")
  ),
  Effect.tapErrorCause(Effect.logError),
  Runtime.runMain
);
