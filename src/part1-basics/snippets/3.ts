import { Effect } from "effect";

type Function<Args extends any[], T> = (...args: Args) => T;
type SaferFunction<Args extends any[], T, E> = (...args: Args) => T | E;

// discriminating types must be done manually

declare function Foo(): "baz" | "bar" | Error;
const result = Foo();
const error = result instanceof Error;

declare function Foo2(): "baz" | "bar";
const result2 = Foo2();
const error2 = result2 !== "baz";

// composing functions that error is not straightforward
// can't just code the 'happy path' and then handle the error later

declare function Inner(): "baz" | "bar" | Error;

function Outer(): number | Error {
  const result = Inner();
  if (result instanceof Error) {
    return result;
  }
  return result.length;
}

// effects are different

type Effect<_, Error, Value> = /* unimportant */ undefined;

declare const inner: Effect.Effect<never, Error, "baz" | "bar">;

// outer: Effect<never, Error, number>
const outer = Effect.gen(function* (_) {
  // result: "baz" | "bar"
  const result = yield* _(inner);
  return result.length;
});

declare const inner2: Effect.Effect<never, 0 | 1, number>;

// outer: Effect<never, Error | 0 | 1, number>
const outer2 = Effect.gen(function* (_) {
  // result: "baz" | "bar"
  const result = yield* _(inner);
  const result2 = yield* _(inner2);
  return result.length + result2;
});

// outer: Effect<never, Error | 0 | 1, number>
const outer3 = Effect.gen(function* (_) {
  // result: "baz" | "bar"
  const result = yield* _(inner);
  const result2 = yield* _(inner2);
  return result.length + result2;
});
// noErrors: Effect<never, never, number>
const noErrors = Effect.catchAll(outer, (e) => Effect.succeed(-1));
