import { Effect } from "effect";

// so far our programs are quite limited
// we can only create very basic effects
// and must run them to do anything to their results

// but 'real' programs are much more complicated than that, right?
// they involve the continous transformation of data

const getDate = () => Date.now();
const double = (x: number) => x * 2;
const toString = (x: number) => x.toString();
const toUpperCase = (x: string) => x.toUpperCase();

// we can chain these functions together to create a program

const program = () => toUpperCase(toString(double(getDate())));
console.log(program());

// what is not ideal about this?
// its hard to see the flow of data, hard to read

// OO says, give the data functions to transform itself, with method syntax
class MyDate {
  value: number;
  constructor() {
    this.value = Date.now();
  }
  double() {
    return this.value * 2;
  }
}

const program2 = () => new MyDate().double().toString().toUpperCase();
console.log(program2());

// ok well its easier to read, but what problems are there now?
// lose composability because the functions are tied to the data
// cant test the functions in isolation
// and you cant tree shake the functions, matters when there are many

// so whats the solution? PIPES!
import { pipe } from "effect";

const program3 = () => pipe(getDate(), double, toString, toUpperCase);

// pipe is a function that takes a value and a list of functions
// and applies the functions to the value in order
// notice how it looks almost identical to the method syntax, but its not tied to the data

// a key distinction is that pipe functions must be unary (take one argument)
// this is because the output of one function is the input of the next
// so if a function takes more than one argument, you need to partially apply it

// back to effect now!

// we want to apply transformations to the result of an effect, without running it
// but how do we like go in and pull out the value from the effect?

{
  const getDate = Effect.sync(() => Date.now());
  const double = (x: number) => x * 2;

  const doubleDate = Effect.sync(() => {
    const date = Effect.runSync(getDate);
    return double(date);
  });

  // do NOT do this...
  // running effects should be done at the 'edges' of your program,
  // where effect must interact with the outside world

  // what about
  const doubleDate2 = pipe(getDate, double);

  // but this is not quite right, because double is not a function that takes an effect
  // to perform this transformation we can use `Effect.map`

  const doubleDate3 = Effect.map(getDate, (x) => double(x));

  // doubleDate3 is a new effect that is a program that represents:
  // 1. get the date
  // 2. apply the double function to the result of the first step
  // 3. return the result of the second step

  // so we can recreate our program in effect like this:
  const program = pipe(
    Effect.sync(() => Date.now()),
    Effect.map((x) => x * 2),
    Effect.map((x) => x.toString()),
    Effect.map((x) => x.toUpperCase())
  );

  // and then to run it
  const result = Effect.runSync(program);
}

// through combinatiors like `map`, and others I will show you in a second
// we can build up complex programs entirely as one single effect
// and then run them at the end

// also notice the two overloads of `map`,
// effect allows to use them on their own, or in a pipe easily
// this is the case for nearly all combinators in effect

{
  const divide = (a: number, b: number): Effect.Effect<number, Error> =>
    b === 0
      ? Effect.fail(new Error("Cannot divide by zero"))
      : Effect.succeed(a / b);

  const program = pipe(
    Effect.succeed([25, 5] as const),
    Effect.map(([a, b]) => divide(a, b))
  );

  // now lets map with a function that returns an effect itself
  // oh wait, Effect<Effect<number, Error>> is not what we want
  // we need something that will 'flatten' the nested effects

  const program2 = pipe(
    Effect.succeed([25, 5] as const),
    Effect.flatMap(([a, b]) => divide(a, b))
  );

  // much better
  // to help understand this consider the bash command `ls | grep .ts`
  // `ls` is itself a program that outputs some text
  // `grep` is a program that takes text and outputs a subset of it
  // the `|` operator is like `flatMap` in effect
  // it takes the output of the first program and feeds it into the second
  // and the result, `ls | grep .ts` itself is a program that
  // represents the entire sequence of operations
}

{
  const program = pipe(
    Effect.sync(() => Date.now()),
    Effect.map((x) => x * 2),
    Effect.map((x) => x.toString()),
    Effect.map((x) => x.toUpperCase())
  );

  // lets take a look at this program again
  // if we wanted to log the result of some step, how would we do that?

  const program2 = pipe(
    Effect.sync(() => Date.now()),
    Effect.map((x) => x * 2),
    Effect.map((x) => {
      console.log(x);
      return x;
    }),
    Effect.map((x) => x.toString()),
    Effect.map((x) => x.toUpperCase())
  );

  // we have to return the value, so that it can be passed to the next step
  // but this is not ideal, because we are not actually transforming the value
  // so the next combinator we will look at is `Effect.tap`
  // its basically `Effect.map` but the value of the resulting effect is not transformed

  const program3 = pipe(
    Effect.sync(() => Date.now()),
    Effect.map((x) => x * 2),
    Effect.tap((x) => console.log(x)),
    // even though ^^ returns void, the value is still passed to the next step
    Effect.map((x) => x.toString()),
    Effect.map((x) => x.toUpperCase())
  );

  // finally we have `Effect.all`
  // it takes an array of effects and returns an effect of an array of their results

  const getDate = Effect.sync(() => Date.now());
  const yesterday = Effect.sync(() => Date.now() - 24 * 60 * 60 * 1000);
  const program4 = pipe(
    Effect.all([getDate, yesterday]),
    Effect.map(([x, y]) => x + y)
  );

  // something cool about `Effect.all` is that you can also pass an object where the values are effects
  // and it will return an effect of an object of their results
  const program5 = pipe(
    Effect.all({ x: getDate, y: yesterday }),
    Effect.map(({ x, y }) => x + y)
  );
}

// finally, we are going to look at Effect generators
// they are an alternate way to build up and compose effects
