import { Console, Effect, Queue, Sink, Stream, pipe } from "effect";

/**
 * For a moment consider these two types: `T` and `T[]`
 * What semantics do they share? What semantics are different?
 *
 * If `Effect<A, E, R>` is a value that describes a program that:
 * - requires a context `R`,
 * - may fail with an error `E`,
 * - and succeed a value `A`
 *
 * Then `Stream<A, E, R>` is a value that describes a program that:
 * - requires a context `R`,
 * - may fail with an error `E`,
 * - and may succeed with zero or many values `A`
 *
 * If you understand that Streams are like Effects but with zero or many values,
 * Streams will be easy to understand.
 *
 *
 * Just like effects, **streams are immutable values**.
 * Just like effects, **streams are lazy and short circuit on errors**.
 * Just like effects, **streams can have finalizers**.
 * (Basically, all effect combinators have a stream equivalent).
 *
 * Just like how effects can never succeed, Streams can yield infinite values.
 *
 * Let's take a look at some simple streams...
 */

void Stream.empty;
void Stream.succeed(1);
void Stream.make(1, 2, 3);
void Stream.range(1, 10);
void Stream.iterate(1, (n) => n + 1);
void Stream.fromIterable([1, 2, 3]);
void Stream.fromEffect(Effect.sync(() => Date.now()));
/**
 * many more...
 *
 * ___
 *
 * Just like with effects, we can `map`, `tap`, `filter`, `zip`, and more...
 *
 * ___
 *
 * To 'run' a stream, we use the `Stream.run*` functions.
 *
 * The key thing to remember is that those functions only resolve when the stream is complete.
 * So if you run an infinite stream, it will never resolve.
 *
 * How do you do anything with an infinite stream then?
 * You can use `Stream.take` to limit the number of values.
 * But really, you do the processing the stream as it is emitted, not after it is complete.
 */

/**
 * Consider this stream:
 * It emits a number every 250ms until it reaches 5.
 *
 * `Stream.callback` hands you a `Queue` to push values into;
 * offer values to emit them, and end the queue to terminate the stream.
 */
const spacedInts: Stream.Stream<number> = Stream.callback<number>(
  Effect.fn(function* (queue) {
    let number = 0;

    const interval = setInterval(() => {
      if (number > 4) {
        clearInterval(interval);
        Queue.endUnsafe(queue); // Terminates the stream
        return;
      }
      number++;
      Queue.offerUnsafe(queue, number); // Add the current iteration to the stream
    }, 250);

    return yield* Effect.sync(() => clearInterval(interval)); // Cleanup that will be executed if the fiber executing this Effect is interrupted.
  })
);

/**
 * Why does ending the queue stop the stream?
 * There are three options for filling a stream's queue:
 * 1. offering values => We **succeed** by emitting them downstream.
 * 2. `Queue.fail` => We **fail** the stream with an error.
 * 3. or `Queue.end` => We signal that the stream is complete.
 *
 * ___
 *
 * If we `runCollect` this stream, we won't be able to do anything with the values until the stream is complete.
 */

const one = Effect.gen(function* () {
  const collected = yield* Stream.runCollect(spacedInts);
  for (const value of collected) {
    yield* Console.log("`one` emitting:", value);
  }
});

// Effect.runPromise(one);

/**
 * However, if we do our 'processing' inside the stream, we can do things with the values as they are emitted.
 */
const two: Effect.Effect<void, never, never> = Effect.gen(function* () {
  yield* pipe(
    spacedInts,
    Stream.tap((n: number) => Console.log("`two` emitting:", n)),
    Stream.runDrain // Runs the stream only for its effects. The emitted elements are discarded.
  );
});

Effect.runPromise(two);

/**
 * For customized consumption of streams, there is the `Sink` type.
 * A `Sink<A, In, L, E, R>` describes a program that:
 * - consumes a `Stream<In>`,
 * - maybe **fails** with an error `E`,
 * - and **requires** a context `R`
 * - and that will **produce** a value `A`
 * - and maybe have **leftover** values of type `L`
 */

const sink1 = pipe(
  spacedInts,
  Stream.run(Sink.sum),
  Effect.andThen((sum) => Console.log("`sink1` emitting:", sum))
);

// Effect.runPromise(sink1);

const sink2 = pipe(
  spacedInts,
  Stream.run(Sink.forEach((n: number) => Console.log("`sink2` emitting:", n)))
);

// Effect.runPromise(sink2);

/**
 * example of leftovers:
 * in v4 sinks report their leftovers as part of their result type,
 * see `Sink.mapLeftover` / `Sink.ignoreLeftover` for working with them.
 */
