import { Effect, Context, Console } from "effect";

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

const randomImpl: RandomImpl = {
  next: Effect.sync(() => Math.random()),
  nextIntBetween: (min, max) =>
    Effect.sync(() => Math.floor(Math.random() * (max - min + 1) + min)),
};

// runnable: Effect<'low' | 'high', never, never>
const runnable = program.pipe(Effect.provideService(Random, randomImpl));

// now we can run the effect
console.log(Effect.runSync(runnable));

// However, not all services are so simple
// Some may require other services to be provided, or their construction may be effectful (or error)
// In these cases effect has the `Layer<ROut, E, RIn>` type to help us manage these dependencies
