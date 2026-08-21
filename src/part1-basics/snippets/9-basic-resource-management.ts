import { Console, Effect, Exit, Scope, pipe } from "effect";

/**
 * Often in programming, we have resources that are 'scoped' to some lifetime.
 * They often have an explicit
 * - 'acquire' and
 * - 'release' phase
 *
 * Recently TypeScript introduced the 'using' keyword to help with this
 * But it's limited as you don't have very fine control over the lifetime of the resource:
 * It always releases at the end of the block
 * ___
 *
 * Effect has a way to manage resources in a more fine-grained way with the `Scope` type.
 *
 * Think of a `Scope` as an array of effects that run when the scope is closed;
 *
 * Note:
 * Unlike basically everything else in effect, scopes are mutable!
 * But it makes sense, because we have to be able to add to them after the scope is created
 */

const one = Effect.gen(function* () {
  const scope = yield* pipe(Scope.make());
  yield* Scope.addFinalizer(scope, Console.log("Finalizer 1"));
  yield* Scope.addFinalizer(scope, Console.log("Finalizer 2"));
  yield* Scope.close(scope, Exit.succeed("scope closed"));
});

Effect.runSync(one);

/**
 * Working with scopes manually like this is very uncommon!
 *
 * Effect provides many higher level abstractions for managing resources:
 *
 * For resources that only have a 'release' phase, we can use `addFinalizer`
 */

const two: Effect.Effect<void, never, Scope.Scope> = Effect.gen(function* () {
  yield* Effect.addFinalizer(() => Console.log("Last!"));
  yield* Console.log("First");
});
/**
 * notice the error though, the 'scope' is present as a service requirement
 */

// Effect.runSync(two);

/**
 * What this represents is where the scope it to be closed
 * when we 'provide' a scope service, we are defining the lifetime of the scope
 * the most common way to do this is with `Effect.scoped`
 */
const three = Effect.scoped(two);

Effect.runSync(three);

/**
 * look what happens if we move where we provide the scope
 */
const four = Effect.gen(function* () {
  yield* pipe(
    Effect.addFinalizer(() => Console.log("Last!")),
    Effect.scoped
  );
  yield* Console.log("First");
});

Effect.runSync(four);

/**
 * For resources that have an 'acquire' and 'release' phase, we can use `acquireRelease`
 */
import fs from "node:fs/promises";

const acquire = Effect.tryPromise({
  try: () => fs.open(new URL("./1-what-is-a-program.js", import.meta.url), "r"),
  catch: (e) => new Error("Failed to open file"),
}).pipe(Effect.tap(() => Console.log("File opened")));

const release = (file: fs.FileHandle) =>
  Effect.promise(() => file.close()).pipe(
    Effect.tap(() => Console.log("File closed"))
  );

const file = Effect.acquireRelease(acquire, release);

/**
 * file is now an effect that succeeds with the file,
 * and requires a scope that determines when it will be closed
 */

const useFile = (file: fs.FileHandle) => Console.log(`Using File: ${file.fd}`);

const program = file.pipe(
  Effect.flatMap((file) => useFile(file)),
  Effect.scoped
);

await Effect.runPromise(program);

/**
 * if you don't need to use the resource outside of one specific context,
 * you can simply things with `acquireUseRelease`
 */

const program2 = Effect.acquireUseRelease(acquire, useFile, release);

await Effect.runPromise(program2);

/**
 * This ensures you don't accidentally use the resource outside of the scope
 * Which is possible if you close the scope too early
 */
console.log("\n\n --- \n\n");
const program3 = Effect.gen(function* () {
  const handle = yield* file;
  yield* Console.log("Using file");
  yield* pipe(
    Effect.tryPromise(() => handle.readFile()),
    Effect.andThen((buf) => Console.log(buf.toString()))
  );
}).pipe(Effect.scoped); // scope closed after all usages are finished- ok!

await Effect.runPromise(program3);

console.log("\n\n --- \n\n");
const program4 = Effect.gen(function* () {
  const handle = yield* pipe(file, Effect.scoped); // scope closed, but resource is still used- no type error! scary!
  yield* Console.log("Using file");
  yield* pipe(
    Effect.tryPromise(() => handle.readFile()),
    Effect.andThen((buf) => Console.log(buf.toString()))
  );
});

// await Effect.runPromise(program4);
