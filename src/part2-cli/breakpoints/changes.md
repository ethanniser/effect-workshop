## 1 -> 2 - Dipping our toes in

- `main` now returns an `Effect`
- `fetch` and `res.text()` wrapped in `yield* _(Effect.tryPromise(…))`
- final console log / file write moved to Effect
- `main` passed to `Effect.runPromise` to 'run' it

## 2 -> 3 - Adding typed Errors

- create `model.ts` file
- defined `HeaderParseError`, `TextDecodeError` and `UnknownError` classes
- move `Effect.tryPromise` calls to the `{ try: ..., catch: ...}` overload using the new error types
- handle errors with `Effect.catchTags`
- use `Effect.runPromiseExit` and `Exit.match` to replace try/catch/finally block
- use `Effect.reduce` to properly yield a `HeaderParseError` in headers parsing

## 3 -> 4 - Explit typed dependencies

- define `Fetch` type and tag in model
- use `providedFetch` instead of global `fetch`
- provide `fetch` to `main` using `Effect.provideService`
- define `CliOptions` type and tag, and `CliOptionsParseError` class in model
- use provided `CliOptions` instead of function arg
- create `CliOptionsLive` using `Layer.effect`, erroring with `CliOptionsParseError` on invalid input
- provide `CliOptions` to `main` using `Effect.provide`
- use `Effect.match` to move final `process.exit` calls into effect

## 4 -> 5 - Parse cli args in effect

- parse cli args from effect instead of `meow`
- use `Schema.transform` to split header strings

## 5 -> 6 - Adding @effect/platform

- use @effect/platform for http + fs
- use `match` to create request
- replace self built process.exit with runMain

## 6 -> 7 - Utilizing @effect/cli

- use @effect/cli for args processing
- refactor req builder now that have proper schema for method type
- show help and wizard

## 7 -> 8 Scheduling without Effect

- start with basic interruption using `AbortController` + `setTimeout` + `clearTimeout`
- move on to retrying with for loop and try/catch
- then add simple spaced repetition
- finally, add exponential backoff

## 8 -> 9 Scheduling in Effect

- start with basic interruption using `Effect.timeout`
- timeoutOption has config backed default
- nested config
- `Effect.retry` / `Effect.repeat`
- basic schedules
