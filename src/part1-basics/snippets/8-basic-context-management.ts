import * as fs from "node:fs/promises";
import { Context, Effect, Layer, pipe } from "effect";
import type { Success } from "effect/Effect";

/**
 * An Effect's third type parameter represents the 'services' it requires before it can be run
 * Only an Effect that requires no services (i.e. `Effect<_, _, never>`) can be run
 *
 *
 * Services are some kind of functionality that an effect requires to run.
 * They are defined by their type signature
 * When we 'use' a service in an effect, we do so INDEPENDENTLY of the service's implementation
 * Then we can 'provide' the service to 'resolve' that dependency and run the effect
 */

/**
 * 1. Defining a service type:
 * to start, we'll define the type signature of a service
 */
interface RandomImpl {
  readonly next: Effect.Effect<number>;
  readonly nextIntBetween: (min: number, max: number) => Effect.Effect<number>;
}

/**
 * 2. Creating a Service class for the service:
 * Then we'll create a `Context.Service` for the service.
 *
 * A `Service` is a unique placeholder for a service.
 *
 * We can use the `Service` class as if it were the service itself in our effects
 * and effect will take care of resolving it to the actual service at runtime
 */

class Random extends Context.Service<Random, RandomImpl>()("Random") {}

/**
 * to use the service, we work with it as if it was a Effect<RandoImpl>, in this case just 'yielding' it
 *
 *  notice how Random now appears in the third type parameter `Effect.Effect<'Low' | 'High', never, Random>`
 */
const program: Effect.Effect<"Low" | "High", never, Random> = Effect.gen(
  function* () {
    const random = yield* Random;
    const n = yield* random.nextIntBetween(1, 10);
    return n < 5 //
      ? ("Low" as const)
      : ("High" as const);
  }
);

/** If we try to run it right now, we'll get a type error */
// Effect.runSync(program);

/**
 * To resolve the dependency, we need to provide the service
 * the name `_Live` is commonly used to describe the 'live' implementation of a service
 * i.e. the actual implementation of the service that is used at runtime
 * also common is `_Test` to describe a test implementation of a service
 */

const RandomLive: RandomImpl = {
  next: Effect.sync(() => Math.random()),
  nextIntBetween: (min, max) =>
    Effect.sync(() => Math.floor(Math.random() * (max - min + 1) + min)),
};

// runnable: Effect<'low' | 'high', never, never>
const runnable = program.pipe(Effect.provideService(Random, RandomLive));

/**
 * now we can run the effect
 */
console.log(Effect.runSync(runnable));

/**
 * However, not all services are so simple;
 *
 * Some may require other services to be provided, or their construction may be effectful (or error)
 * In these cases effect has the `Layer<ROut, E, RIn>` type to help us manage these dependencies
 */

class FeatureFlags extends Context.Service<
  FeatureFlags,
  {
    readonly isEnabled: (flag: string) => Effect.Effect<boolean>;
  }
>()("FeatureFlags") {}

class ConfigFile extends Context.Service<
  ConfigFile,
  {
    readonly contents: Record<string, boolean>;
  }
>()("ConfigFile") {}

/**
 * To create a layer from an effect, we use the `Layer.effect` function
 * think of this like the opposite of `flatMap`.
 * Instead of running after an effect, this effect is run prior to the effect
 * notice how we can use other services just like normal, but they appear in the RIn type parameter
 */

// FeatureFlagsLive: Layer<FeatureFlags, never, ConfigFile>
const FeatureFlagsLive = Layer.effect(
  FeatureFlags,
  pipe(
    ConfigFile,
    Effect.map((config) => ({
      isEnabled: (flag: string) =>
        Effect.sync(() => config.contents[flag] ?? false),
    }))
  )
);

// ConfigFileLive: Layer<ConfigFile, Error>
const ConfigFileLive = Layer.effect(
  ConfigFile,
  Effect.gen(function* () {
    const contents = yield* Effect.tryPromise({
      try: () => fs.readFile("config.json", "utf-8"),
      catch: (e) => new Error("Could not read config file"),
    });
    const parsed = yield* Effect.try({
      try: () => JSON.parse(contents),
      catch: (e) => new Error("Could not parse config file"),
    });

    return {
      contents: parsed,
    };
  })
);

const main = Effect.gen(function* () {
  const flags = yield* FeatureFlags;
  return (yield* flags.isEnabled("feature")) ? "enabled" : "disabled";
});

/**
 * We can provide layers to an effect using the `Effect.provide` function
 * notice how this errors because we haven't provided the ConfigFile layer to the FeatureFlags layer
 */
// const runnable2 = main.pipe(Effect.provide(FeatureFlagsLive));

// finalLayer: Layer<FeatureFlags, Error, never>
const finalLayer = Layer.provide(FeatureFlagsLive, ConfigFileLive);

/**
 * now we can provide to main and run it
 */
pipe(main, Effect.provide(finalLayer), Effect.runPromise);

/**
 * Final note:
 */
class Foo extends Context.Service<Foo, { readonly foo: string }>()("Foo") {
  /**
   * Something convenient you can do with classes is defining a static property with a layer implementation
   */
  static readonly Live = Layer.effect(
    Foo,
    Effect.succeed({
      foo: "foo",
    })
  );
}

{
  const program = Effect.gen(function* () {
    const foo = yield* Foo;
    return foo.foo;
  });

  const runnable = program.pipe(Effect.provide(Foo.Live));
}

/**
 * Also another common pattern:
 */
const makeService = Effect.succeed({ foo: "foo" });
class Foo2 extends Context.Service<
  Foo2,
  /**
   * inferring the type of the service from the function that creates it
   */
  Success<typeof makeService>
>()("Foo") {
  static readonly Live = Layer.effect(Foo2, makeService);
}
