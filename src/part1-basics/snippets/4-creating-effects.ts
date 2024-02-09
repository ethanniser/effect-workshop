import { Effect } from "effect";

// #1. Creating effects from simple values
{
  // one: Effect<number> (Effect<number, never>, this effect will never fail)
  const one = Effect.succeed(1);

  // two: Effect<never, string> (Effect<never, string>, this effect will never succeed)
  const two = Effect.fail("two");

  // FUNCTION ARGUMENTS ARE EVALUATED EAGERLY, i.e. when the effect is created
  // ONLY VALUES, NO COMPUTATIONS OR SIDE EFFECTS

  const bad = Effect.succeed(Date.now());
  // is equivalent to
  const now = Date.now();
  const getDate = () => now;
}

// #2. Creating effects from synchronous computations
{
  // one: Effect<number> (Effect<number, never>, this effect will never fail)
  const one = Effect.sync(() => Date.now());

  // two: Effect<number> (Effect<number, never>, this effect will never fail)
  const two = Effect.sync(() => {
    console.log("side effects!");
    return 2;
  });

  const NEVER = Effect.sync(() => {
    throw new Error("will cause a defect");
  });

  // sync ASSUMES that the computation will NEVER THROW
  // if it has any chance to, use Effect.try

  // tryOne: Effect<number, UnknownException>
  const tryOne = Effect.try(() => {
    throw new Error("effect will catch this error");
    return 0;
  });

  // tryTwo: Effect<any, Error>
  const tryTwo = Effect.try({
    try: () => JSON.parse("invalid json"),
    catch: (unknownError) => new Error(`JSON parsing failed, ${unknownError}`),
  });
}

// #3. Creating effects from asynchronous computations
{
  const wait = (ms: number): Promise<string> =>
    new Promise((resolve) => setTimeout(() => resolve("resolved!"), ms));

  // one: Effect<string> (Effect<string, never>, this effect will never fail)
  const one = Effect.promise(() => wait(1000));

  // noticed how the promise 'disappears' from the type signature
  // effect hides away sync vs async, you just work with the results

  // promise ASSUMES that the computation will NEVER THROW
  // if it has any chance to, use Effect.tryPromise

  // tryOne: Effect<string, UnknownException>
  const two = Effect.tryPromise(() =>
    fetch("https://jsonplaceholder.typicode.com/todos/1")
  );

  // tryTwo: Effect<Response, Error>
  const three = Effect.tryPromise({
    try: () => fetch("https://jsonplaceholder.typicode.com/todos/1"),
    catch: (unknown) => new Error(`something went wrong ${unknown}`),
  });
}
// some async apis are not promise based, but callback based
import { readFile } from "node:fs";
{
  // readFileEffect: Effect<Buffer, NodeJS.ErrnoException>
  // type parameters are unable to be inferred, so you have to specify them
  const readFileEffect = Effect.async<Buffer, NodeJS.ErrnoException>(
    (resume) => {
      readFile("package.json", (err, data) => {
        if (err) {
          resume(Effect.fail(err));
        } else {
          resume(Effect.succeed(data));
        }
      });
    }
  );
}
