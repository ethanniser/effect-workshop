import {
  Console,
  Deferred,
  Effect,
  type Exit,
  Fiber,
  Queue,
  Schedule,
  pipe,
} from "effect";

const normalJS = () => {
  let i = 0;
  setInterval(() => console.log("i", i), 250);
  while (true) {
    i++;
  }
};

/**
 * Uncomment to run `normalJS`:
 */
// normalJS();

/**
 * why doesnt the log show up?
 */
const effect = Effect.gen(function* () {
  let i = 0;
  yield* pipe(
    Effect.suspend(() => Console.log("i", i)),
    Effect.repeat(Schedule.spaced(250)),
    Effect.forkChild
  );

  while (true) {
    yield* Effect.sync(() => i++);
  }
});

/**
 * Uncomment to run `effect`
 */
// Effect.runPromise(effect);

/**
 * hmmm... a little bit different
 *
 * Effect's concurrency model is based on fibers (also known as green threads or coroutines).
 * Fibers are extremely lightweight and can be spawned in the thousands without issue
 * Where effects are descriptions of programs, fibers are the actually in-progress, running programs
 * They can be 'awaited' to get their result, or interrupted to stop them
 *
 * All effects are run in a fiber, and fibers are scheduled by the runtime
 *
 * This leads to the key distinction between the native JavaScript concurrency model and the effect model
 *
 * In JavaScript, the main thread yields to the event loop before running the next piece of code
 * whether by the stack being empty or 'await' being called.
 * This is known as cooperative multitasking, tasks must themselves give up control to allow other tasks to run.
 *
 * The opposite is preemptive multitasking, where the executor is able to pause and resume tasks at will.
 * This is the model used in operating systems, os threads run as if they are the only thread, and the os schedules them.
 * This is how effect is able to abstract away sync vs async code to just the one `Effect` type.
 * Because even while one fiber is 'blocked' on a async operation, the runtime can run other fibers
 * again back to os threads, it's totally fine for a thread to be 'blocked' on a syscall,
 * because the os can run other threads in the meantime, the thread can act like everything is synchronous.
 *
 * How is this possible though? How can we have preemptive multitasking in JavaScript?
 * Normally, JavaScript is single-threaded, and the event loop is the only way to get async behavior
 * And the only way to yield control is to use 'await' or empty the stack
 *
 * But remember effects themselves are programs broken down into steps.
 * So the runtime can simply pause the current fiber by choosing to not run the next step
 * and instead run another fiber or do something else.
 */

const program = pipe(
  Effect.succeed(1),
  Effect.map((n) => n + 1)
);

/**
 * Q: What the runtime sees:
 *
 * `Program: [succeed(1), onSuccess((n) => n + 1))]`
 *
 * So the runtime can evaluate the first step, then go to its scheduler and decide to wait to run the next step.
 *
 * Key to remember here is that the runtime isn't magic!
 * JavaScript is still single-threaded, and the runtime is still subject to the event-loop,
 * so if you 'block' the main thread, you will block the runtime
 * (maybe you've heard in rust: "DON'T BLOCK THE EXECUTOR") - this is the same.
 *
 * e.g. Calling `bad` this will block the runtime!
 */
const bad = Effect.sync(() => {
  let i = 0;
  while (i < 100000) {
    i++;
  }
  console.log("done");
});

const better = Effect.gen(function* () {
  let i = 0;
  while (i < 100000) {
    yield* Effect.sync(() => i++);
  }
  console.log("done");
});

/**
 * Calling `better` will not block the runtime, but it will still take most of its attention.
 *
 * Because we put our operations (even infinite loops) into effects, this gives
 * the runtime the opportunity to pause and run other fibers.
 *
 * This isn't to say long blocking calls aren't evil, they might be necessary, but
 * using them is no different than without effect;
 * If you block the main thread, nothing else can run.
 *
 * Q: We are almost able to fully explain that first example now, but how do we 'spawn' new fibers?
 * When we run an effect, it runs in what we can think of as the 'main' fiber
 * you can see this in the log output.
 */

/**
 * Uncomment to run...
 */
// Effect.runSync(Effect.log("look <--- "));

/**
 * But we can spawn new fibers with `Effect.fork`.
 * `Effect.fork` runs the effect in a new fiber, and essentially returns a handle to that fiber.
 */
