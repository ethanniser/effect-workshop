---
theme: default
title: Effect Beginner/Intermediate Workshop
author: Ethan Niser
lineNumbers: false
record: false
highlighter: shiki
drawings:
  persist: false
info: |
  ## Effect Beginner/Intermediate Workshop

  An interactive introduction to [Effect](https://effect.website)

  [Ethan Niser](https://twitter.com/ethanniser) at [Effect Days 2024](https://effect.website/events/effect-days)
---

<div class="text-5xl">Effect Beginner/Intermediate Workshop</div>

An interactive introduction to [Effect](https://effect.website)

<div class="uppercase text-sm tracking-widest">
Ethan Niser
</div>

<div class="abs-bl mx-14 my-12 flex flex-col space-y-4">
  <img src="/effect_days_logo.svg" class="h-8">
    <div class="text-sm opacity-50">Feb. 22nd, 2024</div>
</div>

---

```yaml
layout: "intro"
```

# Ethan Niser

<div class="leading-8 opacity-80">
Content Creator<br>
Author of The BETH Stack and next-typesafe-url<br>
<span v-click>Full time high school student</span><br>
</div>

<div class="my-10 flex flex-col space-y-5">
  <div class="flex items-center space-x-4">
    <ri-youtube-line class="opacity-50 text-2xl"/>
    <div><a href="https://youtube.com/@ethanniser" target="_blank">@ethannniser</a></div>
  </div>
  <div class="flex items-center space-x-4">
    <ri-twitter-line class="opacity-50 text-2xl"/>
    <div><a href="https://twitter.com/ethanniser" target="_blank">@ethanniser</a></div>
  </div>
  <div class="flex items-center space-x-4">
    <ri-github-line class="opacity-50 text-2xl"/>
    <div><a href="https://github.com/ethanniser" target="_blank">ethanniser</a></div>
  </div>
</div>

<!-- TODO: get better quality image -->
<img src="/kasumi_pfp.png" class="rounded-full w-50 abs-tr mt-16 mr-12"/>

---

```yaml
layout: two-cols
```

<Tweet id="1670980472057241601" cards="hidden"/>
::right::
<Tweet id="1671230834869665809"/>

<!--
I don't remember how I found effect, but I first discovered it back in June of last year, and was basically blown away from day 1
-->

---

```yaml
layout: statement
```

# Effect makes our programs easier to understand

<!--
Fundamentally, Effect's biggest factor is that it makes our programs easier to understand.
The result of that is all of the big words you see on the home page right: 'safer', 'more compoasable', 'more observable'.

These are all great things, but the core of it is a framework that allows us to program in a way that is **easier to understand**
-->

---

# Agenda

  <v-clicks>
  
  - Introduction to core Effect concepts
  - Real world examples by rewriting two apps
  - A peek into 'advanced' Effect

  </v-clicks>

<br>

<v-click>

### There's lots of room for _elasticity_

</v-click>

<!--

maybe ask about general skill level / familiarity with effect

I want to stress that even though this is the schedule on paper, I want to emphasize that there is a lot of room for elasticity in this workshop. I likely brought a lot of material, so if we are understanding stuff quickly theres lots to get through,

but, and this is the much more likely path, if we are moving at a slower pace than whats up here, that is 100% ok. We'll definitely end with the 'peek into advanced effect' material, but if we don't make it fully through the second app that is totally fine. I promise even so you will learn a lot about effect today. And of course all of these materials are available to you after the workshop as well.

 -->

---

# What do you need?

### [https://github.com/ethanniser/effect-workshop](https://github.com/ethanniser/effect-workshop)

- Join the channel in the Effect discord (DM Mirela if you are not)
- A way to run typescript (node or bun)
- This repo (available from my github)
- Opening in a github codespace (run `./start.sh`)

<br>

<img src="/codespace.png" class="h-32"/>

---

```yaml
layout: fact
```

## Do your best to not feel _overwhelmed_

<!--
Effect can be quite overwhelming, you go to the api reference site and start scrolling, and then you dont stop scrolling
Theres a lot, but what I want to do my best to make sure you understand right now at the start is that the learning curve is quite gentle. There are many modules and functions that you could go years using Effect and never touch.

Youd be surprised by how many little functions I didnt know existed and learned just by putting together this workshop

And to get started, you really only need to understand a few core concepts
Today I'm gonna do my best to give you a good understanding of those core concepts, and some little dips of some of the other stuff
 -->

---

 <div class="flex items-center justify-center">
  <img src="/usage_vs_complexity.png" class="h-90"/>
 </div>

---

```yaml
layout: center
class: text-center
```

# Interactivity

##### Please ask questions!

<!--
Something that is really important today is interactivity. I've planned in spots for review problems and breakouts, but I want to make sure you all feel comfortable prompting the interaction as well.

 - If you have a question or comment at any time, please ask it


** MIKE & OTHERS ARE HERE AS WELL**

with that said, let's get started
-->

---

```yaml
layout: section
```

# What is an 'Effect'?

---

# What is an 'Effect'?

<ul>
  <li>"Something brought about by a cause or agent"</li>
  <li v-click>Side effects?</li>
  <li v-click>The `Effect` type</li>
</ul>

---

```yaml
layout: quote
```

> “an `Effect` is a description of a program that is lazy and immutable”

<!--

  SNIPPET: 1-1

- what is a program?
    - a series of steps - a short javascript script maybe
    - only when we run the script through node it gets executed
- what does it mean to be lazy?
    - delaying work until its needed
    - so we delay execution of the script until we explicitly run it
    - and even when we run it some aspects are lazy right
    - we execute line by line, and exit on a uncaught error
- what does it mean to be immutable?
    - unable to be mutated
    - so our script here is immutable after we pass it to node
    - same goes for basically all languages- except Malbolge I guess lol
 -->

---

```yaml
layout: fact
```

# Functions!

---

```ts
type Function<Args, T> = (...args: Args) => T;
```

<v-click>

```ts
type SaferFunction<Args, T, E> = (...args: Args) => T | E;
```

</v-click>

<br><br>

<v-click>

```ts
declare function Foo(): "baz" | "bar" | Error;
const result = Foo();
const error = result instanceof Error;

declare function Foo2(): "baz" | "bar";
const result2 = Foo2();
const error = result2 !== "baz";
```

</v-click>

<!--
between first and second click, what might some problems be with this?
 -->

---

```ts
declare function Inner(): "baz" | "bar" | Error;

function Outer(): number | Error {
  const result = Inner();
  if (result instanceof Error) {
    return result;
  }
  return result.length;
}
```

<br>

<h2 v-click>Forced to handle errors at <b>every</b> single point, even if we don't care</h2>

<!-- looks alot like go right? -->

---

## `Effect`s are different

<br><br>

```ts
type Effect<Value, Error = never> = /* unimportant */;
```

<br>

```ts
declare const foo: Effect<number, never>;
// also the same as Effect<number>
```

<br>

```ts
declare const bar: Effect<number, Error>;
```

<!-- we come back to this later, but all those composition problems I just talked about are elegantly solved by effect just trust me for a bit -->

---

```ts
import { db } from "./db";

function getUser(id: number): User {
  return db.users.getById(id);
}
```

<br>

<v-click>

```ts
function getUser(db: DataBase, id: number): User {
  return db.users.getById(id);
}
```

</v-click>

---

```ts
function updateEmail(
  db: DataBase,
  logger: Logger,
  telemetry: Telemetry,
  id: number,
  newEmail: string
): User {
  const user = db.users.getById(id);
  db.users.updateEmail(id, newEmail);
  logger.info(`Updated email for user ${id}`);
  telemetry.record("email-updated", { id });
  return user;
}
```

---

```ts
type Effect<Value, Error = never, Requirement = never>
```

<v-clicks>

```ts
declare const getUser: Effect<User, NotFoundError, DataBase>;
```

```ts
declare const updateEmail: Effect<
  User,
  NotFoundError,
  DataBase | Logger | Telemetry
>;
```

<!-- prettier-ignore -->
```ts
const runnable: Effect<User, NotFoundError, never> = 
  provideDependencies(getUser, db);
const testable: Effect<User, NotFoundError, never> = 
  provideDependencies(getUser, mockDb);
```

</v-clicks>

---

# Sync vs Async

<br>

```ts
declare async function getUser(id: number): Promise<User>;
```

<br>
<br>

<!-- prettier-ignore -->
```ts
declare function getUser(id: number): 
  Effect<User, NotFoundError, UserRepo>;
```

<!-- when you call this function what happens, what about this function? -->

---

# Execution

```ts
const foo = () => Date.now();
```

```ts
console.log(foo); // [Function: foo]
```

```ts
console.log(foo()); // 1707076796922
```

<br>

<v-click>

```ts
const effectFoo = Effect.sync(() => Date.now());
```

```ts
console.log(effectFoo);
// { _id: 'Effect', _op: 'Sync', i0: [Function: foo] }
```

```ts
console.log(Effect.runSync(effectFoo)); // 1707076796922
```

</v-click>

---

# Creating `Effect`s

<br>

<v-click>

async, asyncEffect, asyncEither, asyncOption, die, dieMessage, dieSync, fail, failCause, failCauseSync, failSync, gen, never, none, promise, succeed, succeedNone, succeedSome, suspend, sync, unit, withClockScoped, withConsoleScoped, yieldNow

</v-click>

<v-click>

- `succeed` / `fail` for values
- `sync` / `try` for sync functions
- `promise` / `tryPromise` for async functions
- `async` for async callbacks

</v-click>

---

# Running `Effect`s

### Well we have some effects now, but they don't do anything...

<br>

<v-click>

- `runSync` for synchronous effects
- `runPromise` for asynchronous effects
- `runSyncExit` / `runPromiseExit` for geting the error as a value, instead of thrown

</v-click>

<!-- how do we pull or 'extract' the value out? -->

---

# Building up programs

- So far our programs are quite limited

```ts
const getDate = () => Date.now();
const double = (x) => x * 2;

const doubleDate = () => {
  const date = getDate();
  return double(date);
};
```

 <!-- can only create simple effects, can only run them to get values
  with functions we can compose them like this
 how do we do this in effect
  -->

---

```ts
const getDate = Effect.sync(() => Date.now());
const double = (x) => x * 2;
```

```ts
const doubleDate = Effect.sync(() => {
  const date = Effect.runSync(getDate);
  return double(date);
});
```

<br>
<br>

<v-click>

## Run `Effect`s at the **EDGES** of your program

</v-click>

<!--
Well I can tell you for sure the answer is not this
PLEASE DONT DO THIS, why...
-->

---

# Combinators!

- `map`: Transform the value of an effect
- `flatMap`: Transform the value of an effect into another effect
- `tap`: Perform a side effect without changing the value
- `all`: Merge multiple effects into a single effect

---

# Error handling

- `catchAll`: Recover from all errors
- `catchTag`: Recover from a specific error
- `mapError`: Transform the error of an effect
- `match`: Handle both cases
- `either`: Move the error into the success channel

---

# Context Management

- "Services" are functionality whos type signature is seperate from the implementation
- `Context.Tag` created a placehold for a service that can be used in an effect as if it were the real thing
- `provideService(Tag, implementation)` provides the service to the effect
- `Layer`s are programs that create services and run before effects that require them
- `provide(Tag, layer)` provides the layer to the effect

---

# Resource Management

- A `Scope` contains 'finalizers' that are run when the scope is closed
- When an Effect requires a `Scope` service it means: "I have some resources that need to be cleaned up at some point"
- Providing the `Scope` indicates where the scope should be closed
- `acquireRelease`: a helper for created scoped resources

---

# Effect Datatypes

- `Option<T>`: A value that may or may not exist
- `Either<A, E>`: A disjointed union of two types
- `Exit<A, E>`: Essentially a `Either<A, Cause<E>>`
- `Cause<E>`: The result of a computation
- `Duration`: A time interval
- `Chunk<T>`: An immutable, functional array
- `HashSet<T> / HashMap<K, V>`: Immutable, functional collections that support custom hashing and equality with `Equal` and `Hash`
- `Data`: A module for auto-implementing `Equal` and `Hash` for data

---

# Time for a break

- I know that was a lot
- After the break we'll start looking at some practical applications

---

```yaml
layout: section
```

# Part 2: Rewriting a CLI app

---

# Match

- Pattern matching allows for the handling of multiple cases in a single expression
- Can match on values or predicates
- Type level assurance that all cases are handled

---

# Schema

### A `Schema<A, I, R>` can:

- validating that `unknown` data is of type `A`
- validating that `unknown` data is of type `I`
- encoding `A` to `I`
- decoding `I` to `R`

<br>

### `Schema` is incredibly powerful

- Can model basically any data structure
- Filters
- Transforms (can be effectful)
- Pretty printing errors

---

# `@effect/platform`

- Platform _agnostic_ interfaces for common operations, with platform specific implementations
- Covers: Http (client and server), workers, file system, spawning processes, key value store, file paths, clipboard, and more

---

# `@effect/cli`

- Fully featured cli app framework for effect
- Composable and type safe args + options
- Pre-built prompts (lists, select, toggle, confirm, etc...)
- Help, wizard, and completions generation

---

# Schedule

- A `Schedule` is a description of a series of delays
- Can be used for retrying on failure, or repeating on success
- Have inputs (the output of an effect or another schedule) and outputs (depends on the schedule)
- Very composable (like everything in effect!)

---

# Config

- Reads config values from a string key to some validated type
- Can be mapped, filtered, etc.
- Any `Config` can be used just like an effect to get the value or a `ConfigError`
- Swappable backend with `ConfigProvider`

---

```yaml
layout: section
```

# Part 3: Rewriting a Web Server

---

# Ref

- A **mutable** reference to an **immutable** value
- All actions are effectful
- Useful for sharing state (there are other options if you do not want this)

---

# Stream

- A `Stream` is an Effect that may produce none, one, or many values
- "Pull" based (like an iterator)
- Has all the same properties as an `Effect`, most of the same combinators
- Must be 'ran' to produce values
- `Sink` type for more advanced and resuable consuming of streams

---

```yaml
layout: section
```

# Part 4: Peek into 'Advanced' Effect

---

 <div class="flex items-center justify-center flex-col">
 <h1>Remember...</h1>
  <img src="/usage_vs_complexity.png" class="h-80"/>
 </div>

---

# Concurrency and Fibers

<v-click>

```ts
const normalJS = () => {
  let i = 0;
  setInterval(() => console.log("i", i), 250);
  while (true) {
    i++;
  }
};
```

Why doesn't this work?
</v-click>

---

```ts
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
```

---

<div class="w-full h-full grid grid-cols-2 space-x-5">
  <div>
    <h1>Cooperative Multitasking</h1>
    <ul>
      <li v-click="1">How Javascript's event loop works</li>
      <li v-click="2">
        The main thread must first yield control before other tasks can run
      </li>
      <li v-click="3">Whether that's the stack being empty, or awaiting a promise</li>
      <li v-click="4">Tasks are litterally just a callback in a queue</li>
    </ul>
  </div>
  <div>
    <h1>Preemptive Multitasking</h1>
    <ul>
      <li v-click="5">This is how operating systems work</li>
      <li v-click="6">Tasks run as if they are the only thing running</li>
      <li v-click="7">
        A scheduler decides when to pause a task and run another
      </li>
      <li v-click="8">Tasks can be paused and resumed at any time</li>
      <li v-click="9">Tasks are thread-like things with their own stack</li>
    </ul>
  </div>
</div>

---

# Effect's Fiber Model

<v-clicks>

- Fibers (or green threads) are a lightweight in memory thread
- Fibers can be spawned in the thousands without issue
- If an Effect is a description of a program, a Fiber is a running instance of that program
- Fibers can be paused, restarted, 'awaited' to get their result, or interrupted to cancel them
- Abstracts away sync vs async (to the fiber, everything is sync!)

</v-clicks>

<!-- compare to os syscalls -->

---

# How is this possible?

<v-clicks>

- Your os technically can't even stop your cpu it has to wait for a syscall or an interrupt
- Same with Javascript, there is litterally no way to stop the main thread from whatever it is doing
- But what if we broke our program down into little, lazy, steps
- Then we could 'pause' execution by simply not executing the next step

</v-clicks>

---

```yaml
layout: center
```

# DONT BLOCK THE EXECUTOR!

(if you dont have to)

---

```ts
const program = Effect.gen(function* (_) {
  let i = 0;
  yield* _(
    Effect.suspend(() => Console.log("i", i)),
    Effect.repeat(Schedule.spaced(250)),
    Effect.fork
  );

  i = 100;
});

Effect.runPromise(program);
```

---

# Structured Concurrency

### Fibers have a parent-child relationship, and when a parent fiber completes or is interrupted, it will interrupt all of its children, and their children, and so on

<img src="/fork_join.png" />

---

```yaml
layout: center
```

<img src="/calltree.gif" />

---

# Consider the alternative (callbacks or global coroutines)

<v-clicks>

- Functions aren't 'black boxes' anymore as they can 'leak' tasks
- When a task errors, who is responible for that error?
- If a task has resources, who makes sure those get cleaned up?
- How do you stop a task from the outside (you can't)

</v-clicks>

---

# Lots of parallels to memory management

<img src="/rust_popularity.png" />

<!--
This situation actually draws a lot of parallels to manually memory management in c or c++.
You *should* be able to avoid any problems by just not messing up.
But eventually you, or a dependency you use, will forget to free some memory,
or free early leading to undefined behavior.

I think the general consensus has settled that Rust’s structured memory management solution
is something to pay attention to.

Giving memory an ‘owner’ who represents when it will be freed is a powerful concept.
What if we could apply this to concurrency tasks?
-->

---

# Escape hatches if you need them

- `forkDaemon` spawns a fiber in the top level, global scope
- `forkScoped` spawns a fiber and requires a `Scope` to be provided
- `forkIn` allows you specify a custom scope to spawn a fiber in with a `Scope`

---

# Fiber to Fiber communication

- Arguable benefits over shared state
- `Deferred` for 'one shot' channel that can error
- `Queue` standard 'channel', customizable back pressure behavior
- `PubSub` for 'publishing' to multiple 'subscribers'

---

# When do Fibers run?

- After the current fiber yields

---

# High Level Abstractions

- Working with fibers directly is often not necessary
- All combinators that operate on multiple effects have special 'concurrency' options
- All the benefits of fibers + structred concurrency in a single line

---

# Custom Schedulers

<v-clicks>

- Just like everything else, the Scheduler that controls when fibers run is customizable
- Web app: render fiber has priority, or scheduler tied to react render queue or `requestIdleCallback`
- No good default for every case, yield too much and program becomes unnecessarily slow, yield too little and the program becomes unresponsive and uncooperative

</v-clicks>

<!--
explain while true vs forever example
 -->

---

# STM

- `STM` is its own little `Effect`-like world, has most of the same combinators as Effects
- Inside an `STM` there should be **no side effects**, only logic and operating on STM data structures
- Custom `T_` versions of most common data structures
- `commit`ing an stm transaction executes it in a single opaque operation
- Either all operations go through sucessfully, or the data remains in its original state
- Requires the data inside `T_` data structures to be **immutable**

---

# Runtime and FiberRefs

- A `Runtime<R>` is a thing that can run an `Effect` to an `Exit`
- Has a `Context` of services that can be seeded with some initial services (the `R`)
- `FiberRef` is a mutable value that is local to a fiber (runtimes start with a bunch of built in ones but you can create your own)
- Defined 'fork' and 'merge' semantics
- `RuntimeFlags` ultra low level bitflags for controlling runtime behavior

---

# Telemetry and Observability

- Effect has first class support for OpenTelemetry
- Spans, Traces, and Metrics are just as composable as the rest of Effect
- If you know you need this, it should be pretty exciting
- And if not, you'll be thankful for how easy it is to add later on

---

# RPC

- Network calls as easy as calling a function
- Full client-server typesafey
- Customizable serialization and deserialization with `Schema`
- Built in HTTP adapter, but can be swapped out for anything

---

# Batching and Caching

- Define `Request`s and `RequestResolver`s for those `Request`s
- Execute request using `Effect.request`
- If a request can support batching, a special resolver can be used
- When batching is enabled, effects will wait to see if any other effects also wait on the same request and batch together
- Requests can easily be cached with a custom capcaity and TTL

---

# Performance

<v-clicks>

- Obviously Effect has some overhead
- Effect is made for **application** code, where the limitation is almost always IO anyway
- Effect actually will likely **improve** the performance of these parts of your code because of its powerful concurrency primitives (structure concurrency, interruption, worker pool abstractions)
- If you are writing CPU bound code, you could not use Effect and provide a effect wrapper, or maybe you shouldn't be using javascript at all

</v-clicks>

---

# Thanks for coming!

- Slides and code will be available on my github- please do try the 'after the workshop' additional exercises
- Feedback / Comments / Questions? Theres a feedback box on the way out. (or just dm me on twitter if your feeling a bit more direct)
- Come say hi to me tomorrow at the conference
