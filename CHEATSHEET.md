# Effect Cheatsheet

## Importing Modules

### Named Imports

```ts
import { Effect } from "effect";
```

### Namespaced Imports

```ts
import * as Effect from "effect/Effect";
```

Namespaced imports may be required to achieve maximum tree shaking depending on your bundler.

## The Effect Type

```ts
type Effect<Success, Error, Requirements> = (
  context: Context<Requirements>
) => Error | Success;
```

An `Effect` is a immutable value which describes some program that may require some dependecies. When the `Effect` has been provided its dependecies and is run, it will execute the program and complete with either a sucess or a failure.

## Creating Effects

| **Function**            | **Input**                          | **Output**                    |
| ----------------------- | ---------------------------------- | ----------------------------- |
| `succeed`               | `A`                                | `Effect<A>`                   |
| `fail`                  | `E`                                | `Effect<never, E>`            |
| `sync`                  | `() => A`                          | `Effect<A>`                   |
| `try`                   | `() => A`                          | `Effect<A, UnknownException>` |
| `try` (overload)        | `() => A`, `unknown => E`          | `Effect<A, E>`                |
| `promise`               | `() => Promise<A>`                 | `Effect<A>`                   |
| `tryPromise`            | `() => Promise<A>`                 | `Effect<A, UnknownException>` |
| `tryPromise` (overload) | `() => Promise<A>`, `unknown => E` | `Effect<A, E>`                |
| `async`                 | `(Effect<A, E> => void) => void`   | `Effect<A, E>`                |
| `suspend`               | `() => Effect<A, E, R>`            | `Effect<A, E, R>`             |

NOTE: `sync` and `promise` are for functions that will **NEVER** throw/reject. If they do, it will be considered a 'defect' (similar to a panic).

## Running Effects

Effects must be 'run' to do anything.
Effects should only be run **at the edges of your program**, when you must interact with the outside world or non-effect code. If you want to 'unwrap' the value from inside an effect without running it there are many combinators to do that.

| **Function**     | **Input**      | **Output**                 |
| ---------------- | -------------- | -------------------------- |
| `runSync`        | `Effect<A, E>` | `A` (throws `E`)           |
| `runPromise`     | `Effect<A, E>` | `Promise<A>` (rejects `E`) |
| `runSyncExit`    | `Effect<A, E>` | `Exit<A, E>`               |
| `runPromiseExit` | `Effect<A, E>` | `Promise<Exit<A, E>>`      |

## Composing Effects

Combinators allow you to create new `Effect`s that operate on the reuslt of a previous `Effect` without 'running' it.

| **Function** | **Input**                                 | **Output**                  |
| ------------ | ----------------------------------------- | --------------------------- |
| `map`        | `Effect<A, E, R>`, `A => B`               | `Effect<B, E, R>`           |
| `flatMap`    | `Effect<A, E, R>`, `A => Effect<B, E, R>` | `Effect<B, E, R>`           |
| `tap`        | `Effect<A, E, R>`, `A => Effect<B, E, R>` | `Effect<A, E, R>`           |
| `all`        | `[Effect<A, E, R>, Effect<B, E, R>, ...]` | `Effect<[A, B, ...], E, R>` |

## `pipe` and `Effect.gen`

### Without Pipe

```ts
Effect.tap(
  Effect.flatMap(Effect.succeed(5), (x) =>
    x === 0 ? Effect.fail("nope") : Effect.succeed(10 / x)
  ),
  (result) => Effect.sync(() => console.log(result))
);
```

### With Pipe

```ts
pipe(
  Effect.succeed(5),
  Effect.flatMap((x) =>
    x === 0 ? Effect.fail("nope") : Effect.succeed(10 / x)
  ),
  Effect.tap((result) => Effect.sync(() => console.log(result)))
);
```

### Pipe Method

```ts
Effect.succeed(5).pipe(
  Effect.flatMap((x) =>
    x === 0 ? Effect.fail("nope") : Effect.succeed(10 / x)
  ),
  Effect.tap((result) => Effect.sync(() => console.log(result)))
);
```

### With `Effect.gen`

`Effect.gen` is an alternate way to compose `Effect`s that is similar to async/await. Just map `Promise` -> `Effect` and `await` to `yield* _()`
Inside generators you can easily bind results to variables and use if statements and for/while loops

```ts
Effect.gen(function* (_) {
  const x = yield* _(Effect.succeed(5));
  if (x === 0) {
    yield* _(Effect.fail("nope"));
  } else {
    console.log(10 / x);
  }
});
```

## Handling Errors

### Short Circuiting

`Effect`s 'short-circuit' on error, meaning they cease all execution and propogate the error until it is handled

### Expected vs Unexpected Errors

- Expected Errors: Expected and tracked on a type level (replacement for 'throwing')
- Unexpected Errors: Unexpected and **not** tracked on a type level (similar to a panic) - can be created with `die`/`dieMessage`

### Handling Expected Errors

