import { Effect, type Scope, pipe } from "effect";
import * as T from "../../testDriver.ts";

/**
 * # Exercise 1:
 *
 * Write an effect that models the acquisition and release of this mock file;
 * it should match the existing declaration
 */

class MockFile {
  public readonly fd: number;
  public close = Effect.suspend(() => T.logTest(`close ${this.fd}`));

  constructor(fd: number) {
    this.fd = fd;
  }

  static readonly open = (fd: number) =>
    pipe(
      T.logTest(`open ${fd}`),
      Effect.andThen(Effect.succeed(new MockFile(fd)))
    );
}

declare const file: (fd: number) => Effect.Effect<number, never, Scope.Scope>;

const test1 = Effect.gen(function* () {
  const file1 = yield* file(1);
  const file2 = yield* file(2);
}).pipe(Effect.scoped);

await T.testRunAssert(1, test1, {
  logs: ["open 1", "open 2", "close 2", "close 1"],
});

/**
 * # Exercise 2:
 *
 * In the first example, both of the scopes from both file1 and file2 are 'merged' into one;
 * Your challenge is to close `file1` first, and before `file2` closes, log "hi!"
 */

const test2 = Effect.gen(function* () {
  const file1 = yield* file(1);
  const file2 = yield* file(2);
  yield* T.logTest("hi!");
}).pipe(Effect.scoped);

/* uncomment after you finish exercise 1 */

// await T.testRunAssert(2, test2, {
// 	logs: ['open 1', 'open 2', 'close 1', 'hi!', 'close 2'],
// });
