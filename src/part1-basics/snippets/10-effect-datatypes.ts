import { Console, Effect, Either, Option, pipe } from "effect";

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

// laziness is something we want to preserve when we can, so we should use Effect when we can
// even if its for things that are not side effects, or dont require any services
declare function doLogicThatMightFail1(): Either.Either<string, Error>;
// if this can be an effect, make it an effect
declare function doLogicThatMightFail2(): Effect.Effect<string, Error>;

// so when should you use Option/Either?
// 1. Interop with non-effect code- because option/either are purely synchronous
// they are great for interoping with non-effect code while still preserving the benfits of
// typed errors and composable operations
// 2. As the value of an effect-
