import { Context, Data } from "effect";

// export type FetchError = Data.TaggedEnum<{
//   UnknownError: {
//     error: unknown;
//   };
//   TextDecodeError: {};
// }>;

// export const { UnknownError, TextDecodeError } = Data.taggedEnum<FetchError>();
// export type FetchError = UnknownError | TextDecodeError;

export class UnknownError extends Data.TaggedError("UnknownError")<{
  readonly error: unknown;
}> {}

export class TextDecodeError extends Data.TaggedError("TextDecodeError") {}

export class HeaderParseError extends Data.TaggedError("HeaderParseError") {}

export class Fetch extends Context.Tag("Fetch")<
  Fetch,
  typeof globalThis.fetch
>() {}

// export const CLIOptions = Context.Tag<CLIOptions, CLIOptionsImpl>("CLIOptions");
export class CLIOptions extends Context.Tag("CLIOptions")<
  CLIOptions,
  {
    readonly url: string;
    readonly method: string;
    readonly data: string | undefined;
    readonly headers: string[] | undefined;
    readonly output: string | undefined;
    readonly include: boolean | undefined;
  }
>() {}

export class CliOptionsParseError extends Data.TaggedError(
  "CliOptionsParseError"
)<{
  readonly error: unknown;
}> {}
