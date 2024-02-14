import {
  Chunk,
  Console,
  Effect,
  Either,
  Option,
  Scope,
  Stream,
  pipe,
} from "effect";

const spacedInts = Stream.asyncInterrupt<number, string>((emit) => {
  let n = 0;
  emit(Effect.fail(Option.some("error")));
  const interval = setInterval(() => {
    console.log("n", n);
    if (n > 4) {
      emit(Effect.fail(Option.none()));
    }
    n++;
    emit(Effect.succeed(Chunk.of(n)));
  }, 250);
  return Either.left(
    Effect.sync(() => {
      console.log("clearInterval");
      clearInterval(interval);
    })
  );
});

Effect.runPromise(Stream.runDrain(spacedInts));
