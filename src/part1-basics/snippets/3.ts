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

type Effect<Value, Error> = /* unimportant */ undefined;

declare const inner: Effect.Effect<"baz" | "bar", Error>;

// outer: Effect<number, Error>
const outer = Effect.gen(function* (_) {
  // result: "baz" | "bar"
  const result = yield* _(inner);
  return result.length;
});

declare const inner2: Effect.Effect<number, 0 | 1>;

// outer: Effect<numbernever, Error | 0 | 1>
const outer2 = Effect.gen(function* (_) {
  // result: "baz" | "bar"
  const result = yield* _(inner);
  const result2 = yield* _(inner2);
  return result.length + result2;
});

// outer: Effect<number, Error | 0 | 1>
const outer3 = Effect.gen(function* (_) {
  // result: "baz" | "bar"
  const result = yield* _(inner);
  const result2 = yield* _(inner2);
  return result.length + result2;
});
// noErrors: Effect<number, never> or Effect<number>
const noErrors = Effect.catchAll(outer, (e) => Effect.succeed(-1));
