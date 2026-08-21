import {
  Cause,
  Chunk,
  Data,
  Duration,
  Effect,
  Equal,
  Exit,
  Hash,
  HashSet,
  Option,
  Result,
  pipe,
} from "effect";

/**
 * Effect has a number of useful datatypes that are commonly used
 * Let's briefly go through them:
 */

/**
 * `Option`
 *
 * Option is a datatype that represents a value that may or may not be present
 * ```ts
 * type Option<A> = Some<A> | None
 * ```
 *
 * It is superior to using `null` or `undefined` because it is much more composable
 */

/**
 * `Option` constructors
 */
const none = Option.none();
const some = Option.some(1);
Option.fromNullOr(null);

/**
 * `Option` common operations:
 */
const opt: Option.Option<number> = Option.some(42);

if (Option.isSome(opt)) {
  opt.value;
}
Option.map(opt, (x) => x + 1);
Option.flatMap(opt, (x) => Option.some(x + 1));
Option.match(opt, {
  onSome: (x) => x + 1,
  onNone: () => 0,
});

/**
 * `Option` destructors:
 */
Option.getOrElse(opt, () => 0);
Option.getOrThrow(opt);
Option.getOrNull(opt);
Option.getOrUndefined(opt);

/**
 * `Result`
 *
 * Very similar to Option is Result:
 * Result is a datatype that represents a value that may be one of two types.
 *
 * Option is really just a Result where the failure type is void
 */

const failure: Result.Result<never, number> = Result.fail(1);
const success: Result.Result<string, never> = Result.succeed("error");

/**
 * `Result` common operations:
 */
const _result: Result.Result<number, string> = Result.succeed(42);
if (Result.isSuccess(_result)) {
  _result.success;
}
if (Result.isFailure(_result)) {
  _result.failure;
}
Result.map(_result, (success: number): number => success + 1);
Result.mapError(_result, (failure: string): number => failure.length);
Result.mapBoth(_result, {
  onSuccess: (x: number): number => x + 1,
  onFailure: (x: string): number => x.length,
});
Result.flatMap(_result, (success: number) => Result.succeed(success + 1));
Result.match(_result, {
  onSuccess: (x) => x + 1,
  onFailure: (x) => x.length,
});

/**
 * You might notice that these operations are very similar to Effect operations...
 * That leads to the questions:
 *
 * > 1. When should you use Option/Result and when should you use Effect?
 * > 2. And how to you convert from one to the other?
 *
 * ---
 *
 * One key distinction is that
 * - `Effect` operations are lazy,
 * - while `Option | Result` operations are eager!
 */
const sideEffect = (x: number) => {
  console.log("side effect!");
  return x + 1;
};

/**
 * Effects are lazy:
 * Nothing has happened yet, the effect has not been run
 */
const effect = pipe(
  Effect.succeed(1),
  Effect.map((x) => sideEffect(x)) // does not log 'side effect!' until run
);

/**
 * `Result | Option` are eager:
 * The side effect has already happened
 */
const resultValue = pipe(
  Result.fail(1),
  Result.mapError((x) => sideEffect(x)) // logs 'side effect!'
);

/**
 * When should you use Option/Result?
 *
 * 1. To Interop with non-effect code:
 * 	Because option/result are purely synchronous, they are great for interoping
 * 	with non-effect code while still preserving the benefits of typed errors and
 * 	composable operations
 *
 * 2. When you just need to represent DATA:
 * 	- Effects represent computations
 * 	- Option/Result represent data: if you have a value that is either present or not, or is one of two types.
 */

/**
 * even if It's for things that are not side effects, or don't require any services
 */
declare function doLogicThatMightFail1(): Result.Result<string, Error>;

/**
 * if this can be an effect, make it an effect
 */
declare function doLogicThatMightFail2(): Effect.Effect<string, Error>;

