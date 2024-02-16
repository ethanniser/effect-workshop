import {
  Effect,
  Console,
  Schedule,
  pipe,
  Fiber,
  Deferred,
  Queue,
} from "effect";

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
// Fibers are extremely lightweight, and can be spawned in the thousands without issue
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
// again back to os threads, its totally fine for a thread to be 'blocked' on a syscall,
// because the os can run other threads in the meantime, the thread can act like everything is synchronous

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

// this isnt to say long blocking calls are evil, they might be necessary
// but using them is no different than without effect
// if you block the main thread, nothing else can run

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
// Effect.runPromise(fiber3);

// so now lets explain the first example again

const fiber4 = Effect.gen(function* (_) {
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
// Effect.runPromise(fiber4);

// first we define an effect that logs the value of i every 250ms forever
// then fork it so that it runs in a separate fiber
// then we have an infinite loop that increments i, but still allows the runtime to run other fibers
// so the runtime is executing the increments over and over, and eventually it says
// 'alright lets see if there is anything else to run', and switches execution to the fiber that logs i
// then that fiber yields because of its schedule, and the runtime goes back to the incrementing fiber

const fiber5 = Effect.gen(function* (_) {
  let i = 0;
  yield* _(
    Effect.suspend(() => Console.log("i", i)),
    Effect.repeat(Schedule.spaced(250)),
    Effect.fork
  );

  i = 100;
});

// uncomment to run
Effect.runPromise(fiber5);

// take a moment and think about what you expect to happen here

// why doesnt anything happen?
// this is because of a key feature of effect's *structured* concurrency model
// fibers have a parent-child relationship, and when a parent fiber completes or is interrupted,
// it will interrupt all of its children, and their children, and so on

// so in this example, we fork a fiber, and then the parent fiber completes immediately
// so the forked fiber is interrupted and never gets to run

// why is this so important?
// consider the alternative, where all fibers are independent and live in a magical global scope (*go*)
// what guarantees do we lose about our programs?

// we lose the ability to think about the control flow of our program
// Every other control flow construct follows a basic pattern. We enter at the top, and leave at the bottom.

// global coroutines and callbacks blur this distinction.
// Anytime you call a function it will eventually return with some value,
// but did it spawn other coroutines that are still running in the background,
// or set up of callbacks that might run in the future?

// not only is it impossible to determine without reading the source code.
// but there is litterally nothing you can do about it
// how do you cancel a coroutine that you have no reference to?

// this also leads to issues with resource management
// Take typescript’s new ‘using’ keyword. It automatically cleans up a resource when it goes out of scope,
// but there’s no guarantees some asynchronous callbacks have been setup with dangling references to that resource.

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
    };
  };
  // uncomment bc prettier
  //   using file = getFile();

  //   handleFile(file);
};

// uncomment to run
// runExample();

// And there’s no way to tell from the outside this is happening, and no easy way to stop it even if we knew.
// The whole idea with async is things might take a long time to resolve.
// We need a way to stop work when we decide its no longer needed.
// This is mostly an afterthought in the already mentioned languages and patterns,
// optional by default, and requiring manual setup and control.

// what about error handling?
// if a coroutine fails, how do we know? who handles that error?

// This situation actually draws a lot of parallels to manually memory management in c or c++.
// You *should* be able to avoid any problems by just not messing up.
// But eventually you, or a dependency you use, will forget to free some memory,
// or free early leading to undefined behavior.

// I think the general consensus has settled that Rust’s structured memory management solution
// is something to pay attention to.

// Giving memory an ‘owner’ who represents when it will be freed is a powerful concept.
// What if we could apply this to concurrency tasks?

// this is 'structured concurrency', and it is the key to making concurrent programs easier to reason about
// when we join a fiber, we can be certain it left no trace (*)

// When a fiber gets interrupted, its guaranteed to run all of its finalizers
// which ensures that resources are cleaned up properly

// but what if those finalizers get interrupted? (because they are effects too right?)

// to solve this problem, effect has the ability to mark certain regions of code as 'uninterruptible'
// this is done by default for finalizers, but you can also do it yourself with `Effect.uninterruptible`

// Finally, while structured concurrency is a powerful tool,
// there might be times where you want to spawn a fiber that can outlive its parent

// Effect gives you a couple escape hatches for this, but they are very low-level and should be used with caution
// if you dont have a reason not to use the normal structured concurrency model, you should use it

// `forkScoped` spawns a fiber in the same scope as its parent
// `forkDaemon` spawns a fiber in the top level, global scope
// `forkIn` allows you specify a custom scope to spawn a fiber in with a `Scope`

// next well take a very brief look at communication between fibers

// first is `Deffered` which is basically a 'promise', but for fibers
// it only has two states, unresolved and resolved (with a value or an error)

