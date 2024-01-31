import { Data } from "effect";

// export type FetchError = Data.TaggedEnum<{
//   UnknownError: {
//     error: unknown;
//   };
//   TextDecodeError: {};
// }>;

// export const { UnknownError, TextDecodeError } = Data.taggedEnum<FetchError>();
export type FetchError = UnknownError | TextDecodeError;

export class UnknownError extends Data.TaggedError("UnknownError")<{
  readonly error: unknown;
}> {}

export class TextDecodeError extends Data.TaggedError("TextDecodeError") {}
