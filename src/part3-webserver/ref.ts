import { Effect, Ref, Schedule, SynchronizedRef } from "effect";
// Sharing mutable state between different parts of your program is a common problem.
// But this can become difficult with variables and pass by value vs pass by reference.

// Effects solution to this problem is the `Ref` type.
// You probably know what a `Ref` is if you have used `React` or `Vue` before.
// Its basically just an object with a `current` property that can be mutated.
// Because objects are passed by reference, you can share the same `Ref` between different parts of your program.
// And access the same value from different places.

// Additionally, all operations on a `Ref` are effectful,

const one = Effect.gen(function* (_) {
  const ref = yield* _(Ref.make(1));
  yield* _(Ref.update(ref, (n) => n + 1));
  return yield* _(Ref.get(ref));
});

// this becomes useful when we want to share state in a concurrent environment

const incredmentRef = (ref: Ref.Ref<number>) => Ref.update(ref, (n) => n + 1);
const logRef = (ref: Ref.Ref<number>) =>
  Ref.get(ref).pipe(Effect.flatMap((s) => Effect.log(s)));

const two = Effect.gen(function* (_) {
  const ref = yield* _(Ref.make(1));

  const logFiber = yield* _(
    logRef(ref),
    Effect.repeat(Schedule.spaced("1 seconds")),
    Effect.fork
  );

  const incFiber = yield* _(
    incredmentRef(ref),
    Effect.repeat(Schedule.spaced("100 millis")),
    Effect.fork
  );

  yield* _(Effect.sleep("5 seconds"));
});

// Effect.runPromise(two);

// A SynchronizedRef is basically the same thing except updates can be effectful
// An effectful operation also 'locks' the ref, so all other operations must wait until the effectful operation is complete

const three = Effect.gen(function* (_) {
  const ref = yield* _(SynchronizedRef.make(1));
  const effectfulInc = (a: number) =>
    SynchronizedRef.updateEffect(ref, (n) =>
      Effect.sleep("1 seconds").pipe(Effect.map(() => n + a))
    );

  const logged = (id: number) =>
    Effect.gen(function* (_) {
      const before = yield* _(SynchronizedRef.get(ref));
      yield* _(Effect.log(`Before ${id}: ${before}`));
      yield* _(effectfulInc(id));
      const after = yield* _(SynchronizedRef.get(ref));
      yield* _(Effect.log(`After ${id}: ${after}`));
    });

  yield* _(
    Effect.all([logged(1), logged(2), logged(3)], { concurrency: "unbounded" })
  );

  const final = yield* _(SynchronizedRef.get(ref));
  yield* _(Effect.log(`Final: ${final}`));
});

Effect.runPromise(three);
