import meow from "meow";
import * as fs from "node:fs/promises";

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
      --timeout, -t The timeout for the request (in milliseconds)
      --retry, -r The number of times to retry the request
      --gap, -g The time to wait between retries (in milliseconds)
      --backoffFactor, -b The factor to use for exponential backoff
      --backoffMax, -B The maximum number of seconds to wait between requests
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
      timeout: {
        type: "number",
        shortFlag: "t",
        isRequired: false,
      },
      retry: {
        type: "number",
        shortFlag: "r",
        isRequired: false,
      },
      gap: {
        type: "number",
        shortFlag: "g",
        isRequired: false,
      },
      backoffFactor: {
        type: "number",
        shortFlag: "b",
        isRequired: false,
      },
      backoffMax: {
        type: "number",
        shortFlag: "B",
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
  await main(arg, cli.flags);
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
  timeout: number | undefined;
  retry: number | undefined;
  gap: number | undefined;
  backoffFactor: number | undefined;
  backoffMax: number | undefined;
}

async function runRequest(
  url: string,
  options: {
    method?: string;
    data?: string | undefined;
    headers?: string[][] | undefined;
    timeout?: number | undefined;
  }
) {
  const abortController = new AbortController();

  let timeout: NodeJS.Timeout | undefined = undefined;

  if (options?.timeout) {
    timeout = setTimeout(() => abortController.abort(), options.timeout);
  }

  const res = await fetch(url, {
    ...(options?.method && { method: options.method }),
    ...(options?.data && { body: options.data }),
    ...(options?.headers && { headers: options.headers }),
    signal: abortController.signal,
  }).finally(() => {
    if (timeout) {
      clearTimeout(timeout);
    }
  });

  return res;
}

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(url: string, options?: CLIOptions) {
  const headers = options?.headers?.reduce((acc, header) => {
    const [key, value] = header.split(":");
    if (!key || !value) {
      throw new Error("Invalid header");
    }
    acc.push([key, value]);
    return acc;
  }, new Array<[string, string]>());

  //   const res = await runRequest(url, { ...options, headers });
  let res: Response | undefined = undefined;

  for (let i = 0; i < (options?.retry ?? 1); i++) {
    try {
      res = await runRequest(url, { ...options, headers });
      break;
    } catch (e) {
      if (i === (options?.retry ?? 1) - 1) {
        throw e;
      }
    }
    if (options?.gap) {
      const time = options?.backoffFactor ? options.gap * 2 ** i : options.gap;
      if (options?.backoffMax && time > options.backoffMax) {
        break;
      }
      await wait(time);
    }
  }

  if (!res) {
    throw new Error("No response");
  }

  const buffer: string[] = [];

  if (options?.include) {
    buffer.push(`${res.status} ${res.statusText}`);
    res.headers.forEach((value, key) => {
      buffer.push(`${key}: ${value}`);
    });
    // Add an empty line to separate headers from body
    buffer.push("");
  }

  const text = await res.text();
  buffer.push(text);

  const finalString = buffer.join("\n");
  if (options?.output) {
    await fs.writeFile(options.output, finalString);
  } else {
    console.log(finalString);
  }
}
