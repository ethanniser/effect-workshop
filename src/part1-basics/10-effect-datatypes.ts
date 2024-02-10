import {
  Cause,
  Chunk,
  Console,
  Data,
  Duration,
  Effect,
  Either,
  Equal,
  Exit,
  Hash,
  HashSet,
  Option,
  pipe,
} from "effect";
import type { FiberId } from "effect/FiberId";

// Effect has a number of useful datatypes that are commonly used
// Lets briefly go through them

// First is Option
// Option is a datatype that represents a value that may or may not be present
// type Option<A> = Some<A> | None
// It is superior to using null or undefined because it is much more composable

// constructors
const none = Option.none();
const some = Option.some(1);
Option.fromNullable(null);

// Common operations
declare const opt: Option.Option<number>;

if (Option.isSome(opt)) {
  opt.value;
}
Option.map(opt, (x) => x + 1);
Option.flatMap(opt, (x) => Option.some(x + 1));
Option.match(opt, {
  onSome: (x) => x + 1,
  onNone: () => 0,
});

// destructors
Option.getOrElse(opt, () => 0);
Option.getOrThrow(opt);
Option.getOrNull(opt);
Option.getOrUndefined(opt);

// very similar to Option is Either
// Either is a datatype that represents a value that may be one of two types
// Options are really just Either's where the left type is void

const left = Either.left(1);
const right = Either.right("error");

// Common operations
declare const e: Either.Either<number, string>;
if (Either.isRight(e)) {
  e.right;
}
if (Either.isLeft(e)) {
  e.left;
}
Either.map(e, (x) => x.length);
Either.mapLeft(e, (x) => x + 1);
Either.mapBoth(e, {
  onLeft: (x) => x + 1,
  onRight: (x) => x.length,
});
Either.flatMap(e, (x) => Either.right(x + 1));
Either.match(e, {
  onRight: (x) => x + 1,
  onLeft: (x) => x + 1,
});

// You might notice that these operations are very similar to Effect operations
// That leads to the question, when should you use Option/Either and when should you use Effect?
// and how to you convert from one to the other?

// The key distinction is that while Effect's are lazy, Option/Either are eager
const sideEffect = (x: number) => {
  console.log("side effect!");
  return x + 1;
};

const effect = pipe(
  Effect.succeed(1),
  Effect.map((x) => sideEffect(x))
);
// nothing has happened yet, the effect has not been run

const either = pipe(
  Either.left(1),
  Either.mapLeft((x) => sideEffect(x))
);
// the side effect has already happened

// so when should you use Option/Either?
// 1. Interop with non-effect code- because option/either are purely synchronous
// they are great for interoping with non-effect code while still preserving the benfits of
// typed errors and composable operations
// 2. As DATA- if you have a value that is either present or not, or is one of two types
// Effects represent computations, Option/Either represent data- so use them as such

// even if its for things that are not side effects, or dont require any services
declare function doLogicThatMightFail1(): Either.Either<string, Error>;
// if this can be an effect, make it an effect
declare function doLogicThatMightFail2(): Effect.Effect<string, Error>;

// How do you convert from one to the other?

// Option and Either are convieniently both subtypes of Effect, meaning they can be used interchangeably in any Effect context

// Option<T> -> Effect<T, NoSuchElementException>
// Either<E, A> -> Effect<A, E>

const result = pipe(
  Option.some(5),
  Effect.flatMap((x) => Either.right(x.toString()))
);

// Next is Exit, which is basically a Either<A, Cause<E>>
// It is used to represent the result of a computation

const program = Effect.runSyncExit(Effect.succeed(1));

Exit.match(program, {
  onFailure: (cause) =>
    console.error(`Exited with failure state: ${cause._tag}`),
  onSuccess: (value) => console.log(`Exited with success value: ${value}`),
});

// what is a Cause?
// It is a discriminated union of all the possible ways a computation can complete
// Its variations are:
// Empty (no error),
// Fail (expected error),
// Die (unexpected error),
// Interrupt
// Sequential (multiple causes that happened in sequence)
// Parallel (multiple causes that happened in parallel)

declare const cause: Cause.Cause<number>;
Cause.match(cause, {
  onEmpty: undefined,
  onFail: function (error: number): unknown {
    throw new Error("Function not implemented.");
  },
  onDie: function (defect: unknown): unknown {
    throw new Error("Function not implemented.");
  },
  onInterrupt: function (fiberId: FiberId): unknown {
    throw new Error("Function not implemented.");
  },
  onSequential: function (left: unknown, right: unknown): unknown {
    throw new Error("Function not implemented.");
  },
  onParallel: function (left: unknown, right: unknown): unknown {
    throw new Error("Function not implemented.");
  },
});

