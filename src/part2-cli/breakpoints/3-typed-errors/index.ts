import { Console, Effect, Exit, pipe } from "effect";
import meow from "meow";
import * as M from "./model";

const cli = meow(
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
const arg = cli.input[0];
if (!arg) {
  console.error("No url provided");
  process.exit(1);
}

const exit = await pipe(
  main(arg, cli.flags),
  Effect.catchTags({
    TextDecodeError: (error) => Console.error("Text decode error: ", error),
    UnknownError: (error) => Console.error("Unknown error: ", error),
  }),
  Effect.runPromiseExit
);

Exit.match(exit, {
  onSuccess: () => process.exit(0),
  onFailure: (cause) => {
    console.error(cause);
    process.exit(1);
  },
});

interface CLIOptions {
  method: string;
  data: string | undefined;
  headers: string[] | undefined;
  output: string | undefined;
  include: boolean | undefined;
}

function main(url: string, options?: CLIOptions) {
  return Effect.gen(function* (_) {
    const headerMap = options?.headers?.reduce((acc, header) => {
      const [key, value] = header.split(":");
      if (!key || !value) {
        throw new Error("Invalid header");
      }
      acc.set(key, value);
      return acc;
    }, new Map<string, string>());

    const res = yield* _(
      Effect.tryPromise({
        try: (signal) =>
          fetch(url, {
            ...(options?.method && { method: options.method }),
            ...(options?.data && { body: options.data }),
            ...(headerMap && { headers: Array.from(headerMap.entries()) }),
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
}
