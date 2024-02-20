import {
  Chunk,
  Console,
  Effect,
  Either,
  Option,
  Sink,
  Stream,
  pipe,
} from "effect";

// For a moment consider these two types: `T` and `T[]`
// What semantics do they share? What semantics are different?

// if `Effect<A, E, R>` is a value that describes a program that:
// requires a context `R`, may fail with an error `E`, and succeed a value `A`
// then `Stream<A, E, R>` is a value that describes a program that:
// requires a context `R`, may fail with an error `E`, and may succeed with zero or many values `A`

// If you understand that Streams are like Effects but with zero or many values,
// Streams will be easy to understand.

// Just like effects, streams are immutable values.
// Just like effects, streams are lazy and short circuit on errors.
// Just like effects, streams can have finalizers.
// Basically all effect combinators have a stream equivalent.

// Just like how effects can never suceed, Streams can yield infinite values.

// Lets take a look at some simple streams

Stream.empty;
Stream.unit;
Stream.succeed(1);
Stream.make(1, 2, 3);
Stream.range(1, 10);
Stream.iterate(1, (n) => n + 1);
Stream.fromIterable([1, 2, 3]);
Stream.fromEffect(Effect.sync(() => Date.now()));
// many more...

// Just like with effects, we can map, tap, filter, zip, and more.

// To 'run' a stream we use the `Stream.run*` functions.

// The key thing to remember is that those functions only resolve when the stream is complete.
// So if you run an infinite stream, it will never resolve.
// How do you do anything with an infinite stream then? You can use `Stream.take` to limit the number of values.
// But really you do the processing the stream as it is emitted, not after it is complete.

// consider this stream:
const spacedInts = Stream.asyncInterrupt<number>((emit) => {
  let n = 0;
  const interval = setInterval(() => {
    if (n > 4) {
      clearInterval(interval);
      emit(Effect.fail(Option.none()));
    }
    n++;
    emit(Effect.succeed(Chunk.of(n)));
  }, 250);
  return Either.left(Effect.sync(() => clearInterval(interval)));
});

// What is a chunk? A collection of values like an array.
// This improves the performance of a stream, because there is a cost to emitting each value
// and it can be common for a stream to emit more than one value at a time.
// So instead of sending each value individually, we send them in chunks.

// Why does emitting a failure of `Option.none` stop the stream?
// There are three options for emit: a success, a failure, or signaling that the stream is complete.
// We using option.none to signal that the stream is complete. (Option.some(error) would signal a failure)

// if we runCollect this stream, we wont be able to do anything with the values until the stream is complete.

const one = Effect.gen(function* (_) {
  const collected = yield* _(Stream.runCollect(spacedInts));
  for (const value of collected) {
    yield* _(Console.log(value));
  }
});

// Effect.runPromise(one);

// However if we do our 'processing' inside the stream, we can do things with the values as they are emitted.
const two = Effect.gen(function* (_) {
  yield* _(
    spacedInts,
    Stream.tap((n) => Console.log(n)),
    Stream.runDrain
  );
});

Effect.runPromise(two);

// For customized cosumption of streams, there is the `Sink` type.
// A `Sink<A, In, L, E, R>` describes a program that:
// consumes a `Stream<In>`, maybe fails with an error `E`, and requires a context `R`
// and that will produce a value `A` and maybe have leftover values of type `L`

const sink1 = pipe(
  spacedInts,
  Stream.run(Sink.sum),
  Effect.andThen((sum) => Console.log(sum))
);

// Effect.runPromise(sink1);

const sink2 = pipe(spacedInts, Stream.run(Sink.forEach((n) => Console.log(n))));

// Effect.runPromise(sink2);

// example of leftovers

const sink3 = pipe(
  spacedInts,
  Stream.run(Sink.head().pipe(Sink.collectLeftover)),
  Effect.andThen(([head, leftover]) => Console.log(head, leftover))
);

// Effect.runPromise(sink3);
