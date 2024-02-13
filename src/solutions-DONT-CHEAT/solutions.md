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
    return Hash.combine(Hash.string(this.id))(
      Hash.combine(Hash.number(this.amount))(Hash.number(this.time.getTime()))
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

## Match

## Schema

# Part 3

## Stream

## Schedule

## Ref