/**
 * How do you convert from one to the other?
 *
 * In effect v4, `Option` and `Result` are both `Yieldable`,
 * meaning they can be used with `yield*` inside generators
 *
 * To convert them into an Effect value, use the constructors on `Effect`:
 *
 * `Option<T>` -> `Effect<T, NoSuchElementException>`
 * `Result<E, A>` -> `Effect<A, E>`
 */

const result = pipe(
  Effect.fromOption(Option.some(5)),
  Effect.flatMap((x) => Effect.succeed(x.toString()))
);

/**
 * Next is `Exit`, which is basically a `Result<A, Cause<E>>`
 * It is used to represent the result of a computation
 */

const program = Effect.runSyncExit(Effect.succeed(1));

Exit.match(program, {
  onFailure: (cause) => console.error(`Exited with failure state: ${cause}`),
  onSuccess: (value) => console.log(`Exited with success value: ${value}`),
});

/**
 * What is a `Cause`?
 * In v4 it is a flat collection of all the possible ways a computation can complete
 *
 * A `Cause` wraps an array of `Reason`s, and its variations are:
 * - `Fail` => (expected error),
 * - `Die` => (unexpected error),
 * - `Interrupt`
 */

const cause: Cause.Cause<number> = Cause.fail(42);
for (const reason of cause.reasons) {
  switch (reason._tag) {
    case "Fail": {
      const error: number = reason.error;
      break;
    }
    case "Die": {
      const defect: unknown = reason.defect;
      break;
    }
    case "Interrupt": {
      break;
    }
  }
}

/**
 * Duration is a datatype that represents a time duration
 */

/**
 * Duration constructors:
 */
Duration.millis(1000);
Duration.seconds(1);
Duration.minutes(1);
Duration.zero;
Duration.infinity;
Duration.fromInputUnsafe("7 hours");

/**
 * Duration destructors
 */
Duration.toMillis(Duration.millis(1000));
Duration.toSeconds(Duration.seconds(1));

/**
 * Duration operations
 */
Duration.isLessThan(Duration.millis(1000), Duration.seconds(1));
Duration.isGreaterThan(Duration.millis(1000), Duration.seconds(1));
Duration.sum(Duration.millis(1000), Duration.seconds(1));
Duration.times(Duration.millis(1000), 4);

/**
 * Effect also has a number of data structures
 * They are all functional and immutable
 *
 * - HashMap,
 * - HashSet,
 * - RedBlackTree,
 * - and more...
 *
 * But the most common your likely to see is `Chunk`.
 * `Chunks` are ordered collections of elements, often backed by an array,
 * but are immutable, functional, and fast due to structural sharing
 */

const c1 = Chunk.make(1, 2, 3);
const c2 = Chunk.fromIterable([1, 2, 3]);
const c3 = Chunk.append(c1, c2);
const c4 = Chunk.drop(c3, 2);
Chunk.toReadonlyArray(c4);

/**
 * Finally 'Traits'.
 *
 *
 * Effect has two 'traits', `Equal` and `Hash`.
 * They are used to compare two values with `Equals.equals` and hash a value with `Hash.hash`.
 * All values have a default implementation, but you can provide your own for custom types.
 * This is commonly used for checking deep equality of data structures and for
 * using values as keys in a Map or Set.
 *
 * Note: in effect v4 `Equal.equals` uses structural equality by default!
 */

const s1 = new Set<Chunk.Chunk<number>>();
s1.add(Chunk.make(1, 2, 3));
s1.add(Chunk.make(1, 2, 3));
console.log("s1", s1.size); // 2 because native Sets compare by reference

let s2 = HashSet.empty<Chunk.Chunk<number>>();
s2 = HashSet.add(s2, Chunk.make(1, 2, 3));
s2 = HashSet.add(s2, Chunk.make(1, 2, 3));
console.log("s2", HashSet.size(s2)); // 1 because of structural equality

console.log(Equal.equals({ a: 1 }, { a: 1 })); // true in v4! plain objects compare structurally

