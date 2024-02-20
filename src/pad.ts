import { Console, Effect, Layer, Schedule, pipe } from "effect";

const layer1 = Layer.effectDiscard(
  Effect.gen(function* (_) {
    yield* _(
      Effect.log("layer 1"),
      Effect.repeat(Schedule.spaced("1 seconds"))
    );
  })
);

const layer2 = Layer.effectDiscard(
  Effect.gen(function* (_) {
    yield* _(
      Effect.log("layer 2"),
      Effect.repeat(Schedule.spaced("1 seconds"))
    );
  })
);

const main = pipe(Layer.merge(layer1, layer2), Layer.launch);

Effect.runPromise(main);
