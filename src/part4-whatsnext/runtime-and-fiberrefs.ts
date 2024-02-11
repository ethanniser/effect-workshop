import { Effect, Runtime } from "effect";
// A `Runtime<R>` can run effects of type `Runnable extends Effect<any, any, R>`.
// The runtime is whats responible for
// executing effects, spawning fibers, handling unexpected errors, yielding and scheduling fibers,
// ensuring all finalizers are run, and handling all async operations.

// All effects up to now have been executed with the default runtime, `Runtime.defaultRuntime`.
// Effect.runSync is actually equivalent to
const runSync = Runtime.runSync(Runtime.defaultRuntime);

// We can customize how our programs executed by modifying the runtime.
// There are a couple levels of modification available to us.
