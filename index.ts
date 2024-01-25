#!/usr/bin/env bun

import {
  Config,
  ConfigError,
  ConfigProvider,
  Console,
  Data,
  Duration,
  Effect,
  Either,
  HashMap,
  Layer,
  Option,
  Schedule,
  pipe,
} from "effect";
import * as Schema from "@effect/schema/Schema";
import { BunContext, Runtime, FileSystem } from "@effect/platform-bun";
import { Args, Command, Options } from "@effect/cli";
import { HttpClient, HttpClientLive } from "./httpClient";
import { DurationFromString, HashMapFromStrings } from "./schema";
import * as ParseResult from "@effect/schema/ParseResult";

const BendConfig = Config.all({
  baseUrl: Config.string("BASE_URL").pipe(Config.option),
});

const timeoutOption = Options.integer("timeout").pipe(
  Options.withAlias("t"),
  Options.withFallbackConfig(
    Config.integer("TIMEOUT").pipe(Config.withDefault(2000))
  ),
  Options.withSchema(Schema.DurationFromMillis),
  Options.withDescription("the timeout in milliseconds")
);

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
  Options.map((_) => [_] as readonly string[]),
  Options.withSchema(HashMapFromStrings),
  Options.optional,
  Options.withDescription("the http headers to use")
);

const outputOption = Options.text("output").pipe(
  Options.withAlias("o"),
  Options.optional,
  Options.withDescription("the output file")
);

/*
--repeat-every: Repeat the request every specified number of seconds/minutes.
--max-repeats: The maximum number of times to repeat the request.
--backoff: Use an exponential backoff strategy for repeat intervals.
--backoff-factor: The factor to use for exponential backoff.
--backoff-max: The maximum number of seconds to wait between requests.
*/

const repeatEveryOption = Options.text("repeat-every").pipe(
  Options.withSchema(DurationFromString),
  // Options.optional,
  Options.withDescription(
    'repeat the request on the specific duration (e.g. "200 millis", "1 seconds", "2 minutes")'
  ),
  Options.optional
);

const maxRepeatsOption = Options.integer("max-repeats").pipe(
  Options.withDescription("the maximum number of times to repeat the request"),
  Options.optional
);

const backoffOption = Options.boolean("backoff").pipe(
  Options.withDescription(
    "use an exponential backoff strategy for repeat intervals"
  ),
  Options.optional
);

const backoffFactorOption = Options.float("backoff-factor").pipe(
  Options.withDescription("the factor to use for exponential backoff"),
  Options.optional
);

const backoffMaxOption = Options.text("backoff-max").pipe(
  Options.withSchema(DurationFromString),
  Options.withDescription(
    "the maximum number of time to wait between requests, uses the same unit as --repeat-every"
  ),
  Options.optional
);

const urlArgument = Args.text({ name: "url" }).pipe(
  Args.withDescription("the url to fetch")
);

class TimeoutError extends Data.TaggedClass("TimeoutError")<{
  readonly timeout: Duration.Duration;
}> {}

const run = Command.make(
  "bend",
  {
    urlArgument,
    http: [methodOption, headersOption, outputOption, dataOption],
    timing: [
      timeoutOption,
      repeatEveryOption,
      maxRepeatsOption,
      backoffOption,
      backoffFactorOption,
      backoffMaxOption,
    ],
  },
  ({
    urlArgument,
    http: [methodOption, headersOption, outputOption, dataOption],
    timing: [
      timeoutOption,
      repeatEveryOption,
      maxRepeatsOption,
      backoffOption,
      backoffFactorOption,
      backoffMaxOption,
    ],
  }) =>
    Effect.gen(function* (_) {
      const config = yield* _(BendConfig);
      const httpClient = yield* _(HttpClient);
      const url = Option.match(config.baseUrl, {
        onNone: () => urlArgument,
        onSome: (baseUrl) => baseUrl + urlArgument,
      });
      const body = Option.getOrUndefined(dataOption);
      const headers = Option.getOrUndefined(headersOption);

      const schedule = Option.map(repeatEveryOption, (repeatEvery) =>
        Option.match(backoffOption, {
          onSome: () =>
            Schedule.exponential(
              repeatEvery,
              Option.getOrUndefined(backoffFactorOption)
            ),
          onNone: () => Schedule.spaced(repeatEvery).pipe(Schedule.delays),
        }).pipe(
          Schedule.whileOutput((_) =>
            Option.match(backoffMaxOption, {
              onNone: () => true,
              onSome: (backoffMax) => Duration.lessThan(_, backoffMax),
            })
          ),
          Schedule.repetitions,
          Schedule.whileOutput((repetitions) =>
            Option.match(maxRepeatsOption, {
              onNone: () => true,
              onSome: (maxRepeats) => repetitions < maxRepeats,
            })
          )
        )
      );

      yield* _(
        Effect.gen(function* (_) {
          const result = yield* _(
            httpClient.fetch(url, {
              ...(methodOption && { method: methodOption }),
              ...(body && { body }),
              ...(headers && { headers }),
            }),

            Effect.timeout(timeoutOption),
            Effect.mapError((error) => {
              switch (error._tag) {
                case "NoSuchElementException":
                  return new TimeoutError({ timeout: timeoutOption });
                default:
                  return error;
              }
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
                result.body
                  ? fs
                      .writeFileString(output, result.body)
                      .pipe(
                        Effect.zipRight(
                          Console.log(`BODY SUCCESSFULLY WRITTEN TO: ${output}`)
                        )
                      )
                  : Effect.unit,
            })
          );
        }),
        Effect.repeat(
          Option.getOrElse(schedule, () =>
            Schedule.stop.pipe(Schedule.repetitions)
          )
        )
      );
    }).pipe(
      Effect.catchTags({
        TimeoutError: (error) =>
          Console.error(`Timeout after ${Duration.toMillis(error.timeout)}ms`),
        TextDecodeError: () => Console.error("Text decode error"),
      })
    )
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
