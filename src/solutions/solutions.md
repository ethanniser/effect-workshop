# Part 1

## Scope

### Exercise 1

```ts
const file = (fd: number) =>
  Effect.acquireRelease(MockFile.open(fd), (file) => file.close);
```

Using `Effect.acquireRelease` we can create a resource with a finalizer attached to the scope of the returned effect

### Exercise 2

```ts
const test2 = Effect.gen(function* (_) {
  const scope1 = yield* _(Scope.make());
  const scope2 = yield* _(Scope.make());

  const file1 = yield* _(file(1), Scope.extend(scope1));
  const file2 = yield* _(file(2), Scope.extend(scope2));

  yield* _(Scope.close(scope1, Exit.unit));
  yield* _(T.logTest("hi!"));
  yield* _(Scope.close(scope2, Exit.unit));
});
```

`Scope.extend` mutates an existing scope to include all finalizers from a given effect. We use this to keep the two file finalizers seperate. Then, with `Scope.close` we manually close the scopes.

## Context

### Exercise 1

```ts
const test1 = Effect.gen(function* (_) {
  const context = yield* _(Effect.context<Foo>());
  const foo = Context.get(context, Foo);
  return foo.bar;
});
```

`Effect.context` returns the current context. Then `Context.get` is used to extract the value of the context.

### Exercise 2

#### Manual Solution

```ts
const nextInt = Random.pipe(Effect.andThen((_) => _.nextInt));
const nextBool = Random.pipe(Effect.andThen((_) => _.nextBool));
const nextIntBetween = (min: number, max: number) =>
  Random.pipe(Effect.andThen((_) => _.nextIntBetween(min, max)));
```

#### Built-in Solution

```ts
const {
  constants: { nextInt, nextBool },
  functions: { nextIntBetween },
} = Effect.serviceMembers(Random);
```

_also_

```ts
const { nextInt, nextBool } = Effect.serviceConstants(Random);
const { nextIntBetween } = Effect.serviceFunctions(Random);
```

`Effect.service*` functions provide a convenient way to access parts of a service without having to manually get the service first.

## Errors

### Exercise 1

#### Recursive Solution

```ts
const testOne: Effect.Effect<number> = Effect.suspend(() =>
  Effect.matchEffect(eventuallySuceeds, {
    onSuccess: (_) => Effect.succeed(_),
    onFailure: () => testOne,
  })
);
```

#### Schedule Solution

```ts
const testOne = Effect.retry(eventuallySuceeds, { times: Infinity });
// or
const testOne = Effect.retry(eventuallySuceeds, { while: () => true });
// or
const testOne = Effect.retry(eventuallySuceeds, Schedule.forever);
```

#### Convient Solution

```ts
const testOne = Effect.eventually(eventuallySuceeds);
```

### Exercise 2

```ts
const testTwo = Effect.all(maybeFailArr, {
  mode: "validate",
}).pipe(
  Effect.mapError((errors) => errors.filter(Option.isSome).map((_) => _.value))
);
```

We can use the `validate` mode to collect all errors, then map to remove the `None`'s (representing effects that did not fail)

### Exercise 3

```ts
const testThree = Effect.all(maybeFailArr, { mode: "either" }).pipe(
  Effect.andThen((result) => ({
    success: result.filter(Either.isRight).map((_) => _.right),
    failure: result.filter(Either.isLeft).map((_) => _.left),
  }))
);
```

We can use the `either` mode to get all results of all effects, then filter to get sucesses and failures

## Data

### Exercise 1

```ts
class Transaction implements Equal.Equal, Hash.Hash {
  constructor(
    public readonly id: string,
    public readonly amount: number,
    public readonly time: Date
  ) {}

  [Equal.symbol](that: unknown) {
    return (
      that instanceof Transaction &&
      this.id === that.id &&
      this.amount === that.amount &&
      this.time.getTime() === that.time.getTime()
    );
  }

  [Hash.symbol]() {
    return pipe(
      Hash.string(this.id),
      Hash.combine(Hash.number(this.amount)),
      Hash.combine(Hash.number(this.time.getTime()))
    );
  }
}
```

These implementations are really up to you, but this is one way

### Exercise 2

#### With a tagged object

```ts
class ASCIIString extends Data.TaggedClass("ASCIIString")<{
  readonly self: string;
}> {
  static of(self: string): ASCIIString {
    if (/^[\x00-\x7F]*$/.test(self)) {
      return new ASCIIString({ self });
    } else {
      throw new Error("Not an ASCII string");
    }
  }
}

const string1 = ASCIIString.of("hello");
const string2 = ASCIIString.of("hello🌍");
```

Using `Data.TaggedClass` we can create a type with a custom constructor and equal and hash implementations in one place.

#### With a brand

```ts
type ASCIIString = string & Brand.Brand<"ASCIIString">;

const ASCIIString = Brand.refined<ASCIIString>(
  (s) => /^[\x00-\x7F]*$/.test(s),
  (s) => Brand.error(`${s} is not ASCII`)
);

const string1 = ASCIIString("hello");
const string2 = ASCIIString("hello🌍");
```

If we want to avoid the overhead of a object, we can 'brand' a type. Using `Brand.refined` we can create a constructor

# Part 2

## Schema

### Exercise 1

```ts
const A = S.struct({
  bool: S.boolean,
  num: S.number,
  str: S.string,
  sym: S.symbol,
});
const B = S.literal("a", "b", "c");
const C = S.struct({
  code: S.templateLiteral(B, S.literal("-"), B, S.literal("-"), S.number),
  data: S.tuple(S.array(A), S.keyof(A)),
});
const D: S.Schema<D> = S.struct({
  value: S.string,
  next: S.nullable(S.suspend(() => D)),
});
const E = S.struct({
  ab: S.union(A, B),
  partial: S.partial(A),
});
```

