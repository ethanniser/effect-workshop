import { DevTools } from "@effect/experimental";
import { Effect, Layer } from "effect";

const program = Effect.sleep("1 seconds").pipe(Effect.withSpan("hi"));

program.pipe(Effect.provide(DevTools.layer()), Effect.runFork);
