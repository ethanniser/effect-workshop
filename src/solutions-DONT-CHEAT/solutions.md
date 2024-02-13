## Scope

### Exercise 1

```ts
const file = (fd: number) =>
  Effect.acquireRelease(MockFile.open(fd), (file) => file.close);
```

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
