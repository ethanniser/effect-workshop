import { Console, Effect, Result, pipe } from "effect";

/**
 * Errors are inevitable in any program, and we need to be able to handle them.
 * Effect provides a new level of safety when it comes to error handling
 * Errors are tracked on a type level, and automatically propagate through the program
 *
 * To look at how we can work with and handle errors, let's look at a simple example
 */

class FooError {
  readonly _tag = "FooError";
}

class BarError {
  readonly _tag = "BarError";
}

const conditions = [true, true, true] as [boolean, boolean, boolean];

const errors = Effect.gen(function* () {
  if (conditions[0]) {
    return yield* Effect.fail(new FooError());
  } else if (conditions[1]) {
    return yield* Effect.fail(new BarError());
  } else if (conditions[2]) {
    return yield* Effect.die("Boom");
  }
  return "Success";
});

// errors: Effect<string, FooError | BarError>

/**
 * Whats `Effect.die`? It's similar to a panic in rust or go
 * In effect there are **excepted errors**, and **unexpected errors**:
 * - **expected errors** are errors that are expected to happen, and are tracked in the type system
 * - **unexpected errors** are errors that are not expected to happen, and are not tracked in the type system.
 *
 * There are methods to handle unexpected errors, but for now we will focus on expected errors
 * assume that when you trigger an unexpected error, your program is in an invalid state, and should be terminated
 *
 *
 * Also worth mentioning now is that effect, in its lazy nature, short circuits on the first error
 * so if you have multiple errors, by default from that point on, the program will not continue unless you handle the error
 */

const program = Effect.gen(function* () {
  yield* Console.log("1");
  return yield* Effect.fail(new Error("Boom"));
  // yield* Console.log("2"); // this will not run
});

/**
 * with that established, lets look at how we can handle errors
 *
 * first `catch` (formerly known as `catchAll`)
 */

const handled1 = errors.pipe(
  Effect.catch((e) => Effect.succeed(`Handled ${e._tag}`))
);

/**
 * `catch` takes a function that takes the error (whose type is whatever the effect can fail with)
 * and returns a new effect, either succeeding with a value or failing with a new error.
 *
 * However, most of the time, we want to handle errors of a specific type
 * this is where the `_tag` comes in, its a common pattern in effect to use a discriminated union
 * this allows us to discriminate types both in the type system, and at runtime
 */

/** notice how the `BarError` is still present in the error type, as we have not handled it */
const handled2: Effect.Effect<string, BarError, never> = errors.pipe(
  Effect.catchTag("FooError", (e) => Effect.succeed("Handled Foo"))
);

/** to handle multiple tagged errors at the same time we can use `catchTags` */
const handled3: Effect.Effect<string, never, never> = errors.pipe(
  Effect.catchTags({
    FooError: (e) => Effect.succeed("Handled Foo"),
    BarError: (e) => Effect.succeed("Handled Bar"),
  })
);

/**
 * here's some more combinatiors for handling errors:
 */

/**
 * `Effect.catch` ignores nothing, it always hands you the error,
 * but you can simply ignore it in the handler
 */
const handled4 = errors.pipe(Effect.catch(() => Effect.succeed("Handled")));

/**
 * `mapError` maps any error to a new already specified error
 */
const handle5 = errors.pipe(Effect.mapError(() => new Error("fail")));

/**
 * `mapError` maps an error to a new error
 */
const handle6 = errors.pipe(
  Effect.mapError((oldErr) => new Error(`error: ${oldErr}`))
);

/**
 * `match` handles both cases
 */
const handle7 = errors.pipe(
  Effect.match({
    onSuccess: (x) => `success: ${x}`,
    onFailure: (e) => `handled error: ${e}`,
  })
);

/**
 * `matchEffect` is similar to `match`, but takes effects
 */
const handle8 = errors.pipe(
  Effect.matchEffect({
    onSuccess: (x) => Effect.succeed(`success: ${x}`),
    onFailure: (e) => Effect.succeed(`handled error: ${e}`),
    // obviously these could also fail
  })
);

/**
 * `firstSuccessOf` takes a list of effects, and returns the first one that succeeds
 * if all fail, it returns the last error
 */
const handle9 = Effect.firstSuccessOf([
  Effect.fail(new Error("fail")),
  Effect.succeed("success"),
]);

/**
 * Theres also retrying, for repeating an effect until it succeeds
 * timeouts, for setting a time limit on an effect
 * accumulating errors instead of short circuiting
 * and more, we might get to some later, but for now, this is a good start
 * basically every possible error handling strategy you can think of, effect has it.
 *
 * So far all of these combinators have been used in a pipe style
 * how do we handle errors in a generator context?
 *
 * One option is just not to handle them, and let them propagate
 * in this case your generator basically represents only the 'happy', error free path
 * you can use `.pipe` and the combinators to handle errors after the generator
 */

const handledGen1 = Effect.gen(function* () {
  const r = yield* Effect.sync(() => Math.random());
  if (r > 0.5) {
    return yield* Effect.fail(new Error("fail"));
  }
  return r * 2;
}).pipe(Effect.catch((e) => Effect.succeed(-1)));

/**
 * another option is doing error handling in the adapter pipe
 */
const mightFail = Effect.sync(() => Math.random()).pipe(
  Effect.flatMap((r) =>
    r > 0.5 ? Effect.fail(new Error("fail")) : Effect.succeed(r)
  )
);

const handledGen2 = Effect.gen(function* () {
  const r = yield* pipe(
    mightFail,
    Effect.catch(() => Effect.succeed(-1))
  );
  return r * 2;
});

/**
 * But if you want to get back your error as a value to work with in your generator, just like you would with a success value
 * you can use `Effect.result`.
 * `Result` is a simple disjointed union type, that can represent either
 * - a `failure` or
 * - a `success` value
 *
 * `Effect.result` will return a `Failure` if the effect failed, and a `Success` if the effect succeeded:
 * you can then pattern match on the result, and handle the error
 */

const handledGen3 = Effect.gen(function* () {
  const result = yield* Effect.result(mightFail);
  if (Result.isSuccess(result)) {
    return result.success * 2;
  } else {
    console.error(result.failure.message);
    return -1;
  }
});
