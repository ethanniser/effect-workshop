import { Context, Data, Option } from "effect";

export class UnknownError extends Data.TaggedError("UnknownError")<{
  readonly error: unknown;
}> {}

export class TextDecodeError extends Data.TaggedError("TextDecodeError") {}

export class HeaderParseError extends Data.TaggedError("HeaderParseError") {}

export class CLIOptions extends Context.Tag("CLIOptions")<
  CLIOptions,
  {
    readonly url: string;
    readonly method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    readonly data: Option.Option<string>;
    readonly headers: readonly (readonly [string, string])[];
    readonly output: Option.Option<string>;
    readonly include: Option.Option<boolean>;
  }
>() {}

export class CliOptionsParseError extends Data.TaggedError(
  "CliOptionsParseError"
)<{
  readonly error: unknown;
}> {}
