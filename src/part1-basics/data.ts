import { Data, Equal, Hash } from "effect";

type FooData = {
  readonly a: number;
  readonly b: string;
};

class Foo implements FooData, Equal.Equal, Hash.Hash {
  constructor(readonly a: number, readonly b: string) {}

  [Equal.symbol](that: Equal.Equal): boolean {
    if (that instanceof Foo) {
      return this.a === that.a && this.b === that.b;
    } else {
      return false;
    }
  }

  [Hash.symbol](): number {
    return Hash.combine(Hash.number(this.a))(Hash.string(this.b));
  }
}

const f1 = new Foo(1, "a");
const f2 = Data.struct({ a: 1, b: "a" });
const f21 = Data.tuple(1, "a");
const f22 = Data.array([1, 2, 3]);

interface Foo3 {
  readonly a: number;
  readonly b: string;
}

const Foo3 = Data.case<Foo3>();
const f3 = Foo3({ a: 1, b: "a" });

interface TaggedFoo3 {
  readonly _tag: "Foo3";
  readonly a: number;
  readonly b: string;
}

const TaggedFoo3 = Data.tagged<TaggedFoo3>("Foo3");
const tf3 = TaggedFoo3({ a: 1, b: "a" });

// or in one step with classes

class Foo4 extends Data.Class<{ readonly a: number; readonly b: string }> {}
const f4 = new Foo4({ a: 1, b: "a" });

class TaggedFoo4 extends Data.TaggedClass("Foo4")<{
  readonly a: number;
  readonly b: string;
}> {}
const tf4 = new TaggedFoo4({ a: 1, b: "a" });

// custom behavior at the same time:
class Foo5 extends Data.TaggedClass("Foo5")<{
  readonly a: number;
  readonly b: string;
}> {
  get c() {
    return this.a + this.b.length;
  }

  ab() {
    return String(this.a) + this.b;
  }
}
const f5 = new Foo5({ a: 1, b: "a" });
console.log(f5.c); // 2
console.log(f5.ab()); // "1a"

// helper for creating tagged union of case classes

type AppState = Data.TaggedEnum<{
  Startup: {};
  Loading: {
    readonly status: string;
  };
  Ready: {
    readonly data: number;
  };
}>;

const { Startup, Loading, Ready } = Data.taggedEnum<AppState>();

const state1 = Startup();
const state2 = Loading({ status: "loading" });
const state3 = Ready({ data: 42 });
const state4 = Loading({ status: "loading" });

console.log(Equal.equals(state2, state4)); // true
console.log(Equal.equals(state2, state3)); // false

declare const state: AppState;
switch (state._tag) {
  case "Startup":
    break;
  case "Loading":
    console.log(state.status);
    break;
  case "Ready":
    console.log(state.data);
    break;
}
