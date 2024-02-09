import * as S from "@effect/schema/Schema";
import { Options } from "@effect/cli";

const StringPairsFromStrings = S.array(S.string).pipe(
  S.filter((arr) => arr.every((s) => s.split(": ").length === 2)),
  S.transform(
    S.array(S.tuple(S.string, S.string)),
    (arr) =>
      arr.map((s) => s.split(": ") as unknown as readonly [string, string]),
    (arr) => arr.map((s) => s.join(": "))
  )
);

const headersOption = Options.text("header").pipe(
  Options.repeated,
  Options.map((_) => _ as ReadonlyArray<string>),
  Options.withSchema(StringPairsFromStrings)
);

declare const mutable: string[];
const test: readonly string[] = mutable; // ok
declare const mutableSchema: S.Schema<string[]>;
// const testSchema: S.Schema<readonly string[], string[]> = mutableSchema; // errors?
