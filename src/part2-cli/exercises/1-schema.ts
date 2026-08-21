import { Schema, SchemaIssue, type Types } from "effect";

import * as T from "../../testDriver.ts";

type A = {
  readonly bool: boolean;
  readonly num: number;
  readonly str: string;
  readonly sym: symbol;
};
type B = "a" | "b" | "c";
type C = {
  readonly code: `${B}-${B}-${number}`;
  readonly data: readonly [ReadonlyArray<A>, keyof A];
};
type D = {
  readonly value: string;
  readonly next: D | null;
};
type E = {
  readonly ab: A | B;
  readonly partial: Partial<A>;
};

/**
 * # Exercise 1:
 *
 * Make a schema that parses to each of the following types
 */
const A = Schema.Never;
const B = Schema.Never;
const C = Schema.Never;
const D = Schema.Never;
const E = Schema.Never;

type AllTrue<T extends boolean[]> = T extends [infer First, ...infer Rest]
  ? First extends true
    ? Rest extends boolean[]
      ? AllTrue<Rest>
      : never
    : false
  : true;

type TestA = Types.Equals<A, Schema.Schema.Type<typeof A>>;
type TestB = Types.Equals<B, Schema.Schema.Type<typeof B>>;
type TestC = Types.Equals<C, Schema.Schema.Type<typeof C>>;
type TestD = Types.Equals<D, Schema.Schema.Type<typeof D>>;
type TestE = Types.Equals<E, Schema.Schema.Type<typeof E>>;

/**
 * Test: expect `AllTests` to be true!
 */
type AllTests = AllTrue<[TestA, TestB, TestC, TestD, TestE]>;
//  	^?

/**
 *  # Exercise 2:
 *
 * First write a schema that transforms a string to a `URL` (I've provide a URL schema for you)
 * if you can: consider how to handle the URL constructor throwing an error
 */

const URLSchema = Schema.declare((input): input is URL => input instanceof URL);

const URLFromString: Schema.Codec<URL, string> = Schema.Any;

/**
 * Now write a schema that filters out URLs that are not https
 */
const IsHttps: Schema.Codec<URL, URL> = Schema.Any;

/**
 * Now using those, create a schema that can decode a string and asserts that it is a valid https URL
 */
const HttpsURL: Schema.Codec<URL, string> = Schema.Any;

const goodInput = "https://example.com";
const badInput = "http://example.com";
const reallyBadInput = "not a url";

const testOne = Schema.decodeEffect(HttpsURL)(goodInput);
const testTwo = Schema.decodeEffect(HttpsURL)(badInput);
const testThree = Schema.decodeEffect(HttpsURL)(reallyBadInput);

await T.testRunAssert(1, testOne, {
  successIs: (url) => url instanceof URL,
});

await T.testRunAssert(2, testTwo, {
  failureIs: (error) =>
    error instanceof Error && SchemaIssue.isIssue(error.cause),
});

await T.testRunAssert(3, testThree, {
  failureIs: (error) =>
    error instanceof Error && SchemaIssue.isIssue(error.cause),
});
