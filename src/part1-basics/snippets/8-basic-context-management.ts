import { Effect, Context, Console, Layer, pipe } from "effect";

// An Effect's third type parameter reperesents the 'services' it requires before it can be run
// Only an Effect that requires no services (i.e. `Effect<_, _, never>`) can be run

// Services are some kind of functionality that an effect requires to run
// They are defined by their type signature
// When we 'use' a servive in an effect, we do so INDEPENDENTLY of the service's implementation
// Then we can 'provide' the service to 'resolve' that dependency and run the effect

// to start we'll define the type signature of a service
interface RandomImpl {
  readonly next: Effect.Effect<number>;
  readonly nextIntBetween: (min: number, max: number) => Effect.Effect<number>;
}

// then we'll create a `Tag` for the service
// a `Tag` is a unqiue placeholder for a service
// we can use the `Tag` as if it were the service itself in our effects
// and effect will take care of resolving the `Tag` to the actual service at runtime

class Random extends Context.Tag("Random")<Random, RandomImpl>() {}

// to use the tag, we work with it as if it was a Effect<RandoImpl>, in this case just 'yielding' it

// program: Effect<'low' | 'high', never, Random> - notice how Random now appears in the third type parameter
const program = Effect.gen(function* (_) {
  const random = yield* _(Random);
  const n = yield* _(random.nextIntBetween(1, 10));
  if (n < 5) {
    return "Low";
  } else {
    return "High";
  }
});

// if we try to run it right now, we'll get a type error
// Effect.runSync(program);

// to resolve the dependency, we need to provide the service
// the name "_Live" is commonly used to describe the 'live' implementation of a service
// i.e. the actual implementation of the service that is used at runtime
// also common is "_Test" to describe a test implementation of a service

const RandomLive: RandomImpl = {
  next: Effect.sync(() => Math.random()),
  nextIntBetween: (min, max) =>
    Effect.sync(() => Math.floor(Math.random() * (max - min + 1) + min)),
};

// runnable: Effect<'low' | 'high', never, never>
const runnable = program.pipe(Effect.provideService(Random, RandomLive));

// now we can run the effect
console.log(Effect.runSync(runnable));

// However, not all services are so simple
// Some may require other services to be provided, or their construction may be effectful (or error)
// In these cases effect has the `Layer<ROut, E, RIn>` type to help us manage these dependencies

class FeatureFlags extends Context.Tag("FeatureFlag")<
  FeatureFlags,
  {
    readonly isEnabled: (flag: string) => Effect.Effect<boolean>;
  }
>() {}

class ConfigFile extends Context.Tag("ConfigFile")<
  ConfigFile,
  {
    readonly contents: Record<string, boolean>;
  }
>() {}

// to create a layer from an effect, we use the `Layer.effect` function
// think of this like the opposite of `flatMap`
// instead of running after an effect, this effect is run prior to the effect
// notice how we can use other tags just like normal, but they appear in the RIn type parameter

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
  Effect.gen(function* (_) {
    const contents = yield* _(
      Effect.tryPromise({
        try: () => Bun.file("config.json").text(),
        catch: (e) => new Error("Could not read config file"),
      })
    );
    const parsed = yield* _(
      Effect.try({
        try: () => JSON.parse(contents),
        catch: (e) => new Error("Could not parse config file"),
      })
    );

    return {
      contents: parsed,
    };
  })
);

declare const main: Effect.Effect<string, never, FeatureFlags>;

// we can provide layers to an effect using the `Effect.provide` function
// notice how this errors because we havent provided the ConfigFile layer to the FeatureFlags layer
// const runnable2 = main.pipe(Effect.provide(FeatureFlags, FeatureFlagsLive));

// finalLayer: Layer<FeatureFlags, Error, never>
const finalLayer = Layer.provide(FeatureFlagsLive, ConfigFileLive);

// now we can provide to main and run it

pipe(main, Effect.provide(finalLayer), Effect.runPromise);

// final note, something convient you can do with classes is define a static property with a layer implementation

class Foo extends Context.Tag("Foo")<Foo, { readonly foo: string }>() {
  static readonly live = Layer.effect(
    Foo,
    Effect.succeed({
      foo: "foo",
    })
  );
}

{
  const program = Effect.gen(function* (_) {
    const foo = yield* _(Foo);
    return foo.foo;
  });

  const runnable = program.pipe(Effect.provide(Foo.live));
}

// also another common pattern in inferring the type of a service from the function that creates it

const makeService = Effect.succeed({ foo: "foo" });
class Foo2 extends Context.Tag("Foo")<
  Foo2,
  Effect.Effect.Success<typeof makeService>
>() {
  static readonly Live = Layer.effect(Foo2, makeService);
}
