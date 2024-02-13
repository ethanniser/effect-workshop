import { Effect, Context, Layer } from "effect";

class Foo extends Context.Tag("Foo")<Foo, { foo: string }>() {
  static readonly Live = { foo: "foo" };
}
