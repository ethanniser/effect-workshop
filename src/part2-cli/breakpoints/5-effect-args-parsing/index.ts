import { Console, Effect, Layer, Option, pipe } from "effect";
import * as M from "./model";
import * as S from "@effect/schema/Schema";
import * as fs from "node:fs/promises";

const StringPairsFromStrings = S.array(S.string).pipe(
  S.filter((arr) => arr.every((s) => s.split(": ").length === 2)),
  S.transform(
    S.array(S.tuple(S.string, S.string)),
    (arr) =>
      arr.map((s) => s.split(": ") as unknown as readonly [string, string]),
    (arr) => arr.map((s) => s.join(": "))
  )
);

function getCliOption(
  cliArgs: string[],
  option: { name: string; alias?: string }
): Option.Option<string> {
  return Option.gen(function* (_) {
    const index = yield* _(
      cliArgs.findIndex(
        (arg) => arg === `--${option.name}` || arg === `-${option.alias}`
      ),
      (_) => (_ === -1 ? Option.none() : Option.some(_))
    );
    const nextIndex = index + 1;
    const value = yield* _(Option.fromNullable(cliArgs[nextIndex]));
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
  return indexes.reduce((acc, index) => {
    acc.push(cliArgs[index + 1]!);
    return acc;
  }, [] as string[]);
}

const CliOptionsLive = Layer.effect(
  M.CLIOptions,
  Effect.gen(function* (_) {
    const args = yield* _(Effect.sync(() => process.argv));

    const method = getCliOption(args, { name: "method", alias: "X" }).pipe(
      Option.getOrElse(() => "GET")
    );

    const data = getCliOption(args, { name: "data", alias: "d" });

    const headers = yield* _(
      getCliOptionMultiple(args, { name: "headers", alias: "H" }),
      S.decode(StringPairsFromStrings),
      Effect.mapError(() => new M.HeaderParseError())
    );

    const output = getCliOption(args, { name: "output", alias: "O" });
    const include = getCliOption(args, { name: "include", alias: "i" }).pipe(
      Option.flatMap((_) =>
        ["true", "false"].includes(_) ? Option.some(_) : Option.none()
      ),
      Option.map((_) => _ === "true")
    );

    const url = yield* _(
      Option.fromNullable(null),
      Effect.mapError(
        () => new M.CliOptionsParseError({ error: "No url provided" })
      )
    );

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

const main = Effect.gen(function* (_) {
  const options = yield* _(M.CLIOptions);

  const providedFetch = yield* _(M.Fetch);

  const body = Option.getOrUndefined(options.data);

  const res = yield* _(
    Effect.tryPromise({
      try: (signal) =>
        providedFetch(options.url, {
          ...(body && { body }),
          method: options.method,
          headers: Object.fromEntries(options.headers),
          signal,
        }),
      catch: (error) => new M.UnknownError({ error }),
    })
  );

  const buffer: string[] = [];

  if (options?.include) {
    buffer.push(`${res.status} ${res.statusText}`);
    res.headers.forEach((value, key) => {
      buffer.push(`${key}: ${value}`);
    });
    // Add an empty line to separate headers from body
    buffer.push("");
  }

  const text = yield* _(
    Effect.tryPromise({
      try: () => res.text(),
      catch: () => new M.TextDecodeError(),
    })
  );
  buffer.push(text);

  const finalString = buffer.join("\n");
  yield* _(
    Effect.match(options.output, {
      onSuccess: (output) =>
        Effect.promise(() => fs.writeFile(output, finalString)),
      onFailure: () => Console.log(finalString),
    })
  );
});

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
