import { Console, Effect, Exit, Scope, pipe } from "effect";

// Often in programming we have resources that are 'scoped' to some lifetime
// They often have an explicit 'acquire' and 'release' phase
// Recently typescript introduced the 'using' keyword to help with this
// But its limited as you dont have very fine control over the lifetime of the resource
// it always releases at the end of the block

// Effect has a way to manage resources in a more fine grained way with the `Scope` type

// Think of a `Scope` as a array of effects that run when the scope is closed
// unlike basically everything else in effect, scopes are mutable!
// but it makes sense, because we have to be able to add to them after the scope is created

const one = Effect.gen(function* (_) {
  const scope = yield* _(Scope.make());
  yield* _(Scope.addFinalizer(scope, Console.log("Finalizer 1")));
  yield* _(Scope.addFinalizer(scope, Console.log("Finalizer 2")));
  yield* _(Scope.close(scope, Exit.succeed("scope closed")));
});

Effect.runSync(one);

// Working with scopes manually like this is very uncommon though
// Effect has many higher level abstractions for managing resources
// For resources that only have a 'release' phase, we can use `addFinalizer`

const two = Effect.gen(function* (_) {
  yield* _(Effect.addFinalizer(() => Console.log("Last!")));
  yield* _(Console.log("First"));
});

// notice the error though, the 'scope' is present as a service requirement
// Effect.runSync(two);

// what this represents is where the scope it to be closed
// when we 'provide' a scope service, we are defining the lifetime of the scope
// the most common way to do this is with `Effect.scoped`

const three = Effect.scoped(two);

Effect.runSync(three);

// look what happens if we move where we provide the scope
const four = Effect.gen(function* (_) {
  yield* _(
    Effect.addFinalizer(() => Console.log("Last!")),
    Effect.scoped
  );
  yield* _(Console.log("First"));
});

Effect.runSync(four);

// For resources that have an 'acquire' and 'release' phase, we can use `acquireRelease`
import fs from "fs/promises";

const acquire = Effect.tryPromise({
  try: () => fs.open("1-what-is-a-program.js", "r"),
  catch: (e) => new Error("Failed to open file"),
}).pipe(Effect.zipLeft(Console.log("File opened")));

const release = (file: fs.FileHandle) =>
  Effect.promise(() => file.close()).pipe(
    Effect.zipLeft(Console.log("File closed"))
  );

const file = Effect.acquireRelease(acquire, release);

// file is now a effect that suceeds with the file,
// and requires a scope that determines when it will be closed

const useFile = (file: fs.FileHandle) => Console.log(`Using File: ${file.fd}`);

const program = file.pipe(
  Effect.flatMap((file) => useFile(file)),
  Effect.scoped
);

await Effect.runPromise(program);

// if you dont need to use the resource outside of one specific context
// you can simply things with `acquireUseRelease`

const program2 = Effect.acquireUseRelease(acquire, useFile, release);

await Effect.runPromise(program2);

// This ensures you dont accidentally use the resource outside of the scope
// Which is possible if you close the scope too early
console.log("\n\n --- \n\n");
const program3 = Effect.gen(function* (_) {
  const handle = yield* _(file);
  yield* _(Console.log("Using file"));
  yield* _(
    Effect.tryPromise(() => handle.readFile()),
    Effect.andThen((buf) => Console.log(buf.toString()))
  );
}).pipe(Effect.scoped); // scope closed after all usages are finished- ok!

await Effect.runPromise(program3);

console.log("\n\n --- \n\n");
const program4 = Effect.gen(function* (_) {
  const handle = yield* _(file, Effect.scoped); // scope closed, but resource is still used- no type error! scary!
  yield* _(Console.log("Using file"));
  yield* _(
    Effect.tryPromise(() => handle.readFile()),
    Effect.andThen((buf) => Console.log(buf.toString()))
  );
});

// await Effect.runPromise(program4);