/**
 * To 'implement' a trait you just provide a function with the 'equals' or 'hash' symbol
 * very similar to how you make a type iterable
 */

class Foo1 {
  public readonly x: number;

  constructor(x: number) {
    this.x = x;
  }
}

class Foo2 implements Equal.Equal, Hash.Hash {
  readonly x: number;

  constructor(x: number) {
    this.x = x;
  }

  [Equal.symbol](that: unknown): boolean {
    return that instanceof Foo2 && that.x === this.x;
  }

  [Hash.symbol](): number {
    return Hash.number(this.x);
  }
}

let s3 = HashSet.empty<Foo1 | Foo2>();
s3 = HashSet.add(s3, new Foo1(1));
s3 = HashSet.add(s3, new Foo1(1));
s3 = HashSet.add(s3, new Foo2(1));
s3 = HashSet.add(s3, new Foo2(1));
console.log("s3", HashSet.size(s3)); // 2! in v4 even plain class instances compare structurally
console.log(Equal.equals(new Foo1(1), new Foo1(1))); // true in v4 (structural by default)
console.log(Equal.equals(new Foo2(1), new Foo2(1))); // true (custom Equal implementation)

/**
 * The Data module contains a number of functions that implement deep equality
 * and hashing for custom types for you.
 *
 * Since plain objects are compared structurally by default in v4,
 * Data is mostly useful for classes now:
 */
interface Foo3 {
  readonly a: number;
  readonly b: string;
}

// plain objects already have structural equality in v4
const f3a: Foo3 = { a: 1, b: "a" };
const f3b: Foo3 = { a: 1, b: "a" };
console.log(Equal.equals(f3a, f3b)); // true

/**
 * or in one step with classes
 */
class Foo4 extends Data.Class<{ readonly a: number; readonly b: string }> {}
const f4 = new Foo4({ a: 1, b: "a" });

class TaggedFoo4 extends Data.TaggedClass("Foo4")<{
  readonly a: number;
  readonly b: string;
}> {}
const tf4 = new TaggedFoo4({ a: 1, b: "a" });

/**
 * custom behavior at the same time:
 */
class Foo5 extends Data.TaggedClass("Foo5")<{
  readonly a: number;
  readonly b: string;
}> {
  get c(): number {
    return this.a + this.b.length;
  }

  ab(): string {
    return String(this.a) + this.b;
  }
}
const f5 = new Foo5({ a: 1, b: "a" });
console.log(f5.c); // 2
console.log(f5.ab()); // "1a"

/**
 * helper for creating tagged union of case classes
 */
type AppState = Data.TaggedEnum<{
  Startup: Record<never, never>;
  Loading: {
    readonly status: string;
  };
  Ready: {
    readonly data: number;
  };
}>;

const { Startup, Loading, Ready } = Data.taggedEnum<AppState>();

const state1 = Startup();
const state2 = Loading({ status: "loading" });
const state3 = Ready({ data: 42 });
const state4 = Loading({ status: "loading" });

console.log(Equal.equals(state2, state4)); // true
console.log(Equal.equals(state2, state3)); // false

// pretend this came from somewhere else (so the tag isn't statically known)
const makeState = (s: AppState): AppState => s;
const state = makeState(Loading({ status: "loading" }));
switch (state._tag) {
  case "Startup":
    break;
  case "Loading":
    console.log(state.status);
    break;
  case "Ready":
    console.log(state.data);
    break;
}

/**
 * Finally, for creating custom error types there is
 * - `Data.Error` and
 * - `Data.TaggedError`
 */
class FooError extends Data.Error<{ readonly a: number; readonly b: string }> {}
class TaggedFooError extends Data.TaggedError("FooError")<{
  readonly a: number;
  readonly b: string;
}> {}

/**
 * These have the additional benefit of being subtypes of Effect, so you don't
 * have to wrap them in `Effect.fail`.
 */
const errors = Effect.gen(function* () {
  return yield* new FooError({ a: 1, b: "a" });
});
