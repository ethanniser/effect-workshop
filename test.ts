import { Console, Effect, Scope, pipe } from "effect";

// Exercise 1
// Write an that models the acquisition and release of this mock file
// it should match the existing declaration

class MockFile {
  private status: "open" | "closed" = "open";
  constructor(public readonly fd: number) {}
  static readonly open = (fd: number) =>
    pipe(
      Console.log(`open ${fd}`),
      Effect.andThen(() => new MockFile(fd))
    );
  public close = Effect.suspend(() =>
    Effect.sync(() => (this.status = "closed")).pipe(
      Effect.andThen(Console.log(`close ${this.fd}`))
    )
  );
  public read = Effect.suspend(() =>
    this.status === "open"
      ? Effect.succeed("data")
      : Effect.fail("file is closed!")
  );
}

const file = (fd: number) =>
  Effect.acquireRelease(MockFile.open(fd), (file) => file.close);

const test1 = Effect.gen(function* (_) {
  const file1 = yield* _(file(1), Effect.scoped);
  const file2 = yield* _(file(2), Effect.scoped);
  const data1 = yield* _(file1.read);
  const data2 = yield* _(file2.read);
  console.log(data1, data2);
});

Effect.runPromise(test1);
