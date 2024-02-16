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

## Running Effects

Effects must be 'run' to do anything.

| **Function**     | **Input**      | **Output**                 |
| ---------------- | -------------- | -------------------------- |
| `runSync`        | `Effect<A, E>` | `A` (throws `E`)           |
| `runPromise`     | `Effect<A, E>` | `Promise<A>` (rejects `E`) |
| `runSyncExit`    | `Effect<A, E>` | `Exit<A, E>`               |
| `runPromiseExit` | `Effect<A, E>` | `Promise<Exit<A, E>>`      |

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

## Composing Effects

## `pipe` and `Effect.gen`

## Handling Errors

## Defining and Using Services

## Scoped Resources

## Repition + Retry

## Effect Datatypes

## Other Modules

- `Schema` for data validation + transformation (like zod)
- `Match` for pattern matching
- `Config` for typed configuration (env variables)
- `Stream` pull based streams (effects that can produce more than one value)
- even more...
