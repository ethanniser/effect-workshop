import { declare } from "@effect/schema/Schema";
import { Option } from "effect";

type OptionGenF<A> = () => Generator<Option.Option<A>, A, A>;

function MyOptionGen<A>(generatorF: OptionGenF<A>): Option.Option<A> {
  const generator = generatorF();
  let next = generator.next();
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

// const A: Option.Option<number> = Option.some(1);
// function B(n: number): Option.Option<number> {
//   return Option.some(n + 1);
//   // return Option.none();
// }
// function C(n: number): Option.Option<number> {
//   return Option.some(n + 2);
// }

const result = MyOptionGen(function* () {
  const a = yield A; // 1
  const b = yield B(a); // 2
  const c = yield C(b); // 4
  return c * 2; // 8
} as OptionGenF<number>);

console.log("option", result);

type AsyncAwaitGen<A> = () => Generator<Promise<A>, A, A>;

function MyAsyncAwait<A>(generatorF: AsyncAwaitGen<A>): Promise<A> {
  const generator = generatorF();
  return new Promise((resolve, reject) => {
    const handleNext = (value: A) => {
      const next = generator.next(value);
      if (next.done) {
        resolve(next.value);
      } else {
        next.value.then(handleNext).catch(reject);
      }
    };

    const first = generator.next();
    if (first.done) {
      resolve(first.value);
    } else {
      first.value.then(handleNext).catch(reject);
    }
  });
}

function A(): Promise<number> {
  return Promise.resolve(1);
}

function B(n: number): Promise<number> {
  return Promise.resolve(n + 1);
}

function C(n: number): Promise<number> {
  return Promise.resolve(n + 2);
}

MyAsyncAwait(function* () {
  const a = yield A(); // 1
  const b = yield B(a); // 2
  const c = yield C(b); // 4
  return c * 2; // 8
} as AsyncAwaitGen<number>).then((result) => {
  console.log("async await", result); // 8 !!
});

// const result2 = await MyAsyncAwait(function* () {
//   const a = yield A2(); // 1
//   const b = yield B2(a); // 2
//   const c = yield C2(b); // 4
//   return c * 2; // 8
// } as AsyncAwaitGen<number>);

// console.log("async await", result2); // 8 !!
