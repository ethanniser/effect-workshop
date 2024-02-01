import { Console, Effect, Layer, Option, pipe } from "effect";
import meow from "meow";
import * as M from "./model";

//

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

const CliOptionsLive = Layer.effect(
  M.CLIOptions,
  Effect.gen(function* (_) {
    const args = yield* _(Effect.sync(() => process.argv.slice(2)));

    const method = getCliOption(args, { name: "method" }).pipe(
      Option.getOrElse(() => "GET")
    );
    const data = getCliOption(args, { name: "data" });
    const headers = getCliOption(args, { name: "headers" });
    const output = getCliOption(args, { name: "output" });
    const include = getCliOption(args, { name: "include" }).pipe(
      Option.getOrElse(() => true)
    );

    const arg = yield* _(
      Option.fromNullable(cli.input[0]),
      Effect.mapError(
        () => new M.CliOptionsParseError({ error: "No url provided" })
      )
    );

    return {
      url: arg,
      ...cli.flags,
    };
  })
);

const main = Effect.gen(function* (_) {
  const options = yield* _(M.CLIOptions);

  const headers = options?.headers
    ? yield* _(
        Effect.reduce(
          options.headers,
          new Array<[string, string]>(),
          (acc, header) => {
            const [key, value] = header.split(":");
            if (!key || !value) {
              return Effect.fail(new M.HeaderParseError());
            }
            acc.push([key, value]);
            return Effect.succeed(acc);
          }
        )
      )
    : [];

  const providedFetch = yield* _(M.Fetch);

  const res = yield* _(
    Effect.tryPromise({
      try: (signal) =>
        providedFetch(options.url, {
          ...(options?.method && { method: options.method }),
          ...(options?.data && { body: options.data }),
          headers,
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
  if (options?.output) {
    Bun.write(options.output, finalString);
  } else {
    console.log(finalString);
  }
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
