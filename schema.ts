import * as S from "@effect/schema/Schema";
import { HashMap } from "effect";

const HashMapSchema: S.Schema<
  HashMap.HashMap<string, string>,
  HashMap.HashMap<string, string>
> = S.unknown as any;
/// What value should this be? S.declare

const StringPairsFromStrings = S.array(S.string).pipe(
  S.filter((arr) => arr.every((s) => s.split(": ").length === 2)),
  S.transform(
    S.array(S.tuple(S.string, S.string)),
    (arr) =>
      arr.map((s) => s.split(": ") as unknown as readonly [string, string]),
    (arr) => arr.map((s) => s.join(": "))
  )
);

const HashMapFromStringPairs = S.transform(
  S.array(S.tuple(S.string, S.string)),
  HashMapSchema,
  (t) => HashMap.fromIterable(t),
  (h) => HashMap.toEntries(h)
);

const fullSchema = S.compose(StringPairsFromStrings, HashMapFromStringPairs);

const testInput = [
  "Content-Type: application/json",
  "Content-Length: 42",
] as const;

const parseResult = S.parseSync(fullSchema)(testInput);
const encodeResult = S.encodeSync(fullSchema)(parseResult);

console.log(parseResult);
console.log(encodeResult);