### Exercise 2

```ts
const URLFromString = S.transformOrFail(
  S.string,
  URLSchema,
  (string, _, ast) =>
    ParseResult.try({
      try: () => new URL(string),
      catch: (e) =>
        ParseResult.type(
          ast,
          string,
          e instanceof Error ? e.message : undefined
        ),
    }),
  (url) => ParseResult.succeed(url.toString())
);

const IsHttps = URLSchema.pipe(S.filter((url) => url.protocol === "https:"));

const HttpsURL = S.compose(URLFromString, IsHttps);
```

Using `transformOrFail` we can create a transformation that could error. `ParseResult.try` makes it easy to work with functions that could throw errors. `ParseResult.type` is used to create a parse result with a custom error message.
`S.filter` is used to filter out values that don't match a predicate.

Finally, `S.compose` is used to compose two schemas together.

# Part 3

## Stream

### Exercise 1

```ts
const stream = Stream.make(1, 2, 3, 4, 5).pipe(
  Stream.tap((n) => Console.log("emitting", n))
);

const droppedStream = stream.pipe(Stream.drop(2));
```

The answer is 'B'. `Stream.drop` ignores the first `n` elements of a stream, but any side effects will still be executed.

### Exercise 2

#### With `Stream.asyncInterrupt`

```ts
const testOne = Stream.asyncInterrupt<string, FileStreamError>((emit) => {
  const fileStream = fs.createReadStream("test.txt");
  fileStream.on("data", (chunk) =>
    emit(Effect.succeed(Chunk.of(chunk.toString())))
  );
  fileStream.on("error", (error) =>
    emit(Effect.fail(Option.some(new FileStreamError(error))))
  );
  fileStream.on("end", () => emit(Effect.fail(Option.none())));
  return Either.left(Effect.sync(() => fileStream.close()));
});
```

Using `Stream.asyncInterrupt` we can create a stream that can a 'interrupt' or 'unsuscribe' effect. We can use this to close the file stream.

#### With `Stream.asyncScoped`

```ts
const scopedFile = Effect.acquireRelease(
  Effect.sync(() => fs.createReadStream("test.txt")),
  (stream) => Effect.sync(() => stream.close())
);

const testOne = Stream.asyncScoped<string, FileStreamError>((emit) =>
  Effect.gen(function* (_) {
    const fileStream = yield* _(scopedFile);
    fileStream.on("data", (chunk) =>
      emit(Effect.succeed(Chunk.of(chunk.toString())))
    );
    fileStream.on("error", (error) =>
      emit(Effect.fail(Option.some(new FileStreamError(error))))
    );
    fileStream.on("end", () => emit(Effect.fail(Option.none())));
  })
);
```

First we create a scoped effect that creates and closes the file stream. Then we use `Stream.asyncScoped` to create the stream, knowing it will close the scope when it's done or interrupted.

### Exercise 2

#### Manual Solution

```ts
const testTwo = powersOfTwo.pipe(
  Stream.mapAccum(null as null | number, (acc, next) => {
    if (acc === next) {
      return [acc, Option.none()];
    } else {
      return [next, Option.some(next)];
    }
  }),
  Stream.filterMap(identity)
);
```

Using `Stream.mapAccum` we can modify our stream while keeping track of some state. Then we could use `Stream.filter(Option.isSome)` and `Stream.map(_ => _.value)` to remove the `None`'s, but `Stream.filterMap` 'filters' by removing `None`'s and keeping the `Some`'s. So we can just use that with our existing options.

#### Built-in Solution

```ts
const testTwo = Stream.changes(powersOfTwo);
```

Pretty self-explanatory, useful for when you want to keep track of changes in a stream.

## Schedule

### Exercise 1

#### Simplified Solution

```ts
function cronToSchedule({
  minutes,
  hours,
  days,
}: Cron): Schedule.Schedule<unknown, unknown, unknown> {
  const minutesSchedule = Schedule.spaced(Duration.minutes(minutes));
  const hoursSchedule = Schedule.spaced(Duration.hours(hours));
  const daysSchedule = Schedule.spaced(Duration.days(days));
  const finalSchedule = pipe(
    minutesSchedule,
    Schedule.intersect(hoursSchedule),
    Schedule.intersect(daysSchedule)
  );
  return finalSchedule;
}
```

We can use `Schedule.intersect` to combine schedules together so that they only recur when all of them are satisfied.

#### Built-in Solution

```ts
const cron = Cron.parse("0 0 1 * *").pipe(Either.getOrThrow);
const schedule = Schedule.cron(cron);
```

Effect has a `Cron` module that has a fully defined `Cron` type and a `parse` function to parse a cron string. Then we can use `Schedule.cron` to create a schedule from the cron.

### Exercise 2

```ts
const linearScedule = Schedule.linear("25 millis").pipe(
  Schedule.repetitions,
  Schedule.whileOutput((x) => x < 3)
);

const exponentialSchedule = Schedule.exponential("100 millis", 2).pipe(
  Schedule.whileOutput((x) => Duration.lessThan(x, Duration.seconds(1)))
);

const fixedSchedule = Schedule.fixed("1 seconds").pipe(
  Schedule.whileInput<number>((x) => x % 27 !== 0),
  Schedule.tapInput((x) => Effect.log(`IM DIVISBLE BY 27 - ${x}`))
);

const finalSchedule = linearScedule.pipe(
  Schedule.andThen(exponentialSchedule),
  Schedule.andThen(fixedSchedule)
);
```

Using `Schedule.andThen` we can compose schedules together sequentially.
