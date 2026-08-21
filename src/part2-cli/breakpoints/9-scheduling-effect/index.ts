import { BunServices, BunRuntime } from "@effect/platform-bun";
import {
  Config,
  Console,
  Duration,
  Effect,
  FileSystem,
  Function,
  Match,
  Option,
  Schema,
  SchemaGetter,
  SchemaIssue,
  SchemaTransformation,
  pipe,
} from "effect";
import { Argument, Command, Flag } from "effect/unstable/cli";
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
  type HttpClientResponse,
} from "effect/unstable/http";

import * as M from "./model.ts";

const main = Effect.gen(function* () {
  const options = yield* M.CLIOptions;

  const client: HttpClient.HttpClient = yield* HttpClient.HttpClient;

  const body = Option.getOrUndefined(options.data);
  const req: HttpClientRequest.HttpClientRequest = Match.value(options.method)
    .pipe(
      Match.when("GET", () => HttpClientRequest.get),
      Match.when("POST", () => HttpClientRequest.post),
      Match.when("PUT", () => HttpClientRequest.put),
      Match.when("PATCH", () => HttpClientRequest.patch),
      Match.when("DELETE", () => HttpClientRequest.make("DELETE")),
      Match.exhaustive
    )(options.url)
    .pipe(
      HttpClientRequest.setHeaders(Object.fromEntries(options.headers)),
      body ? HttpClientRequest.bodyText(body) : Function.identity
    );

  const res: HttpClientResponse.HttpClientResponse = yield* client
    .execute(req)
    .pipe(Effect.timeout(options.timeout));

  const buffer: string[] = [];

  if (Option.isSome(options.include)) {
    buffer.push(`${res.status}`);
    for (const [key, value] of Object.entries(res.headers)) {
      buffer.push(`${key}: ${value}`);
    }
    // Add an empty line to separate headers from body
    buffer.push("");
  }

  const text = yield* res.text;
  buffer.push(text);

  const finalString = buffer.join("\n");

  const fs: FileSystem.FileSystem = yield* FileSystem.FileSystem;
  yield* Option.match(options.output, {
    onSome: (output) => fs.writeFileString(output, finalString),
    onNone: () => Console.log(finalString),
  });
}).pipe(Effect.scoped);

const StringPairsFromStrings = Schema.Array(Schema.String).pipe(
  Schema.check(
    Schema.makeFilter(
      (arr: ReadonlyArray<string>) =>
        arr.every((s) => s.split(": ").length === 2),
      { message: 'expected "key: value" pairs' }
    )
  ),
  Schema.decodeTo(
    Schema.Array(Schema.Tuple([Schema.String, Schema.String])),
    SchemaTransformation.transform<
      ReadonlyArray<readonly [string, string]>,
      ReadonlyArray<string>
    >({
      decode: (arr) =>
        arr.map((s) => s.split(": ") as unknown as readonly [string, string]),
      encode: (arr) => arr.map((s) => s.join(": ")),
    })
  )
);

export const DurationFromString = Schema.String.pipe(
  Schema.decodeTo(Schema.Duration, {
    decode: SchemaGetter.transformOrFail((value: string) =>
      Effect.suspend(() => {
        try {
          return Effect.succeed(
            Duration.fromInputUnsafe(value as Duration.Input)
          );
        } catch {
          return Effect.fail(
            new SchemaIssue.InvalidValue({
              message: "String is not valid DurationInput",
            })
          );
        }
      })
    ),
    encode: SchemaGetter.transform(
      (duration) => `${Duration.toMillis(duration)} millis`
    ),
  })
);

const urlArg = Argument.string("url").pipe(
  Argument.withDescription("The URL to send the request to")
);

const methodFlag = Flag.choice("method", [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
]).pipe(
  Flag.withAlias("X"),
  Flag.withDescription("The HTTP method to use"),
  Flag.withDefault("GET")
);

const dataFlag = Flag.string("data").pipe(
  Flag.withAlias("d"),
  Flag.withDescription("The body of the request"),
  Flag.optional
);

const headersFlag = Flag.string("header").pipe(
  Flag.withAlias("H"),
  Flag.withDescription("The headers to send with the request"),
  Flag.atLeast(0),
  Flag.withSchema(StringPairsFromStrings)
);

const outputFlag = Flag.file("output").pipe(
  Flag.withAlias("o"),
  Flag.withDescription("The file to write the response to"),
  Flag.optional
);

const includeFlag = Flag.boolean("include").pipe(
  Flag.withAlias("i"),
  Flag.withDescription("Include the response headers in the output"),
  Flag.optional
);

const timeoutFlag = Flag.string("timeout").pipe(
  Flag.withFallbackConfig(Config.string("TIMEOUT").pipe(Config.withDefault("2 seconds"))),
  Flag.withSchema(DurationFromString),
  Flag.withDescription(
    'timeout each request after the specific duration (e.g. "200 millis", "1 seconds", "2 minutes")'
  )
);

const repeatEveryFlag = Flag.string("repeat-every").pipe(
  Flag.withSchema(DurationFromString),
  Flag.withDescription(
    'repeat the request on the specific duration (e.g. "200 millis", "1 seconds", "2 minutes")'
  ),
  Flag.optional
);

const maxRepeatsFlag = Flag.integer("max-repeats").pipe(
  Flag.withDescription("the maximum number of times to repeat the request"),
  Flag.optional
);

const backoffFlag = Flag.boolean("backoff").pipe(
  Flag.withDescription(
    "use an exponential backoff strategy for repeat intervals"
  ),
  Flag.optional
);

const backoffFactorFlag = Flag.float("backoff-factor").pipe(
  Flag.withDescription("the factor to use for exponential backoff"),
  Flag.optional
);

const backoffMaxFlag = Flag.string("backoff-max").pipe(
  Flag.withSchema(DurationFromString),
  Flag.withDescription(
    "the maximum number of time to wait between requests, uses the same unit as --repeat-every"
  ),
  Flag.optional
);

const cli = Command.make("bend", {
  url: urlArg,
  method: methodFlag,
  data: dataFlag,
  headers: headersFlag,
  output: outputFlag,
  include: includeFlag,
  timeout: timeoutFlag,
  repeatEvery: repeatEveryFlag,
  maxRepeats: maxRepeatsFlag,
  backoff: backoffFlag,
  backoffFactor: backoffFactorFlag,
  backoffMax: backoffMaxFlag,
})
  .pipe(Command.withHandler(() => main))
  .pipe(
    Command.provideSync(M.CLIOptions, (_) => _),
    Command.run({
      version: "1.0.0",
    }),
    Effect.provide(FetchHttpClient.layer),
    Effect.provide(BunServices.layer),
    BunRuntime.runMain
  );

export { cli };