const fiber1 = Effect.gen(function* () {
  const fiber: Fiber.Fiber<never, never> = yield* Effect.forkChild(
    Effect.never
  );
  console.log(fiber.id);
});

/**
 * Uncomment to run `fiber1`:
 */
// Effect.runPromise(fiber1);

/**
 * Notice how the Fiber type is generic over two parameters, `A` and `E`:
 * - `A` represents the result type and
 * - `E` represents the error type of the effect that the fiber is running.
 *
 * So if we 'await' a `Fiber<A, E>`, we will get back an `Exit<A, E>` the result of the effect
 */
const fiber2 = Effect.gen(function* () {
  const fiber: Fiber.Fiber<number, never> = yield* Effect.forkChild(
    Effect.succeed(1)
  );
  const result: Exit.Exit<number, never> = yield* Fiber.await(fiber);
  console.log(result);
});

/**
 * Uncomment to run `fiber2`:
 */
// Effect.runPromise(fiber2);

/**
 * If we don't care about the full exit value, we can use `Fiber.join` to just get the result as an effect
 */
const fiber3 = Effect.gen(function* () {
  const fiber: Fiber.Fiber<number, never> = yield* Effect.forkChild(
    Effect.succeed(1)
  );
  const result: number = yield* Fiber.join(fiber);
  console.log(result);
});

/**
 * Uncomment to run `fiber3`:
 */
// Effect.runPromise(fiber3);

/**
 * So now, let's explain the first example again:
 */
const fiber4 = Effect.gen(function* () {
  let i = 0;
  yield* pipe(
    Effect.suspend(() => Console.log("i", i)),
    Effect.repeat(Schedule.spaced(250)),
    Effect.forkChild
  );

  while (true) {
    yield* Effect.sync(() => i++);
  }
});
export default fiber4;

/**
 * Uncomment to run `fiber4`:
 */
// Effect.runPromise(fiber4);

/**
 * # `fiber4`
 *
 * 1. First, we define an effect that logs the value of i every 250ms forever.
 * 2. Then fork it so that it runs in a separate fiber.
 * 3. Then we have an infinite loop that increments i, but still allows the runtime to run other fibers;
 *
 * So the runtime is executing the increments over and over, and eventually it says
 * 'alright lets see if there is anything else to run', and switches execution to the fiber that logs i
 * then that fiber yields because of its schedule, and the runtime goes back to the incrementing fiber
 */

const fiber5 = Effect.gen(function* () {
  let i = 0;
  yield* pipe(
    Effect.suspend(() => Console.log("i", i)),
    Effect.repeat(Schedule.spaced(250)),
    Effect.forkChild
  );

  i = 100;
});

/**
 * Uncomment to run `fiber5`:
 */
// Effect.runPromise(fiber5);

/**
 * Take a moment and think about what you expect to happen here (`fiber5`).
 *
 * Why doesn't anything happen?
 *
 * This is because of a key feature of effect's *structured* concurrency model:
 * fibers have a *parent-child relationship*, and when a parent fiber completes or is interrupted,
 * it will interrupt all of its children, and their children, and so on...
 *
 *
 * So in this example, we fork a fiber, and then the parent fiber completes immediately,
 * so the forked fiber is interrupted and never gets to run!
 *
 *
 *
 * Why is this so important?
 * Consider the alternative, where all fibers are independent and live in a magical global scope (*go*).
 * What guarantees do we lose about our programs?
 *
 * We lose the ability to think about the control flow of our program.
 * Every other control flow construct follows a basic pattern. We enter at the top, and leave at the bottom.
 *
 * Global `coroutines` and `callbacks` blur this distinction.
 * Anytime you call a function it will eventually return with some value, but
 * - did it spawn other coroutines that are still running in the background
 * - or set up of callbacks that might run in the future?
 *
 * Not only is it impossible to determine without reading the source code.
 * But there is literally nothing you can do about it.
 * How do you cancel a coroutine that you have no reference to?
 *
 * This also leads to issues with resource management.
 * Take TypeScript’s new `using` keyword. It automatically cleans up a resource when it goes out of scope,
 * but there are no guarantees some asynchronous callbacks have been set up with dangling references to that resource.
 */

type TestFile = {
  readContents: () => string;
};