| **Function**  | **Input**                                                            | **Output**                                 | **Description**                       |
| ------------- | -------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------- |
| `catchAll`    | `Effect<A, E1, R>`, `E1 => Effect<B, E2, R>`                         | `Effect<A \| B, E2, R>`                    | Recovering from all errors            |
| `catchTag`    | `Effect<A, E, R>`, `string`, `TaggedError => Effect<B, E2, R>`       | `Effect<A \| B, Exclude<E, tag> \| E2, R>` | Recovering from specific tagged error |
| `catchAll`    | `Effect<A, E1, R>`, `E1 => Option<Effect<B, E2, R>>`                 | `Effect<A \| B, E1 \| E2, R>`              | Recovering from some errors           |
| `either`      | `Effect<A, E, R>`                                                    | `Effect<Either<A, E>, never, R>`           | Move error into success 'channel'     |
| `match`       | `Effect<A, E, R>`, `A => B`, `E => C`                                | `Effect<B \| C, never, R>`                 | Handle both cases at once             |
| `matchEffect` | `Effect<A, E1, R>`, `A => Effect<B, E2, R>`, `E1 => Effect<C, E3, R>` | `Effect<B \| C, E2 \| E3, R>`              | Handle both cases with `Effect`s      |

## Defining and Using Services

### Defining a service

```ts
class Foo extends Context.Tag("Foo")<Foo, { bar: string }>() {}
```

### Using a service

```ts
// main: Effect<void, never, Foo>
const main = Effect.gen(function* (_) {
  const foo = yield* _(Foo);
  console.log(foo.bar);
});
```

### Providing a service

```ts
Effect.runSync(main); // type error! "Foo not provided"
Effect.runSync(Effect.provideService(main, Foo, { bar: "Hello World!" })); // logs: Hello World!
```

## Service dependencies

### Service that requires other services

```ts
class Bar extends Context.Tag("Bar")<Bar, { baz: number }>() {
  // Live: Layer<Bar, never, Foo>
  static Live = Layer.effect(
    Foo.pipe(Effect.map((foo) => ({ baz: foo.bar.length })))
  );
}
```

### Provide Service Requirements

```ts
mainLive = Layer.provide(Bar.Live, Layer.succeed(Foo, { bar: "Hello World!" }));
pipe(main, Effect.provide(mainLive), Effect.runSync);
```

## Scoped Resources

A `Scope` defines a collection of 'finalizer' functions.
A `Effect` that required a `Scope` service means it has finalizers that currently have a undefined time to run.
Providing the `Scope` service with `Effect.scoped` = defining where the finalizers will run.

```ts
declare const file: Effect<File, never, Scope>;
const main = file.pipe(
  Effect.flatMap((file) => Effect.sync(() => console.log(file.contents)))
);
Effect.runPromise(main); // Type Error! Missing 'Scope' service
Effect.runPromise(Effect.scoped(main)); // logs: contents \n file closed!
```

| **Function**   | **Input**                                | **Output**                 | **Description**                                    |
| -------------- | ---------------------------------------- | -------------------------- | -------------------------------------------------- |
| `scoped`       | `Effect<A, E, R \| Scope>`               | `Effect<A, E, R>`          | Defines where the current `Scope` should be closed |
| `addFinalizer` | `Effect<A, E, R>`, `(exit) => Effect<_>` | `Effect<A, E, R \| Scope>` | Add a 'finalizer' to the current `Effect`          |

## Repitition + Retry

A `Schedule` defines a scheduled pattern for executing effects. There are many constructors + combinators, so check out the docs.

| **Function** | **Input**                     | **Output**        | **Description**                                                        |
| ------------ | ----------------------------- | ----------------- | ---------------------------------------------------------------------- |
| `repeat`     | `Effect<A, E, R>`, `Schedule` | `Effect<A, E, R>` | Repeats the `Effect` on success by the pattern defined by the schedule |
| `retry`      | `Effect<A, E, R>`, `Schedule` | `Effect<A, E, R>` | Retrys the `Effect` on failure by the pattern defined by the schedule  |

## "Traits"

Effect defines two 'traits', `Hash` and `Equal`. They are implemented similar to `iterator`s.

```ts
class Foo {
  constructor(public n: number) {}

  [Hash.symbol](): number {
    return Hash.number(this.n);
  }

  [Equal.symbol](that: unknown): boolean {
    return that instanceof Foo && that.n === this.n;
  }
}
new Foo(1) === new Foo(1); // false
Equal.equals(new Foo(1), new Foo(1)); // true
```

## Effect Datatypes

| **Data Type**                  | **Description**                                                                         |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| `Option<T>`                    | Describes a union between `Some<T>` and `None`                                          |
| `Either<A, E>`                 | Describes a union between `Right<A>` and `Left<E>`                                      |
| `Exit<A, E>`                   | Describes a union between `A` and `Cause<E>`                                            |
| `Cause<E>`                     | Describes a union of the ways a program might fail with error `E`                       |
| `Chunk<A>`                     | A lazy, immutable, functional, array-like data structure                                |
| `HashSet<A>` / `HashMap<K, V>` | Functional and immutable, uses custom `Hash` and `Equal` implementations when available |

## Other Useful Things

`Console` module: Effect version of standard `console`
...

## Other Modules

- `Schema` for data validation + transformation (like zod)
- `Match` for pattern matching
- `Config` for typed configuration (env variables)
- `Stream` pull based streams (effects that can produce more than one value)
- even more...
