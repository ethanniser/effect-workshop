import { Console, Effect, Layer, pipe } from "effect";

const one = Layer.effectDiscard(Console.log("one"));
const two = Layer.effectDiscard(Console.log("two"));

pipe(Layer.merge(one, two), Layer.launch, Effect.runPromise);
