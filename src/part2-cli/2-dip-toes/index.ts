import { Console, Effect, Option } from "effect";
import meow from "meow";

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

try {
  Effect.runPromise(main(arg, cli.flags));
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  process.exit(0);
}

interface CLIOptions {
  method: string;
  data: string | undefined;
  headers: string[] | undefined;
  output: string | undefined;
  include: boolean | undefined;
}

function main(url: string, options?: CLIOptions) {
  return Effect.gen(function* (_) {
    const headers = options?.headers?.reduce((acc, header) => {
      const [key, value] = header.split(":");
      if (!key || !value) {
        throw new Error("Invalid header");
      }
      acc.push([key, value]);
      return acc;
    }, new Array<[string, string]>());

    const res = yield* _(
      Effect.tryPromise((signal) =>
        fetch(url, {
          ...(options?.method && { method: options.method }),
          ...(options?.data && { body: options.data }),
          ...(headers && { headers }),
          signal,
        })
      )
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

    const text = yield* _(Effect.tryPromise(() => res.text()));
    buffer.push(text);

    const finalString = buffer.join("\n");
    yield* _(
      Effect.match(Option.fromNullable(options?.output), {
        onSuccess: (output) =>
          Effect.sync(() => Bun.write(output, finalString)),
        onFailure: () => Console.log(finalString),
      })
    );
  });
}
