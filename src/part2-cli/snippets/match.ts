import { Match } from "effect";

// Pattern matching is a powerful pattern that allows handling multiple 'cases' in a single expression.
// It is similar to switch statements in JavaScript but more powerful and flexible.

// To stress again, pattern matching is an expression, not a statement. This means that it can be used as a value.
// It is essentially a better version of a switch statement inside a IIFE

// There are two types of 'matches', but they are both basically the same thing.
// The first defines a matcher that takes in some type and can be used multiple times
// The second is a one-time matcher that is used to match a single value. (basically the first but used immediately)

type Input =
  | { readonly _tag: "A"; readonly a: number }
  | { readonly _tag: "B"; readonly b: boolean }
  | { readonly _tag: "C"; readonly c: number | string };

declare const input: Input;

const match = Match.type<Input>().pipe(
  Match.when({ _tag: "A" }, (a) => `A: ${a.a}`),
  Match.when({ _tag: "B" }, (b) => `B: ${b.b}`)
);

// As you can see we can create match arms with the `Match.when` method.
// "when" the value matches the pattern, the function will be called with the value.

// You can also match again boolean expressions and types

const match2 = Match.type<Input>().pipe(
  Match.when({ _tag: "A", a: (n) => n > 10 }, (a) => `A > 10: ${a.a}`),
  Match.when({ _tag: "A" }, (a) => `A < 10: ${a.a}`),
  Match.when({ c: Match.string }, (c) => `C is a string: ${c.c}`)
);

// Also possible is 'not'

const match3 = Match.type<Input>().pipe(
  Match.not({ _tag: "A" }, (bOrC) => `Not A: ${bOrC}`)
);

// and a shortcut for tag matching

const match4 = Match.type<Input>().pipe(
  Match.tag("A", (a) => `A: ${a.a}`),
  Match.tag("B", (b) => `B: ${b.b}`),
  Match.tag("C", (c) => `C: ${c.c}`)
);

// notice that if you try to use these matches, youll get an error:
// match(input);

// This is because after you define all match arms, you must 'transform' the match by specifying
// its behavior when no match is found. There are a few options for this:

// The first is `Match.exhaustive` which ensure on a type level that all cases are handled

const match5 = Match.type<Input>().pipe(
  Match.tag("A", (a) => `A: ${a.a}`),
  Match.tag("B", (b) => `B: ${b.b}`)
  //   Match.exhaustive // error
);

const match6 = Match.type<Input>().pipe(
  Match.tag("A", (a) => `A: ${a.a}`),
  Match.tag("B", (b) => `B: ${b.b}`),
  Match.tag("C", (c) => `C: ${c.c}`),
  Match.exhaustive // ok!
);

const result = match6(input);

// If you want to leave some cases unhandled you have three options

// Match.orElse provides a default value

const match7 = Match.type<Input>().pipe(
  Match.tag("A", (a) => `A: ${a.a}`),
  Match.tag("B", (b) => `B: ${b.b}`),
  Match.orElse(() => "No match found")
);

const result2 = match7(input);

// In the case where your match truly is exhaustive, but this cannot be asserted on a type level
// you can use `Match.orElseAbsurd` which throws an error if no match is found

// Match.option provides an option, which is `None` if no match is found

const match8 = Match.type<Input>().pipe(
  Match.tag("A", (a) => `A: ${a.a}`),
  Match.tag("B", (b) => `B: ${b.b}`),
  Match.option
);

const result3 = match8(input);

// Finally Match.either is similar to option but provides the leftover value instead of None

const match9 = Match.type<Input>().pipe(
  Match.tag("A", (a) => `A: ${a.a}`),
  Match.tag("B", (b) => `B: ${b.b}`),
  Match.either
);

const result4 = match9(input);
