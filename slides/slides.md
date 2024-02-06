---
theme: default
title: Effect Beginner/Intermediate Workshop
author: Ethan Niser
lineNumbers: false
record: false
highlighter: shikiji
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
  <img src="https://assets-global.website-files.com/65001a5c49ae13d89bb13849/659aaccb97095198128858fd_effect-days-white.svg" class="h-8">
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

---

```yaml
layout: fact
```

## Do your best to not feel _overwhelmed_

<!--
Effect can be quite overwhelming, you go to the api reference site and start scrolling, and then you dont stop scrolling
Theres a lot, but what I want to do my best to make sure you understand right now at the start is that the learning curve is quite gentle. There are many modules and functions that you could go years using Effect and never touch.

And to get started, you really only need to understand a few core concepts
Today I'm gonna do my best to give you a good understanding of those core concepts, and some little dips of some of the other stuff
 -->

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

```ts
function getUser(db: DataBase, id: number): User {
  return db.users.getById(id);
}
```

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

---

# Sync vs Async

```ts
declare async function getUser(id: number): Promise<User>;
```

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

---

# Creating `Effect`s
