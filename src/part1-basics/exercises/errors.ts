import { Effect } from "effect";
import * as T from "../../testDriver";

// Exercise 1
// Come up with a way to run this effect until it succeeds, no matter how many times it fails

let i = 0;
const eventuallySuceeds = Effect.suspend(() =>
  i++ < 100 ? Effect.fail("error") : Effect.succeed(5)
);

const testOne = eventuallySuceeds;

T.testRunAssert(testOne, { success: 5 });

// Exercise 2
// Instead of short circuiting on the first error, collect all errors and fail with an array of them

const _ = Effect.all(
  [Effect.fail("error 1"), Effect.fail("error 2"), Effect.succeed(5)],
  {
    mode: "validate",
  }
);

// Exercise 3
// Now succeed with both a array of success values and an array of errors
