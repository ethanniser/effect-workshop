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
    },
  }
);
const arg = cli.input[0];
if (!arg) {
  throw new Error("No url provided");
}
await main(arg, cli.flags);

interface CLIOptions {
  method: string;
  body?: string | undefined;
  headers?: string[] | undefined;
  output?: string | undefined;
}

async function main(url: string, options?: CLIOptions) {
  const headerMap = options?.headers?.reduce((acc, header) => {
    const [key, value] = header.split(":");
    if (!key || !value) {
      throw new Error("Invalid header");
    }
    acc.set(key, value);
    return acc;
  }, new Map<string, string>());

  const res = await fetch(url, {
    ...(options?.method && { method: options.method }),
    ...(options?.body && { body: options.body }),
    ...(headerMap && { headers: Array.from(headerMap.entries()) }),
  });

  console.log(`STATUS: ${res.status} ${res.statusText}`);
  res.headers.forEach((value, key) => {
    console.log(`HEADER: ${key}=${value}`);
  });

  const text = await res.text();
  if (options?.output) {
    Bun.write(options.output, text);
    console.log(`BODY SUCCESSFULLY WRITTEN TO ${options.output}`);
  } else {
    console.log(`BODY: ${text}`);
  }
}
