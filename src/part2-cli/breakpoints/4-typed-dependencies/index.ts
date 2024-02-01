import { Console, Effect, Layer, Option, pipe } from "effect";
import meow from "meow";
import * as M from "./model";

const parseCliOptions = () =>
  meow(
    `
	Usage
	  $ bend [...options] <url>

	Options
	  --method, -X  The HTTP method to use
      --header, -H  The HTTP headers to use
      --data,   -d  The data to send
      --output, -o  The output file
      --include, -i Include the HTTP headers in the output
`,
    {
      importMeta: import.meta,
      flags: {
        method: {
          type: "string",
          shortFlag: "X",
          default: "GET",
          isRequired: false,
        },
        headers: {
          type: "string",
          shortFlag: "H",
          isMultiple: true,
          isRequired: false,
        },
        data: {
          type: "string",
          shortFlag: "d",
          isRequired: false,
        },
        output: {
          type: "string",
          shortFlag: "o",
          isRequired: false,
        },
        include: {
          type: "boolean",
          shortFlag: "i",
          isRequired: false,
        },
      },
    }
  );

const CliOptionsLive = Layer.effect(
  M.CLIOptions,
  Effect.gen(function* (_) {
    const cli = yield* _(
      Effect.try({
        try: () => parseCliOptions(),
        catch: (error) => new M.CliOptionsParseError({ error }),
      })
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
  yield* _(
    Effect.match(Option.fromNullable(options.output), {
      onSuccess: (output) => Effect.sync(() => Bun.write(output, finalString)),
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
