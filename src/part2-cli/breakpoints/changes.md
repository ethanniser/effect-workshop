# What changes between each 'stage'?

## 1 -> 2 - Dipping our toes in

- `main` now returns an `Effect`
- `fetch` and `res.text()` wrapped in `yield* _(Effect.tryPromise(…))`
- `main` passed to `Effect.runPromise` to 'run' it

### 2 -> 3 - Adding typed Errors

- create `model.ts` file
- defined `HeaderParseError`, `TextDecodeError` and `UnknownError` classes
- move `Effect.tryPromise` calls to the `{ try: ..., catch: ...}` overload using the new error types
- handle errors with `Effect.catchTags`
- use `Effect.runPromiseExit` and `Exit.match` to replace try/catch/finally block
- use `Effect.reduce` to properly yield a `HeaderParseError` in headers parsing

### 3 -> 4 - Explit typed dependencies

- define `Fetch` type and tag in model
- use `providedFetch` instead of global `fetch`
- provide `fetch` to `main` using `Effect.provideService`
- define `CliOptions` type and tag, and `CliOptionsParseError` class in model
- use provided `CliOptions` instead of function arg
- create `CliOptionsLive` using `Layer.effect`, erroring with `CliOptionsParseError` on invalid input
- provide `CliOptions` to `main` using `Effect.provide`
- use `Effect.match` to move final `process.exit` calls into effect

### 4 -> 5 - Parse cli args in effect

-

- parse cli args in effect

- use effect/platform for http?

- use effect/cli for args processing (`Command.provideSync`)
