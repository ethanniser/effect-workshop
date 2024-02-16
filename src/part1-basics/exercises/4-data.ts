import { Effect, Equal, HashSet, Hash, Data, Brand } from "effect";
import assert from "node:assert";

// Exercise 1
// implement equals and hash for the Transaction class
class Transaction implements Equal.Equal, Hash.Hash {
  constructor(
    public readonly id: string,
    public readonly amount: number,
    public readonly time: Date
  ) {}
}

assert(
  Equal.equals(
    new Transaction("1", 1, new Date(3)),
    new Transaction("1", 1, new Date(3))
  )
);

assert(
  Hash.hash(new Transaction("1", 1, new Date(3))) ===
    Hash.hash(new Transaction("1", 1, new Date(3)))
);

// Exercise 2
// Create a datatype for a string that has been guaranteed to be only ascii

type ASCIIString = never;

function takesOnlyAscii(s: ASCIIString) {
  // ...
}

const string1: ASCIIString = "hello";
const string2: ASCIIString = "hello🌍";

takesOnlyAscii(string1);
takesOnlyAscii(string2);
