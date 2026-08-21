import {
  Cause,
  Context,
  Effect,
  Exit,
  Fiber,
  Layer,
  ManagedRuntime,
  References,
  pipe,
} from "effect";

/**
 * In effect v4 the `Runtime<R>` type is gone.
 * Run functions live directly on `Effect`, and services are passed as a `Context`.
 *
 * The runtime is still whats responsible for
 * - executing effects,
 * - spawning fibers,
 * - handling unexpected errors,
 * - yielding
 * - and scheduling fibers,
 * - ensuring all finalizers are run,
 * - and handling all async operations.
 *
 * All effects up to now have been executed with the default runtime.
 * Effect.runSync is actually equivalent to `<A, E>(effect: Effect.Effect<A, E, never>) => A`
 */

/**
 * Q: What replaces a `Runtime`?
 *
 * We can think of it as a black box that takes in a starting `Context<R>` and `Effect<A, E, R>` as input
 * and produces an `Exit<A, E>` as output.
 *
 * To run an effect with some services, extract the context with `Effect.context`
 * inside a provided scope, then use the `*With(services)` variants of the run functions.
 */

// But are running multiple effects separately, that all require the same services
// The most common example of this is integrating effect with non-effect code
// consider this example

class Database extends Context.Service<
  Database,
  { getUserById: (id: number) => Effect.Effect<string, Error> }
>()("Database") {
  static readonly Live = Layer.effect(
    Database,
    Effect.acquireRelease(
      Effect.sync(() => {
        console.log("creating database");

        return { getUserById: (id: number) => Effect.succeed(`user ${id}`) };
      }),
      () =>
        Effect.sync(() => {
          console.log("closing database");
        })
    )
  );
}

const handlerEffect = (id: number): Effect.Effect<string, Error, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;
    return yield* db.getUserById(id);
  });

const handler = async (req: Request): Promise<Response> => {
  const searchParams = new URL(req.url).searchParams;

  const id = Number(searchParams.get("id"));

  const exit: Exit.Exit<string, Error> = await Effect.runPromiseExit(
    handlerEffect(id).pipe(
      Effect.provide(Database.Live) // here we provide the database service that gets created and closed for every handler call... expensive!
    )
  );

  return Exit.match(exit, {
    onSuccess: (user) => new Response(user),
    onFailure: (error) => new Response(Cause.pretty(error), { status: 500 }),
  });
};

/**
 * As it is currently implemented, our database is getting constructed every time we run the handler!
 * The v4 fix is to build the context once (via a Layer) and reuse it.
 *
 * If the service is not effectful to create (i.e. you don't need a Layer),
 * we can simply build the Context directly and run effects with `runPromiseExitWith`
 */

const customContext = Context.make(Database, {
  getUserById: (id: number) => Effect.succeed(`user ${id}`),
});

void Effect.runPromiseExitWith(customContext)(handlerEffect(1)); // look ma, no provide!

/**
 * For more complex services, we can use layers to create the context.
 * `ManagedRuntime` builds one from a Layer, keeps the layer alive for you,
 * and exposes the same run functions - perfect for non-Effect entrypoints.
 */

const runtime = ManagedRuntime.make(Database.Live);

await runtime.runPromise(handlerEffect(1));

/**
 * When we're done with the managed runtime, we should dispose it so finalizers run
 */
await runtime.dispose();

/**
 * Next up are `Context.Reference`s (formerly known as `FiberRef`s).
 *
 * A reference is a value that is local to a single fiber (like a thread-local variable)
 * They are useful for storing contextual state, with a sensible default value.
 *
 * Consider many things we have encountered so far:
 * concurrency level, log level, context - these all live in references
 * tracing is also a great example: the current span is stored in a reference.
 *
 * Many built-in references are exported from the `References` module,
 * like `References.MinimumLogLevel`.
 *
 * Q: how do they actually work?
 *
 * A reference is really just an identifier with a default value.
 * By default, reading a reference yields the default value.
 * Each fiber has its own map of references to values.
 * When we modify a reference (with `Effect.provideService` or `updateService`),
 * we are only modifying the value for the current fiber (and its children).
 */

{
  const annotation = Context.Reference<string | null>("annotation", {
    defaultValue: () => null,
  });

  const program = Effect.gen(function* () {
    const log = (message: string): Effect.Effect<void, never, never> =>
      Effect.gen(function* () {
        const currentAnnotation: string | null = yield* annotation;
        console.log(`${currentAnnotation ?? ""} - ${message}`);
      });

    const fiber1: Fiber.Fiber<void, never> = yield* pipe(
      log("hello from fiber1").pipe(Effect.provideService(annotation, "fiber1")),
      Effect.forkChild
    );

    const fiber2: Fiber.Fiber<void, never> = yield* pipe(
      log("hello from fiber2").pipe(Effect.provideService(annotation, "fiber2")),
      Effect.forkChild
    );

    yield* Fiber.joinAll([fiber1, fiber2]);

    const mainFiberFinalAnnotation: string | null = yield* annotation;

    console.log(`final annotation: ${mainFiberFinalAnnotation}`);
  }).pipe(Effect.scoped);

  void Effect.runPromise(program);
}

/**
 * Notice how the annotation is different for each fiber,
 * and the main fiber does NOT see the values set by its children.
 *
 * In v3 FiberRefs had well defined `fork` and `join` semantics where joined
 * fibers could merge values back into their parent. In v4 references are
 * simply inherited: setting a reference via `provideService` scopes that value
 * to the provided effect and its forked children only.
 *
 * ___
 *
 * Finally, if you want to read ALL services available to the current fiber,
 * you can use `Effect.context`, and modify them with `Effect.updateContext`.
 */

const readContext = Effect.gen(function* () {
  const context = yield* Effect.context<Database>();
  const db = Context.get(context, Database);
  return yield* db.getUserById(42);
});