function handleFile(file: TestFile) {
  const contents = file.readContents();
  console.log(`contents has length: ${contents.length}`);

  setTimeout(() => {
    console.log(file.readContents());
  }, 100);
}

const runExample = () => {
  const getFile = () => {
    console.log("file opened");
    let open = true;
    return {
      readContents: () => (open ? "....." : "ERROR FILE CLOSED"),

      [Symbol.dispose]: () => {
        open = false;
        console.log("file closed");
      },
    } satisfies Disposable & TestFile;
  };
  /** uncomment bc prettier */
  // using file = getFile();
  // handleFile(file);
};

/**
 * Uncomment to run `runExample`:
 */
// runExample();

/**
 * And there’s no way to tell from the outside this is happening, and no easy way to stop it even if we knew.
 * The whole idea with async is things might take a long time to resolve.
 * We need a way to stop work when we decide it's no longer needed.
 * This is mostly an afterthought in the already mentioned languages and patterns,
 * optional by default, and requiring manual setup and control.
 *
 * Q: What about error handling?
 * If a coroutine fails, how do we know? who handles that error?
 *
 *
 *
 * This situation actually draws a lot of parallels to manual memory management in c or c++.
 * You *should* be able to avoid any problems by just not messing up.
 * But eventually you, or a dependency you use, will forget to free some memory,
 * or free early leading to undefined behavior.
 *
 * I think the general consensus has settled that Rust’s structured memory management solution
 * is something to pay attention to.
 *
 * Giving memory an ‘owner’ who represents when it will be freed is a powerful concept.
 * What if we could apply this to concurrency tasks?
 *
 *
 *
 * This is 'structured concurrency', and it is the key to making concurrent programs easier to reason about.
 * When we join a fiber, we can be certain it left no trace (*)
 *
 * When a fiber gets interrupted, its guaranteed to run all of its finalizers,
 * which ensures that resources are cleaned up properly.
 *
 * Q: But what if those finalizers get interrupted? (because they are effects too right?)
 *
 * To solve this problem, effect has the ability to mark certain regions of code as 'uninterruptible'
 * this is done by default for finalizers, but you can also do it yourself with `Effect.uninterruptible`
 *
 *
 *
 * Finally, while structured concurrency is a powerful tool,
 * there might be times when you want to spawn a fiber that can outlive its parent/
 *
 * Effect gives you a couple escape hatches for this, but they are very low-level and should be used with caution.
 * If you don't have a reason not to use the normal structured concurrency model, you should use it:
 *
 *  - `forkScoped` spawns a fiber in the same scope as its parent
 * - `forkDetach` spawns a fiber in the top level, global scope (formerly forkDaemon)
 * - `forkIn` allows you to specify a custom scope to spawn a fiber in with a `Scope`
 *
 *
 * ___
 *
 * Next well take a very brief look at communication between fibers.
 *
 * First is `Deffered` which is basically a 'promise', but for fibers
 * it only has two states, `unresolved` and `resolved` (with a value or an error)
 */

const fiber7 = Effect.gen(function* () {
  const deferred: Deferred.Deferred<number, never> =
    yield* Deferred.make<number>();

  const fiber: Fiber.Fiber<boolean, never> = yield* pipe(
    Deferred.succeed(deferred, 42),
    Effect.forkChild
  );

  const result: number = yield* Deferred.await(deferred);
  console.log(result);
});

/**
 * Uncomment to run `fiber7`:
 */
// Effect.runPromise(fiber7);

/**
 * Next is `Queue` which is your standard channel but with customizable backpressure behavior
 */

const fiber8 = Effect.gen(function* () {
  const queue: Queue.Queue<number> = yield* Queue.unbounded<number>();

  const fiber: Fiber.Fiber<void, never> = yield* pipe(
    Queue.take(queue),
    Effect.flatMap((n) => Console.log("recvied", n)),
    Effect.repeat({ times: 2 }),
    Effect.forkChild
  );

  yield* Queue.offer(queue, 42); // Places one value in the queue.
  yield* Effect.sleep(1000);
  yield* Queue.offer(queue, 43);

  yield* Fiber.join(fiber);
});

/**
 * Uncomment to run `fiber8`:
 */
// Effect.runPromise(fiber8);

