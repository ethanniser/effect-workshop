import { ParseResult } from "@effect/schema";
import * as Schema from "@effect/schema/Schema";
import { Effect } from "effect";

// Ensuring the shape and type of the data we are working with is crucial to writing safe and maintainable code.
// This comes most often when interacting with external data sources, such as APIs, databases, or user input.
// There are many libraries that offer this kind of functionality, including of course Effect
// Effects data validation and validation and transformation library is called `Schema`.

// While most validation libraries only validate from `unknown` -> `T`,
// and then maybe a one way transformation from `T` -> `U`,

// Schemas are bidirectional, meaning they can transform from `T` -> `U` and `U` -> `T`,
// as well as providing validation from unknown to either.

// This feature is immensely powerful as you can describe both the
// serialization and deserialization of your data in a single place.

// A `Schema<A, I = A, R = never>` can describe:
// - validating that `unknown` data is of type `A`
// - validating that `unknown` data is of type `I`
// - encoding `A` to `I`
// - decoding `I` to `A`

// The `I = A` is important because of course not all validation requires a transformation.
// So a `Schema<string>` is simply a schema that validates that the data is a string.
// The `R` represents services the transformation requires (as transformations can be effectful).

// Lets build a simple example schema, then see how we can use it to validate and transform data.

const string = Schema.string;
// Here we have a simple schema that validates that the data is a string.

const number = Schema.number;
// And here we have a simple schema that validates that the data is a number.

// Now lets build a Schema<number, string> that can validate and transform a string to a number.
// Using `Schema.transform` we first give a schema for the input type, then a schema for the output type,
// Then functions to encode and decode the data.

const NumberFromString = Schema.transform(
  Schema.string,
  Schema.number,
  (string) => parseInt(string),
  (number) => number.toString()
);

// Or we can use `Schema.transformOrFail` to handle errors in the transformation.
// Schemas dont have a 'E' type because all errors are encompassed by the `ParseError` type.

const NumberFromStringSafe = Schema.transformOrFail(
  Schema.string,
  Schema.number,
  (string, _, ast) =>
    ParseResult.try({
      try: () => parseInt(string),
      catch: (error) => ParseResult.type(ast, string),
    }),
  (number) => ParseResult.succeed(number.toString())
);

// Its easy to dervice types from our schemas
type Input = Schema.Schema.To<typeof NumberFromString>;
type Output = Schema.Schema.From<typeof NumberFromString>;

// Now lets look at how we can use this schema to validate and transform data.

const takesNumber = (n: number) => n;
const takesString = (s: string) => s;
const str = "123";
const n = 132;
declare const unknown: unknown;

// We can verify unknown is `A` (a number) with `validate`, `assert`, or `is`
// `is` returns `self is A` and is useful for type guards
if (Schema.is(NumberFromString)(unknown)) {
  takesNumber(unknown);
}
// `assert` throws an error if the data is not of type `A`
{
  const assertsNumber: Schema.Schema.ToAsserts<typeof NumberFromString> =
    Schema.asserts(NumberFromString); // required for typescript reasons
  assertsNumber(unknown);
  takesNumber(unknown);
}

// `validate` returns a `Effect<boolean, ParseError, R>`

const _ = Effect.gen(function* (_) {
  if (yield* _(Schema.validate(NumberFromString)(unknown))) {
    takesNumber(unknown);
  }
});

// now for transformations
// for `A` to `I` we use `encode*`
// and for `I` to `A` we use `decode*`

// for both there are `unknown` versions that take `unknown` (`encodeUnknown*` and `decodeUnknown*`)
// and first validate it matches the first schema before transforming

// Each of these 4 has 4 variations:
// no suffix - returns `Effect<T, ParseError, R>`
const one = Schema.encode(NumberFromString)(n);
// `sync` - returns `T` or throws `ParseError`
const two = Schema.encodeSync(NumberFromString)(n);
// `promise` - returns `Promise<T>` that rejects with `ParseError`
const three = Schema.encodePromise(NumberFromString)(n);
// `option` - returns `Option<T>` that is `None` if the data is invalid
const four = Schema.encodeOption(NumberFromString)(n);
// `either` - returns `Either<ParseError, T>` that is `Left` if the data is invalid
const five = Schema.encodeEither(NumberFromString)(n);

// again remember that transformations can be async or effectful,
// just how `runSync` errors if the effect is async, `encodeSync` will error if the transformation is async

// another example
const date = new Date();
const toString = Schema.encodeSync(Schema.DateFromString)(date);
const fromString = Schema.decodeSync(Schema.DateFromString)(toString);
console.log(toString, fromString);

// What about one-way transformations?
// Of course some transformations are lossy, and cannot be reversed.
// Schemas are `encode` biased (thats why `is`/`assert`/`validate` are all for the `A` type)

// if you have a one way transformation, just make decoding always fail

// Schema is a insanely deep and powerful library, and we have only scratched the surface.
// There are so many features and utilities that we have not even touched on.
// As well as the tons of built in schemas for common types, patterns, and filters.
// It has a very long and detailed readme, with lots of examples and explanations.
// Definitely check it out: https://github.com/Effect-TS/effect/tree/main/packages/schema