const fiber7 = Effect.gen(function* (_) {
  const deferred = yield* _(Deferred.make<number>());
  const fiber = yield* _(Deferred.succeed(deferred, 42), Effect.fork);

  const result = yield* _(Deferred.await(deferred));
  console.log(result);
});

// uncomment to run
// Effect.runPromise(fiber7);

// next is `Queue` which is your standard channel
// but with customizable backpressure behavior

const fiber8 = Effect.gen(function* (_) {
  const queue = yield* _(Queue.unbounded<number>());
  const fiber = yield* _(
    Queue.take(queue),
    Effect.flatMap((n) => Console.log("recvied", n)),
    Effect.repeat({ times: 2 }),
    Effect.fork
  );

  yield* _(Queue.offer(queue, 42));
  yield* _(Effect.sleep(1000));
  yield* _(Queue.offer(queue, 43));

  yield* _(Fiber.join(fiber));
});

// uncomment to run
// Effect.runPromise(fiber8);

// a `PubSub` is a channel that broadcasts to multiple 'subscribers'
// finally a `Semaphore` is a way to limit the number of fibers that can access a resource at once

// lastly I want to clarify when fibers run
// consider this example

const fiber9 = Effect.gen(function* (_) {
  yield* _(Console.log("fork!"), Effect.fork);
  yield* _(Console.log("main!"));
});

// uncomment to run
// Effect.runPromise(fiber9);

// what do you expect to happen here?
// why does the program end immediately?
// when you fork a fiber, it does NOT run immediately
// the current fiber first has to yield control to the runtime
// this can be an easy footgun if you spawn a fiber,
// expecting it to respond to something you do in the current fiber right after

// to manually yield control to the runtime, you can use `Effect.yieldNow()`

const fiber10 = Effect.gen(function* (_) {
  yield* _(Console.log("fork!"), Effect.fork);
  yield* _(Effect.yieldNow());
  yield* _(Console.log("main!"));
});

// uncomment to run
// Effect.runPromise(fiber10);

// to end, I know I just taught you all these cool things about fibers
// but really fibers are a low-level concept, that you shouldnt have to think about too much
// Effect provides a incredibly simple high-level API for concurrency, with all the power of fibers under the hood

const logAfter = (ms: number) =>
  pipe(Effect.sleep(ms), Effect.zipRight(Effect.log(`done-after ${ms}`)));

const runsSequentially = Effect.all([
  logAfter(500),
  logAfter(1000),
  logAfter(1500),
]);

// uncomment to run
// Effect.runPromise(runsSequentially);

const runsConcurrently = Effect.all(
  [logAfter(500), logAfter(1000), logAfter(1500)],
  { concurrency: "unbounded" }
);

// uncomment to run
// Effect.runPromise(runsConcurrently);

// with just one option, effect takes care of spawning fibers, joining them, and running them concurrently
// as well as interrupting all of them if any of them fail (short-circuiting) - (can also be disabled)

// unbounded concurrency is too much? just set a number limit
const boundedConcurrent = Effect.all(
  [logAfter(500), logAfter(1000), logAfter(1500), logAfter(2000)],
  { concurrency: 2 }
);

// uncomment to run
// Effect.runPromise(boundedConcurrent);

// and to control this concurrency level externally, you can use { concurrency: 'inherit' } + `withConcurrency`

const externalControl = Effect.all(
  [logAfter(500), logAfter(1000), logAfter(1500), logAfter(2000)],
  { concurrency: "inherit" }
).pipe(Effect.withConcurrency(2));
// could be done anywhere

// uncomment to run
// Effect.runPromise(externalControl);

// basically any api that involves multiple effects, can be run concurrently in this way

// Finally a short note about scheduling
// the `Scheduler` determines if a fiber should yield, and if so, what 'task' should run next

// a really powerful, but extremely low-level feature is the ability to customize the scheduler
// for example if you have a web app, where you have different fibers for lots of various things,
// and one main fiber responsible for rendering the UI
// you could create a custom scheduler that gives the UI fiber priority over the others
// to ensure that the UI is always responsive

// people have made schedulers bound to react's render queue, or to requestIdleCallback

// feel encouraged to experiment with your own schedulers
// There is no good default for every case, yield too much and program becomes unnecessarily slow,
// yield too little and the program becomes unresponsive and uncooperative

// for reference, the default scheduler waits 2048 'ops' before allowing another fiber
// and 2048 of those smaller microtask yields before waiting on a `setTimeout(0)` and allowing the event loop to run

// this explains the difference between while(true) and Effect.forever in the first example
// the log is on a timeout, so the microtask yields dont allow it to run
// Effect.forever has a built in Effect.yieldNow() which means more yields = faster non-microtask yields
