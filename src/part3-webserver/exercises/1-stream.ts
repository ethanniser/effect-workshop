import {
  Chunk,
  Console,
  Effect,
  Either,
  Option,
  Stream,
  identity,
} from "effect";
import fs from "node:fs";
import * as T from "../../testDriver";

// Exercise 1

const stream = Stream.make(1, 2, 3, 4, 5).pipe(
  Stream.tap((n) => Console.log("emitting", n))
);

const droppedStream = stream.pipe(Stream.drop(2));

Effect.runSync(Stream.runCollect(droppedStream));

// What happens when we run the stream?

// A. only 3,4,5 logged and end up in final chunk
// B. all logged but only 3,4,5 end up in final chunk
// C. all logged and all end up in final chunk

// Exercise 2
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

// Exercise 3
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
