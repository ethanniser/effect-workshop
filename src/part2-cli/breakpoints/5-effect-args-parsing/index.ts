import * as fs from "node:fs/promises";
import {
  Console,
  Effect,
  Layer,
  Option,
  Schema,
  SchemaTransformation,
  pipe,
} from "effect";

import * as M from "./model.ts";

const StringPairsFromStrings = Schema.Array(Schema.String).pipe(
  Schema.check(
    Schema.makeFilter(
      (arr: ReadonlyArray<string>) =>
        arr.every((s) => s.split(": ").length === 2),
      { message: "expected \"key: value\" pairs" }
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

const main = Effect.gen(function* () {
  const options = yield* M.CLIOptions;

  const providedFetch = yield* M.Fetch;

  const body = Option.getOrUndefined(options.data);

  const res: Response = yield* Effect.tryPromise({
    try: (signal) =>
      providedFetch(options.url, {
        ...(body && { body }),
        method: options.method,
        headers: Object.fromEntries(options.headers),
        signal,
      }),
    catch: (error) => new M.UnknownError({ error }),
  });

  const buffer: string[] = [];

  if (options?.include) {
    buffer.push(`${res.status} ${res.statusText}`);
    res.headers.forEach((value, key) => {
      buffer.push(`${key}: ${value}`);
    });
    // Add an empty line to separate headers from body
    buffer.push("");
  }

  const text = yield* Effect.tryPromise({
    try: () => res.text(),
    catch: () => new M.TextDecodeError(),
  });

  buffer.push(text);

  const finalString = buffer.join("\n");
  yield* Option.match(options.output, {
    onSome: (output) =>
      Effect.promise(() => fs.writeFile(output, finalString)),
    onNone: () => Console.log(finalString),
  });
});

function getCliOption(
  cliArgs: string[],
  option: {
    name: string;
    alias?: string;
  }
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

    const method = getCliOption(args, {
      name: "method",
      alias: "X",
    }).pipe(Option.getOrElse(() => "GET"));

    const data = getCliOption(args, {
      name: "data",
      alias: "d",
    });

    const headers = yield* pipe(
      getCliOptionMultiple(args, {
        name: "headers",
        alias: "H",
      }),
      Schema.decodeEffect(StringPairsFromStrings),
      Effect.mapError(() => new M.HeaderParseError())
    );

    const output = getCliOption(args, {
      name: "output",
      alias: "O",
    });
    const include = getCliOption(args, {
      name: "include",
      alias: "i",
    }).pipe(
      Option.flatMap((_) =>
        ["true", "false"].includes(_) ? Option.some(_) : Option.none()
      ),
      Option.map((_) => _ === "true")
    );

    const url = yield* Option.match(Option.some("http://www.example.com"), {
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

await pipe(
  main,
  Effect.catchTags({
    TextDecodeError: (error) => Console.error("Text decode error: ", error),
    UnknownError: (error) => Console.error("Unknown error: ", error),
  }),
  Effect.provideService(M.Fetch, globalThis.fetch),
  Effect.provide(CliOptionsLive),
  Effect.match({
    onSuccess: () => process.exit(0),
    onFailure: (cause) => {
      console.error(cause);
      process.exit(1);
    },
  }),
  Effect.runPromise
);