// Duration is a datatype that represents a time duration

// constructors
Duration.millis(1000);
Duration.seconds(1);
Duration.minutes(1);
Duration.zero;
Duration.infinity;
Duration.decode("7 hours");

// destructors
Duration.toMillis(Duration.millis(1000));
Duration.toSeconds(Duration.seconds(1));

// operations

Duration.lessThan(Duration.millis(1000), Duration.seconds(1));
Duration.greaterThan(Duration.millis(1000), Duration.seconds(1));
Duration.sum(Duration.millis(1000), Duration.seconds(1));
Duration.times(Duration.millis(1000), 4);

// Effect also has a number of data structures
// They are all functional and immutable

// List: a linked list, HashMap, HashSet, RedBlackTree, and more

// but the most common your likely to see is `Chunk`
// Chunks are ordered collections of elements, often backed by an array
// but are immutable, functional, and fast due to structural sharing

const c1 = Chunk.make(1, 2, 3);
const c2 = Chunk.fromIterable([1, 2, 3]);
const c3 = Chunk.append(c1, c2);
const c4 = Chunk.drop(c3, 2);
Chunk.toReadonlyArray(c4);

// finally 'Traits'
// Effect has two 'traits', Equal and Hash
// They are used to compare two values with `Equals.equals` and hash a value with `Hash.hash`
// All values have a default implementation, but you can provide your own for custom types
// This is commonly used for checking deep equality of data structures
// and for using values as keys in a Map or Set

const s1 = new Set<Chunk.Chunk<number>>();
s1.add(Chunk.make(1, 2, 3));
s1.add(Chunk.make(1, 2, 3));
console.log("s1", s1.size); // 2 because of referentially equality

let s2 = HashSet.empty<Chunk.Chunk<number>>();
s2 = HashSet.add(s2, Chunk.make(1, 2, 3));
s2 = HashSet.add(s2, Chunk.make(1, 2, 3));
console.log("s2", HashSet.size(s2)); // 1 because of structural equality

// to 'implement' a trait you just provide a function with the 'equals' or 'hash' symbol
// very similar to how you make a type iterable

class Foo1 {
  constructor(readonly x: number) {}
}

class Foo2 implements Equal.Equal, Hash.Hash {
  constructor(readonly x: number) {}
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
console.log("s3", HashSet.size(s3)); // 3 because Foo2 are considered equal
console.log(Equal.equals(new Foo1(1), new Foo1(1))); // false
console.log(Equal.equals(new Foo2(1), new Foo2(1))); // true

// The Data module contains a number of functions that implement deep equality and hashing for custom types for you

interface Foo3 {
  readonly a: number;
  readonly b: string;
}

const Foo3 = Data.case<Foo3>();
const f3 = Foo3({ a: 1, b: "a" });

interface TaggedFoo3 {
  readonly _tag: "Foo3";
  readonly a: number;
  readonly b: string;
}

const TaggedFoo3 = Data.tagged<TaggedFoo3>("Foo3");
const tf3 = TaggedFoo3({ a: 1, b: "a" });

// or in one step with classes

class Foo4 extends Data.Class<{ readonly a: number; readonly b: string }> {}
const f4 = new Foo4({ a: 1, b: "a" });

class TaggedFoo4 extends Data.TaggedClass("Foo4")<{
  readonly a: number;
  readonly b: string;
}> {}
const tf4 = new TaggedFoo4({ a: 1, b: "a" });

// custom behavior at the same time:
class Foo5 extends Data.TaggedClass("Foo5")<{
  readonly a: number;
  readonly b: string;
}> {
  get c() {
    return this.a + this.b.length;
  }

  ab() {
    return String(this.a) + this.b;
  }
}
const f5 = new Foo5({ a: 1, b: "a" });
console.log(f5.c); // 2
console.log(f5.ab()); // "1a"

// helper for creating tagged union of case classes

type AppState = Data.TaggedEnum<{
  Startup: {};
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

declare const state: AppState;
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

// finally for creating custom error types there is Data.Error and Data.TaggedError

class FooError extends Data.Error<{ readonly a: number; readonly b: string }> {}
class TaggedFooError extends Data.TaggedError("FooError")<{
  readonly a: number;
  readonly b: string;
}> {}

// these have the additonal benefit of being subtypes of Effect, so you dont have to wrap them in `Effect.fail`

const errors = Effect.gen(function* (_) {
  yield* _(new FooError({ a: 1, b: "a" }));
});
