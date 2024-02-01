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
  readonly url: string;
  readonly method: string;
  readonly data: string | undefined;
  readonly headers: string[] | undefined;
  readonly output: string | undefined;
  readonly include: boolean | undefined;
}

export const CLIOptions = Context.Tag<CLIOptions, CLIOptionsImpl>("CLIOptions");

export class CliOptionsParseError extends Data.TaggedError(
  "CliOptionsParseError"
)<{
  readonly error: unknown;
}> {}