/**
 * A `PubSub` is a channel that broadcasts to multiple 'subscribers'.
 * Finally, a `Semaphore` is a way to limit the number of fibers that can access a resource at once
 *
 * Lastly, I want to clarify when fibers run.
 * Consider this example:
 */

const fiber9 = Effect.gen(function* () {
  yield* pipe(Console.log("fork!"), Effect.forkChild);
  yield* Console.log("main!");
});

/**
 * Uncomment to run `fiber9`:
 */
// Effect.runPromise(fiber9);

/**
 * Q: What do you expect to happen here?
 * Q: Why does the program end immediately?
 *
 * - When you fork a fiber, *it does NOT run immediately*;
 *
 * - The current fiber first has to yield control to the runtime.
 * 	 This can be an easy foot gun if you spawn a fiber, expecting it to respond
 * 	 to something you do in the current fiber right after.
 *
 * ---
 *
 * To manually yield control to the runtime, you can use `Effect.yieldNow()`
 */

const fiber10 = Effect.gen(function* () {
  yield* pipe(Console.log("fork!"), Effect.forkChild);
  yield* Effect.yieldNow;
  yield* Console.log("main!");
});

/**
 * Uncomment to run `fiber10`:
 */
// Effect.runPromise(fiber10);

/**
 * To end, I know I just taught you all these cool things about fibers.
 * However, fibers are really a low-level concept that you shouldn't have to think about too much.
 *
 * Effect provides an incredibly simple high-level API for concurrency, with all the power of fibers under the hood.
 */

const logAfter = (ms: number): Effect.Effect<void, never, never> =>
  pipe(Effect.sleep(ms), Effect.andThen(Effect.log(`done-after ${ms}`)));

const runsSequentially = Effect.all([
  logAfter(500),
  logAfter(1000),
  logAfter(1500),
]);

/**
 * Uncomment to run `runsSequentially`:
 */
// Effect.runPromise(runsSequentially);

const runsConcurrently = Effect.all(
  [logAfter(500), logAfter(1000), logAfter(1500)],
  { concurrency: "unbounded" }
);

/**
 * Uncomment to run `runsConcurrently`
 */
// Effect.runPromise(runsConcurrently);

/**
 * With just one option, effect takes care of
 * - spawning fibers,
 * - joining them,
 * - and running them concurrently
 * - as well as interrupting all of them if any of them fail (short-circuiting) - (can also be disabled)
 */

/**
 * Q: Unbounded concurrency is too much?
 *
 * Just set a number limit!
 */
const boundedConcurrent = Effect.all(
  [logAfter(500), logAfter(1000), logAfter(1500), logAfter(2000)],
  { concurrency: 2 }
);

/**
 * Uncomment to run `boundedConcurrent`:
 */
// Effect.runPromise(boundedConcurrent);

/**
 * In effect v3 there was a { concurrency: 'inherit' } option + `withConcurrency`,
 * in v4 you just pass a number limit directly.
 */

/**
 * Basically, any API that involves multiple effects, can be run concurrently in this way.
 *
 * ___
 *
 * Finally, a short note about scheduling.
 * The `Scheduler` determines
 * - if a fiber should yield,
 * - and if so, what 'task' should run next.
 *
 * A really powerful, but extremely low-level feature is the ability to customize the scheduler.
 * For example, if you have a web app, where you have different fibers for lots of various things,
 * and one main fiber responsible for rendering the UI, you could create a custom scheduler that gives the UI fiber priority over the others
 * to ensure that the UI is always responsive.
 *
 * People have made schedulers bound to react's render queue, or to requestIdleCallback.
 *
 * Feel encouraged to experiment with your own schedulers.
 * There is no good default for every case,
 * - yield too much, and the program becomes unnecessarily slow,
 * - yield too little, and the program becomes unresponsive and uncooperative.
 *
 * For reference, the default scheduler waits 2048 'ops' before allowing another fiber
 * and 2048 of those smaller microtask yields before waiting on a `setTimeout(0)` and allowing the event loop to run.
 *
 * This explains the difference between `while(true)` and `Effect.forever`:
 * - in the first example, the log is on a timeout, so the microtask yields don't allow it to run
 * - `Effect.forever` has a built-in `Effect.yieldNow()` which means more yields = faster non-microtask yields.
 */
