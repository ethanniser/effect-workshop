import { BunServices, BunRuntime } from "@effect/platform-bun";
import {
  Console,
  Effect,
  FileSystem,
  Function,
  Layer,
  Match,
  Option,
  Schema as S,
  SchemaTransformation,
  pipe,
} from "effect";
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
  type HttpClientResponse,
} from "effect/unstable/http";

import * as M from "./model.ts";

const StringPairsFromStrings = S.Array(S.String).pipe(
  S.check(
    S.makeFilter(
      (arr: ReadonlyArray<string>) =>
        arr.every((s) => s.split(": ").length === 2),
      { message: 'expected "key: value" pairs' }
    )
  ),
  S.decodeTo(
    S.Array(S.Tuple([S.String, S.String])),
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

const main = Effect.gen(function* () {
  const options = yield* M.CLIOptions;

  const client: HttpClient.HttpClient = yield* HttpClient.HttpClient;

  const body = Option.getOrUndefined(options.data);

  const maybeReqBuilder = Match.value(options.method).pipe(
    Match.when("GET", () => HttpClientRequest.get),
    Match.when("POST", () => HttpClientRequest.post),
    Match.when("PUT", () => HttpClientRequest.put),
    Match.when("PATCH", () => HttpClientRequest.patch),
    Match.when(
      "DELETE",
      () => (url: string | URL) => HttpClientRequest.make("DELETE")(url)
    ),
    Match.option
  );

  const req: HttpClientRequest.HttpClientRequest = yield* pipe(
    Effect.fromOption(maybeReqBuilder),
    Effect.map((reqBuilder) =>
      reqBuilder(options.url).pipe(
        HttpClientRequest.setHeaders(Object.fromEntries(options.headers)),
        body ? HttpClientRequest.bodyText(body) : Function.identity
      )
    )
  );

  const res: HttpClientResponse.HttpClientResponse = yield* client.execute(req);

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

  const fs = yield* FileSystem.FileSystem;
  yield* Option.match(options.output, {
    onSome: (output) => fs.writeFileString(output, finalString),
    onNone: () => Console.log(finalString),
  });
}).pipe(Effect.scoped);

function getCliOption(
  cliArgs: string[],
  option: { name: string; alias?: string }
): Option.Option<string> {
  return Option.gen(function* () {
    const index = yield* pipe(
      cliArgs.findIndex(
        (arg) => arg === `--${option.name}` || arg === `-${option.alias}`
      ),
      (_) => (_ === -1 ? Option.none() : Option.some(_))
    );
    const nextIndex = index + 1;
    const value = yield* Option.fromNullishOr(cliArgs[nextIndex]);
    return value;
  });
}

function getCliOptionMultiple(
  cliArgs: string[],
  option: { name: string; alias?: string }
): string[] {
  const indexes = cliArgs.reduce((acc, arg, index) => {
    if (arg === `--${option.name}` || arg === `-${option.alias}`) {
      if (index > cliArgs.length - 1) {
        return acc;
      }
      acc.push(index);
    }
    return acc;
  }, [] as number[]);

  return indexes.reduce<string[]>((acc, index) => {
    acc.push(cliArgs[index + 1]!);
    return acc;
  }, []);
}

const CliOptionsLive = Layer.effect(
  M.CLIOptions,
  Effect.gen(function* () {
    const args = yield* Effect.sync(() => process.argv);

    const method = getCliOption(args, { name: "method", alias: "X" }).pipe(
      Option.getOrElse(() => "GET")
    );

    const data = getCliOption(args, { name: "data", alias: "d" });

    const headers = yield* pipe(
      getCliOptionMultiple(args, { name: "headers", alias: "H" }),
      S.decodeEffect(StringPairsFromStrings),
      Effect.mapError(() => new M.HeaderParseError())
    );

    const output = getCliOption(args, { name: "output", alias: "O" });
    const include = getCliOption(args, { name: "include", alias: "i" }).pipe(
      Option.flatMap((_) =>
        ["true", "false"].includes(_) ? Option.some(_) : Option.none()
      ),
      Option.map((_) => _ === "true")
    );

    const url = yield* Option.match(Option.some("https://jsonplaceholder.typicode.com/posts/1"), {
      onSome: (url) => Effect.succeed(url),
      onNone: () =>
        Effect.fail(new M.CliOptionsParseError({ error: "No url provided" })),
    });

    return {
      url,
      method,
      data,
      headers,
      output,
      include,
    };
  })
);

pipe(
  main,
  Effect.provide(CliOptionsLive),
  Effect.provide(FetchHttpClient.layer),
  Effect.provide(BunServices.layer),
  BunRuntime.runMain
);
