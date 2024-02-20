import { Effect } from "effect";

const sucessfulProgram = Effect.sync(() => {
  console.log("hi!");
  return 42;
});

const failedProgram = Effect.try(() => {
  throw new Error("boom");
  return 42;
});

const asyncProgram = Effect.promise(() => Promise.resolve(42));

// just like functions, effects themselves are just values
// they don't do anything until you 'run' them

console.log(sucessfulProgram);
console.log(failedProgram);

// to run effects that are purely synchronous, use runSync
// it synchronously returns the result of the effect, or throws if the effect fails

// const result = Effect.runSync(sucessfulProgram);
// console.log("runSync result", result);

// try {
//   Effect.runSync(failedProgram);
// } catch (error) {
//   console.log("runSync error", error);
// }

// try {
//   Effect.runSync(asyncProgram);
// } catch (error) {
//   console.log("runSync async error", error);
// }

// if any part of your effect is asynchronous, you need to use runPromise
// it returns a promise that will resolve with the result of the effect,
// or reject if the effect fails

// Effect.runPromise(asyncProgram).then((result) => {
//   console.log("runPromise result", result);
// });

// Effect.runPromise(failedProgram).catch((error) => {
//   console.log("runPromise error", error);
// });

// as an alternative to simply throwing the error, the run*Exit functions
// provide a `Exit` type that represents either a success or a number of possible failure types

const exit = Effect.runSyncExit(failedProgram);
// console.log("runSyncExit", exit);
