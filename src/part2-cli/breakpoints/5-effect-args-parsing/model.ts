import { Context, Data } from "effect";
import * as S from "@effect/schema/Schema";

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

const CliOptionsSchema = S.struct({
  url: S.string,
  method: S.string,
  data: S.optional(S.string),
  headers: S.optional(S.array(S.string)),
  output: S.optional(S.string),
  include: S.optional(S.boolean),
});

interface CLIOptionsImpl extends S.Schema.To<typeof CliOptionsSchema> {}

export const CLIOptions = Context.Tag<CLIOptions, CLIOptionsImpl>("CLIOptions");

export class CliOptionsParseError extends Data.TaggedError(
  "CliOptionsParseError"
)<{
  readonly error: unknown;
}> {}
