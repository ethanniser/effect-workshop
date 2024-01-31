# What changes between each 'stage'?

## 1 -> 2 - Dipping our toes in

- `main` now returns an `Effect`
- `fetch` and `res.text()` wrapped in `yield* _(Effect.tryPromise(…))`
- `main` passed to `Effect.runPromise` to 'run' it

### 2 -> 3 - Adding typed Errors

- create `model.ts` file
- defined `UnknownError` and `TextDecodeError` classes
- move `Effect.tryPromise` calls to the `{ try: ..., catch: ...}` overload using the new error types
- handle errors with `Effect.catchTags`
- use `Effect.runPromiseExit` and `Exit.match` to replace try/catch/finally block

### 3 -> 4 - Explit typed dependencies

- define `Fetch` type and tag in model
- use `providedFetch` instead of global `fetch`
- provide `fetch` to `main` using `Effect.provideService`
- define `CliOptions` type and tag, and `CliOptionsParseError` class in model
- use provided `CliOptions` instead of function arg
- create `CliOptionsLive` using `Layer.effect`, erroring with `CliOptionsParseError` on invalid input
- provide `CliOptions` to `main` using `Effect.provide`
- use `Effect.match` to move final `process.exit` calls into effect

- parse cli args in effect

- use effect/platform for http?

- use effectc/cli for args processing
