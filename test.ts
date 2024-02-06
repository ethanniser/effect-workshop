import { Console, Effect, pipe } from "effect";

const f1 = (): Promise<string> => {
  throw new Error("thrown");
};

const f2 = (): Promise<string> => Promise.reject(new Error("rejected"));

// await Effect.runPromise(Effect.tryPromise(f1));

const message = await Effect.runPromiseExit(Effect.tryPromise(f2));
console.log(message);
