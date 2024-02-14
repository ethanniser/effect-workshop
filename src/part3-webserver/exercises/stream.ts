import { Chunk, Effect, Either, Option, Stream, identity } from "effect";
import fs from "node:fs";
import * as T from "../../testDriver";
// from event emitter
// Exercise 1
// fs.createReadStream returns a stream that emits 'open', 'data', 'end', 'error' and 'close' events.
// Create a stream that emits the 'data' events, and fails with the 'error' event.
// The fileStream should also be properly closed when the stream ends, fails or is interrupted.

// const fileStream = fs.createReadStream("test.txt");
class FileStreamError {
  constructor(public error: unknown) {}
}

const testOne: Stream.Stream<string, FileStreamError> = Stream.empty;

await T.testRunAssert(
  1,
  Stream.runFold(testOne, "", (acc, chunk) => acc + chunk),
  {
    success: "1 2 3\n4 5 6\n7 8 9\n",
  }
);

// Exercise 2

// You are given this stream of repeating, but changing, numbers:

const powersOfTwo = Stream.make(1, 1, 1, 1, 2, 2, 3, 3, 3, 5, 5, 5, 5, 7);

// Your job is to map this stream that emits a value only when it differs from the previous value.

const testTwo = powersOfTwo;

// await T.testRunAssert(
//   2,
//   Stream.runCollect(testTwo).pipe(
//     Effect.andThen((chunk) => Chunk.toArray(chunk))
//   ),
//   {
//     success: [1, 2, 3, 5, 7],
//   }
// );
