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

type Fetch = {
  readonly _: unique symbol;
};

export const Fetch = Context.Tag<Fetch, typeof globalThis.fetch>("Fetch");

type CLIOptions = {
  readonly _: unique symbol;
};

interface CLIOptionsImpl {
  url: string;
  method: string;
  data: string | undefined;
  headers: string[] | undefined;
  output: string | undefined;
  include: boolean | undefined;
}

export const CLIOptions = Context.Tag<CLIOptions, CLIOptionsImpl>("CLIOptions");

export class CliOptionsParseError extends Data.TaggedError(
  "CliOptionsParseError"
)<{
  readonly error: unknown;
}> {}
