import { Chunk, Console, Context, Effect, Layer, Ref, pipe } from "effect";
import assert from "assert";

class TestLogs extends Context.Tag("TestLogs")<
  TestLogs,
  Ref.Ref<Array<unknown>>
>() {
  static Live = Layer.effect(TestLogs, Ref.make<Array<unknown>>([]));
}

class Test extends Context.Tag("Test")<
  Test,
  {
    logTest: (message: unknown) => Effect.Effect<void>;
    assertLogs: (expected: Array<unknown>) => Effect.Effect<void, Error>;
  }
>() {
  static Live = Layer.effect(
    Test,
    Effect.gen(function* (_) {
      const logsRef = yield* _(TestLogs);
      const addLog = (message: unknown) =>
        Ref.update(logsRef, (logs) => [...logs, message]);

      const assertLogs = (expected: Array<unknown>) =>
        Ref.get(logsRef).pipe(
          Effect.flatMap((logs) => {
            // if (Equal.equals(logs, expected)) {
            //   return Effect.unit;
            // } else {
            //   return Effect.fail(new Error("Logs do not match"));
            // }
            return Effect.try({
              try: () => assert.deepStrictEqual(logs, expected),
              catch: (e) =>
                e instanceof Error ? e : new Error("Logs do not match"),
            });
          })
        );

      return {
        logTest: (message: unknown) =>
          Effect.zipRight(
            Console.log("Test logging: ", message),
            addLog(message)
          ),
        assertLogs,
      };
    })
  );
}

const { logTest, assertLogs } = Effect.serviceFunctions(Test);
const testLive = Layer.provide(Test.Live, TestLogs.Live);

const testRunAssert = (
  effect: Effect.Effect<void, any, Test>,
  expected: Array<unknown>
) =>
  pipe(
    effect,
    Effect.zipRight(assertLogs(expected)),
    Effect.provide(testLive),
    Effect.catchAllCause((cause) => Console.error(cause.toString())),
    Effect.runFork
  );

const file = (fd: number) =>
  Effect.acquireRelease(logTest(`open ${fd}`), () => logTest(`close ${fd}`));

// scope exercise with extending scopes
// Exercise 2
// In this example both of the 'scopes' from both file1 and file2 are combined into one
const twoExample = Effect.gen(function* (_) {
  const file1 = yield* _(file(1));
  const file2 = yield* _(file(2));
}).pipe(Effect.scoped);

testRunAssert(twoExample, ["open 1", "open 2", "close 2", "close 1"]);

// Your challenge is to close file1 first, and before file2 closes, log "hi!"

const twoYourSolution = Effect.gen(function* (_) {
  const file1 = yield* _(file(1));
  const file2 = yield* _(file(2));
  yield* _(logTest("hi!"));
}).pipe(Effect.scoped);

testRunAssert(twoYourSolution, [
  "open 1",
  "open 2",
  "close 1",
  "hi!",
  "close 2",
]);
