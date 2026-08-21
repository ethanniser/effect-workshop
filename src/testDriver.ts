import assert from "node:assert";
import { Array, Console, Context, Effect, Layer, Ref, pipe } from "effect";

class TestLogs extends Context.Service<
  TestLogs,
  Ref.Ref<ReadonlyArray<unknown>>
>()("TestLogs") {
  static readonly Live = Layer.effect(
    TestLogs,
    Ref.make<ReadonlyArray<unknown>>([])
  );
}

export class Test extends Context.Service<
  Test,
  {
    logTest: (message: unknown) => Effect.Effect<void>;
    assertLogs: (expected: Array<unknown>) => Effect.Effect<void, Error>;
  }
>()("Test") {
  static readonly Live = Layer.effect(
    Test,
    Effect.gen(function* () {
      const logsRef = yield* TestLogs;
      const addLog = (message: unknown) =>
        Ref.update(logsRef, (logs) => Array.append(logs, message));

      const assertLogs = (expected: Array<unknown>) =>
        Ref.get(logsRef).pipe(
          Effect.flatMap((logs) => {
            return Effect.sync(() => assert.deepStrictEqual(logs, expected)); // defect on purpose
          })
        );

      return {
        logTest: (message: unknown) =>
          Effect.andThen(
            Console.log("Test logging: ", message),
            addLog(message)
          ),
        assertLogs,
      };
    })
  );
}

const logTest = (message: unknown) => Test.use((t) => t.logTest(message));
const assertLogs = (expected: Array<unknown>) =>
  Test.use((t) => t.assertLogs(expected));

const testLive = Layer.provide(Test.Live, TestLogs.Live);

const testRunAssert = (
  number: number,
  effect: Effect.Effect<void, any, Test>,
  expected: {
    logs?: Array<unknown>;
    success?: unknown;
    successIs?: (output: unknown) => boolean;
    failure?: unknown;
    failureIs?: (output: unknown) => boolean;
  }
) =>
  pipe(
    Console.log(`\n--- Test ${number} Start ---`),
    Effect.andThen(effect),
    Effect.tap(() => assertLogs(expected.logs ?? [])),
    Effect.tap((value) =>
      Effect.sync(() => {
        if (expected.successIs) {
          assert(expected.successIs(value));
        } else {
          expected.success && assert.deepStrictEqual(value, expected.success);
        }
        expected.failure && assert.fail("Expected failure but got success");
      })
    ),
    Effect.tapError((error) =>
      Effect.sync(() => {
        if (expected.failureIs) {
          assert(expected.failureIs(error));
        } else {
          expected.failure && assert.deepStrictEqual(error, expected.failure);
        }
        expected.success && assert.fail("Expected success but got failure");
      })
    ), // again defect on purpose
    Effect.catch((error) => Effect.succeed(error)),
    Effect.andThen(() => Console.log(`--- Test ${number} Passed ---\n`)),
    Effect.provide(testLive),
    Effect.catchCause((cause) => Console.error(cause.toString())),
    Effect.runPromise
  );

export { logTest, assertLogs, testRunAssert };
