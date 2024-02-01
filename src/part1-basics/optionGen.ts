import { declare } from "@effect/schema/Schema";
import { Option } from "effect";

type OptionGenF<A> = () => Generator<Option.Option<A>, A, A>;

function MyOptionGen<A>(generatorF: OptionGenF<A>): Option.Option<A> {
  const generator = generatorF();
  let next: IteratorResult<Option.Option<A>, A> = generator.next();
  while (true) {
    if (next.done) {
      return Option.some(next.value);
    } else {
      if (Option.isSome(next.value)) {
        next = generator.next(next.value.value);
      } else {
        return Option.none();
      }
    }
  }
}

const A: Option.Option<number> = Option.some(1);
function B(n: number): Option.Option<number> {
  //   return Option.some(n + 1);
  return Option.none();
}
function C(n: number): Option.Option<number> {
  return Option.some(n + 2);
}

const result = MyOptionGen(function* () {
  const a = yield A;
  const b = yield B(a);
  const c = yield C(b);
  return c;
} as OptionGenF<number>);

console.log(result);
