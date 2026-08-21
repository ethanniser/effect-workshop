import { Context, Effect, Layer } from "effect";
import * as T from "../../testDriver.ts";

class Foo extends Context.Service<Foo, { readonly bar: string }>()("Foo") {
  static readonly Live = Layer.succeed(Foo, { bar: "imFromContext!" });
}

/**
 * # Exercise 1:
 *
 * `Service` being yieldable is a bit too easy...
 * try to get the `Foo` service from context manually :)
 */

const test1 = Effect.gen(function* () {
  const foo = { bar: "hint: look at Effect.context" };
  return foo.bar;
}).pipe(Effect.provide(Foo.Live));

await T.testRunAssert(1, test1, { success: "imFromContext!" });

/**
 * # Exercise 2
 */
class Random extends Context.Service<
  Random,
  {
    readonly nextInt: Effect.Effect<number>;
    readonly nextBool: Effect.Effect<boolean>;
    readonly nextIntBetween: (
      min: number,
      max: number
    ) => Effect.Effect<number>;
  }
>()("Random") {
  static readonly Mock = Layer.succeed(Random, {
    nextInt: Effect.succeed(42),
    nextBool: Effect.succeed(true),
    nextIntBetween: (min, max) => Effect.succeed(min + max),
  });
}

/**
 * Having to get the service, just to use a single property or function is a bit annoying
 * For convenience lets create Effects (or functions that return Effects) themselves already depend on the service
 */

declare const nextInt: Effect.Effect<number, never, Random>;
declare const nextBool: Effect.Effect<boolean, never, Random>;
declare const nextIntBetween: (
  min: number,
  max: number
) => Effect.Effect<number, never, Random>;

const test2 = Effect.gen(function* () {
  const int = yield* nextInt;
  const bool = yield* nextBool;
  const intBetween = yield* nextIntBetween(10, 20);
  return { int, bool, intBetween };
}).pipe(Effect.provide(Random.Mock));

await T.testRunAssert(2, test2, {
  success: { int: 42, bool: true, intBetween: 30 },
});
