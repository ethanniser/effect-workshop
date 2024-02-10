import { Console, Effect, Fiber, Ref, Schedule, pipe } from "effect";

const logRef = (ref: Ref.Ref<number>) =>
  pipe(
    Ref.get(ref),
    Effect.flatMap((i) => Console.log("i", i)),
    Effect.repeat(Schedule.spaced(250)),
    Effect.fork
  );

const one = Effect.gen(function* (_) {
  let ref = yield* _(Ref.make(0));
  yield* _(logRef(ref));

  while (true) {
    yield* _(Ref.update(ref, (i) => i + 1));
  }
});

const two = Effect.gen(function* (_) {
  let ref = yield* _(Ref.make(0));
  yield* _(logRef(ref));

  yield* _(
    Ref.update(ref, (i) => i + 1),
    Effect.forever
  );
});

const three = Effect.gen(function* (_) {
  let ref = yield* _(Ref.make(0));
  yield* _(logRef(ref));

  while (true) {
    yield* _(Ref.update(ref, (i) => i + 1));
    yield* _(Effect.yieldNow());
  }
});

const main = Effect.gen(function* (_) {
  yield* _(Console.log(" --- ONE --- "));
  const handle = yield* _(Effect.fork(one));
  yield* _(Effect.sleep("2 seconds"));
  yield* _(Fiber.interrupt(handle));

  yield* _(Console.log(" --- TWO --- "));
  const handle2 = yield* _(Effect.fork(two));
  yield* _(Effect.sleep("2 seconds"));
  yield* _(Fiber.interrupt(handle2));

  yield* _(Console.log(" --- THREE --- "));
  const handle3 = yield* _(Effect.fork(three));
  yield* _(Effect.sleep("2 seconds"));
  yield* _(Fiber.interrupt(handle3));
});

Effect.runPromise(main);
