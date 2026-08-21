import { Effect, type Option, type Result, Schema, SchemaGetter, SchemaIssue, SchemaTransformation } from "effect";

/**
 * Ensuring the shape and type of the data we are working with is crucial to writing safe and maintainable code.
 * This comes most often when interacting with external data sources, such as APIs, databases, or user input.
 * There are many libraries that offer this kind of functionality, including of course Effect
 * Effects data validation and validation and transformation library is called `Schema`.
 *
 *
 * While most validation libraries only validate from `unknown` -> `T`,
 * and then maybe a one way transformation from `T` -> `U`,
 *
 *
 * Schemas are bidirectional, meaning they can transform from `T` -> `U` and `U` -> `T`,
 * as well as providing validation from unknown to either.
 *
 *
 * This feature is immensely powerful as you can describe both the
 * serialization and deserialization of your data in a single place.
 *
 *
 * A `Schema<A, I = A, R = never>` can describe:
 * - validating that `unknown` data is of type `A`
 * - validating that `unknown` data is of type `I`
 * - encoding `A` to `I`
 * - decoding `I` to `A`
 *
 *
 * The `I = A` is important because, of course, not all validations require a transformation.
 * So a `Schema<string>` is simply a schema that validates that the data is a string.
 * The `R` represents services the transformation requires (as transformations can be effectful).
 */

/**
 * Lets build a simple example schema, then see how we can use it to validate and transform data.
 */

/**
 * Here we have a simple schema that validates that the data is a string.
 */
const string = Schema.String;

/**
 * And here we have a simple schema that validates that the data is a number.
 */
const number = Schema.Number;

/**
 * Now lets build a `Schema<number, string>` that can validate and transform a string to a number.
 * In v4 we start from the encoded schema (`Schema.String`) and use `Schema.decodeTo`
 * with a transformation describing how to decode and encode the data.
 */

const NumberFromString = Schema.String.pipe(
  Schema.decodeTo(
    Schema.Number,
    SchemaTransformation.transform({
      decode: (string: string): number => Number.parseInt(string),
      encode: (number: number): string => number.toString(),
    })
  )
);

/**
 * Or we can handle errors in the transformation with `SchemaGetter.transformOrFail`.
 * Schemas don't have a 'E' type because all errors are encompassed by the `SchemaError` type.
 */
const NumberFromStringSafe = Schema.String.pipe(
  Schema.decodeTo(Schema.Number, {
    decode: SchemaGetter.transformOrFail(
      (string: string): Effect.Effect<number, SchemaIssue.Issue> =>
        Number.isNaN(Number.parseInt(string))
          ? Effect.fail(new SchemaIssue.InvalidValue())
          : Effect.succeed(Number.parseInt(string))
    ),
    encode: SchemaGetter.transform((number: number) => number.toString()),
  })
);

/**
 * It's easy to derive types from our schemas
 */
type Input = Schema.Schema.Type<typeof NumberFromString>;
type Output = Schema.Codec.Encoded<typeof NumberFromString>;

/**
 * Now lets look at how we can use this schema to validate and transform data.
 */
const takesNumber = (n: number) => n;
const takesString = (s: string) => s;
const str = "123";
const n = 132;
const unknown: unknown = n; // pretend this came from an untrusted source

/**
 * We can verify unknown is `A` (a number) with `is`
 * `is` returns `self is A` and is useful for type guards
 * (in v4 `is` checks the decoded type side only, so it accepts numbers)
 */
if (Schema.is(NumberFromString)(unknown)) {
  takesNumber(unknown);
}
/**
 * `asserts` throws an error if the data is not of type `A`
 */
{
  Schema.asserts(NumberFromString, unknown);
  takesNumber(unknown);
}

/**
 * decoding returns an `Effect<T, SchemaError, R>`
 */
const _ = Effect.gen(function* () {
  const decoded = yield* Schema.decodeEffect(NumberFromString)(str);
  takesNumber(decoded);
});

/**
 * now for transformations
 * for `A` to `I` we use `encode*`
 * and for `I` to `A` we use `decode*`
 */

/**
 * for both there are `unknown` versions that take `unknown` (`encodeUnknownSync` etc.)
 * and first validate it matches the first schema before transforming
 */

/**
 * Each of these has several variations:
 * no suffix - returns `Effect<T, SchemaError, R>`
 */
const one: Effect.Effect<string, Schema.SchemaError, never> =
  Schema.encodeEffect(NumberFromString)(n);

/**
 * `sync` - returns `T` or throws
 */
const two: string = Schema.encodeSync(NumberFromString)(n);

/**
 * `promise` - returns `Promise<T>` that rejects on failure
 */
const three: Promise<string> = Schema.encodePromise(NumberFromString)(n);

/**
 * `option` - returns `Option<T>` that is `None` if the data is invalid
 */
const four: Option.Option<string> = Schema.encodeOption(NumberFromString)(n);

/**
 * `result` - returns `Result<ParseError, T>` that is `Failure` if the data is invalid
 */
const five: Result.Result<string, Schema.SchemaError> =
  Schema.encodeResult(NumberFromString)(n);

/**
 * Again, remember that transformations can be async or effectful:
 * - just how `runSync` errors if the effect is async,
 * - `encodeSync` will error if the transformation is async
 */

/**
 * another example
 */
const date = new Date();
const toString = Schema.encodeSync(Schema.DateFromString)(date);
const fromString = Schema.decodeSync(Schema.DateFromString)(toString);
console.log(toString, fromString);

/**
 * What about one-way transformations?
 * Of course some transformations are lossy, and cannot be reversed.
 * Schemas are `encode` biased (thats why `is`/`asserts` are all for the `A` type).
 *
 * If you have a one way transformation, just make decoding always fail.
 *
 *
 * Schema is a insanely deep and powerful library, and we have only scratched the surface.
 * There are so many features and utilities that we have not even touched on.
 * As well as the tons of built in schemas for common types, patterns, and filters.
 */
