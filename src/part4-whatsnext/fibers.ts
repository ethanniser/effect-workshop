// this one little example will set us up for almost everything in this section

import { Console, Effect, Ref, Schedule } from "effect";

let run: () => any = () => {};

const normalJS = () => {
  let i = 0;
  setInterval(() => console.log("i", i), 250);
  while (true) {
    i++;
  }
};

// uncomment to run
// run = normalJS;

const effect = Effect.gen(function* (_) {
  let i = 0;
  let ref = yield* _(Ref.make(0));
  yield* _(
    Effect.suspend(() => Console.log("i", i)),

    // Effect.delay("250 millis"),
    // Effect.forever,
    Effect.repeat(Schedule.spaced(250)),

    Effect.fork
  );

  while (true) {
    yield* _(Effect.sync(() => i++));
  }
  //   yield* _(
  //     Effect.sync(() => i++),
  //     Effect.forever
  //   );

  // ^^ this has slightly different results than the while loop, why?
});

// uncomment to run
run = () => Effect.runPromise(effect);

const withRef = Effect.gen(function* (_) {
  let ref = yield* _(Ref.make(0));
  yield* _(
    Ref.get(ref),
    Effect.flatMap((i) => Console.log("i", i)),
    Effect.repeat(Schedule.spaced(250)),
    Effect.fork
  );

  yield* _(
    Ref.update(ref, (i) => i + 1),
    Effect.forever
  );
});

run();
