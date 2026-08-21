import { Array, Effect, Result } from "effect";
import * as T from "../../testDriver.ts";

/**
 * # Exercise 1:
 *
 * Come up with a way to run this effect until it succeeds, no matter how many times it fails!
 */

let i = 0;
const eventuallySucceeds = Effect.suspend(() =>
  i++ < 100 ? Effect.fail("error") : Effect.succeed(5)
);

const testOne = eventuallySucceeds;

await T.testRunAssert(1, testOne, { success: 5 });

/**
 * # Exercise 2
 *
 * Instead of short-circuiting on the first error, collect all errors, and fail with an array of them
 */

const maybeFail = (j: number) =>
  j % 2 !== 0 ? Effect.fail(`odd ${j}`) : Effect.succeed(j);
const maybeFailArr = Array.allocate<number>(10)
  .fill(0)
  .map((_, index) => index + 1)
  .map((number) => maybeFail(number));

const testTwo = Effect.all(maybeFailArr);

// await T.testRunAssert(2, testTwo, {
//   failure: ["odd 1", "odd 3", "odd 5", "odd 7", "odd 9"],
// });

/**
 * # Exercise 3:
 *
 * Now `succeed` with both an array of success values and an array of errors
 */

const testThree = Effect.all(maybeFailArr);

// await T.testRunAssert(3, testThree, {
//   success: {
//     success: [2, 4, 6, 8, 10],
//     failure: ["odd 1", "odd 3", "odd 5", "odd 7", "odd 9"],
//   },
// });
