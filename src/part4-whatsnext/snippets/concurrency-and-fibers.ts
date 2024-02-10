import { Effect, Console, Schedule, pipe, Fiber } from "effect";

const normalJS = () => {
  let i = 0;
  setInterval(() => console.log("i", i), 250);
  while (true) {
    i++;
  }
};

// uncomment to run
// normalJS();

// why doesnt the log show up?

const effect = Effect.gen(function* (_) {
  let i = 0;
  yield* _(
    Effect.suspend(() => Console.log("i", i)),
    Effect.repeat(Schedule.spaced(250)),
    Effect.fork
  );

  while (true) {
    yield* _(Effect.sync(() => i++));
  }
});

// uncomment to run
// Effect.runPromise(effect);

// hmmm a little bit different

// Effect's concurrency model is based on fibers (also known as green threads or coroutines)
// Where effects are descriptions of programs, fibers are the actually in-progress, running programs
// They can be 'awaited' to get their result, or interrupted to stop them

// All effects are run in a fiber, and fibers are scheduled by the runtime

// This leads to the key distinction between the native javascript concurrency model and the effect model

// In javascript, the main thread yield to the event loop before running the next piece of code
// whether by the stack being empty or 'await' being called
// This is known as cooperative multitasking, tasks must themselves give up control to allow other tasks to run

// The opposite is preemptive multitasking, where the executor is able to pause and resume tasks at will
// This is the model used in operating systems, os threads run as if they are the only thread, and the os schedules them
// This is how effect is able to abstract away sync vs async code to just the one `Effect` type
// Because even while one fiber is 'blocked' on a async operation, the runtime can run other fibers

// How is this possible though? How can we have preemptive multitasking in javascript?
// Normally, javascript is single-threaded, and the event loop is the only way to get async behavior
// And the only way to yield control is to use 'await' or empty the stack

// But remember effects themselves are programs broken down into steps
// So the runtime can simply pause the current fiber by choosing to not run the next step
// and instead run another fiber or do something else

const program = pipe(
  Effect.succeed(1),
  Effect.map((n) => n + 1)
);

// what the runtime sees:
// Program: [succeed(1), onSuccess((n) => n + 1))]
// so the runtime can evaluate the first step, then go to its scheduler and decide to wait to run the next step

// key to remember here is that the runtime isnt magic
// javascript is still single-threaded, and the runtime is still subject to the event loop
// so if you 'block' the main thread, you will block the runtime
// (maybe youve heard in rust: "DONT BLOCK THE EXECUTOR") - this is the same

const bad = Effect.sync(() => {
  let i = 0;
  while (i < 100000) {
    i++;
  }
  console.log("done");
});

// this will block the runtime

const better = Effect.gen(function* (_) {
  let i = 0;
  while (i < 100000) {
    yield* _(Effect.sync(() => i++));
  }
  console.log("done");
});

// this will not block the runtime (but it will still take most of its attention)

// because we put our operations (even infinite loops) into effects
// it gives the runtime the opportunity to pause and run other fibers

// were almost able to fully explain that first example now, but how do we 'spawn' new fibers?
// when we run an effect, it runs in what we can think of as the 'main' fiber
// you can see this in the log output

// uncomment to run
// Effect.runSync(Effect.log("look <--- "));

// but we can spawn new fibers with `Effect.fork`
// Effect.fork runs the effect in a new fiber, and returns essentially a handle to that fiber

const fiber1 = Effect.gen(function* (_) {
  const fiber = yield* _(Effect.fork(Effect.never));
  console.log(fiber.id());
});

// uncomment to run
// Effect.runPromise(fiber1);

// notice how the Fiber type is generic over two parameters, A and E
// this represents the result type and the error type of the effect that the fiber is running
// so if we 'await' a Fiber<A, E>, we will get back an Exit<A, E> the result of the effect

const fiber2 = Effect.gen(function* (_) {
  const fiber = yield* _(Effect.fork(Effect.succeed(1)));
  const result = yield* _(Fiber.await(fiber));
  console.log(result);
});

// uncomment to run
// Effect.runPromise(fiber2);

// if we dont care about the full exit value, we can use Fiber.join to just get the result as an effect
const fiber3 = Effect.gen(function* (_) {
  const fiber = yield* _(Effect.fork(Effect.succeed(1)));
  const result = yield* _(Fiber.join(fiber));
  console.log(result);
});

// uncomment to run
Effect.runPromise(fiber3);
