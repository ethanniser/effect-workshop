import { Effect, Ref, Schedule, SynchronizedRef, pipe } from "effect";

/**
 * Sharing a mutable state between different parts of your program is a common problem.
 * But this can become difficult with variables and `pass by value` vs `pass by reference`.
 *
 * Effects solution to this problem is the `Ref` type.
 * You probably know what a `Ref` is if you have used `React` or `Vue` before.
 * Its basically just an object with a `current` property that can be mutated.
 * Because objects are passed by reference, you can share the same `Ref` between different parts of your program.
 * And access the same value from different places.
 *
 * Additionally, all operations on a `Ref` are effectful,
 */

const one: Effect.Effect<number> = Effect.gen(function* () {
  const ref: Ref.Ref<number> = yield* Ref.make(1);
  yield* Ref.update(ref, (n) => n + 1);
  return yield* Ref.get(ref);
});

/**
 * this becomes useful when we want to share state in a concurrent environment
 */
const incrementRef = (ref: Ref.Ref<number>): Effect.Effect<void> =>
  Ref.update(ref, (n) => n + 1);

const logRef = (ref: Ref.Ref<number>): Effect.Effect<void> =>
  pipe(
    Ref.get(ref),
    Effect.flatMap((s) => Effect.log(s))
  );

const two: Effect.Effect<void, never, never> = Effect.gen(function* () {
  const ref: Ref.Ref<number> = yield* Ref.make(1);

  /**
   * Will log the value of the ref every second
   */
  const logFiber = yield* pipe(
    logRef(ref),
    Effect.repeat(Schedule.spaced("1 seconds")),
    Effect.forkChild
  );

  /**
   * While the same ref will be incremented every 100 milliseconds
   */
  const incFiber = yield* pipe(
    incrementRef(ref),
    Effect.repeat(Schedule.spaced("100 millis")),
    Effect.forkChild
  );

  /**
   * This program demonstrates the thread-safe operations on a shared `Ref`
   * in a concurrent environment. The following diagram visualizes the behavior:
   *
   * ### Marble Diagram
   *
   * ```
   * Time (s):  0     1     2     3     4     5
   *            |     |     |     |     |     |
   * Ref value: 1     11    21    31    41    51
   *
   * Increment: ↑  ↑  ↑  ↑  ↑  ↑  ↑  ↑  ↑  ↑  ↑  ...  (every 100ms)
   *
   * Logging:        ↓     ↓     ↓     ↓     ↓
   *                 1     11    21    31    41       (every 1s)
   * ```
   * The diagram shows:
   * - The Ref value increasing over time
   * - Increment operations (↑) occurring every 100ms
   * - Log operations (↓) occurring every 1s, capturing the current value
   *
   */

  yield* Effect.sleep("5 seconds");
});

// Effect.runPromise(two);
/**
 * ```log
 * fiber=#1 message=1
 * fiber=#1 message=11
 * fiber=#1 message=21
 * fiber=#1 message=31
 * fiber=#1 message=41
 * ```
 */

/**
 * A SynchronizedRef is basically the same thing except updates can be effectful
 * An effectful operation also 'locks' the ref, so all other operations must wait until the effectful operation is complete
 */
const three: Effect.Effect<void> = Effect.gen(function* () {
  const ref: SynchronizedRef.SynchronizedRef<number> =
    yield* SynchronizedRef.make(1);

  const effectfulInc = (a: number): Effect.Effect<void> =>
    pipe(
      ref,
      SynchronizedRef.updateEffect((n: number) =>
        Effect.sleep("1 seconds").pipe(Effect.map(() => n + a))
      )
    );

  const logged = (id: number): Effect.Effect<void> =>
    Effect.gen(function* () {
      const before: number = yield* SynchronizedRef.get(ref);

      yield* Effect.log(`Before ${id}: ${before}`);

      yield* effectfulInc(id);

      const after: number = yield* SynchronizedRef.get(ref);

      yield* Effect.log(`After ${id}: ${after}`);
    });

  yield* Effect.all([logged(1), logged(2), logged(3)], {
    concurrency: "unbounded",
  });

  const final: number = yield* SynchronizedRef.get(ref);
  yield* Effect.log(`Final: ${final}`);
});

// Effect.runPromise(three);
/**
 * ```log
 * fiber=#2 message="Before 1: 1"
 * fiber=#3 message="Before 2: 1"
 * fiber=#4 message="Before 3: 1"
 * fiber=#2 message="After 1: 2"
 * fiber=#3 message="After 2: 4"
 * fiber=#4 message="After 3: 7"
 * fiber=#0 message="Final: 7"
 * ```
 */
