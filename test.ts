import { Data, Hash, Equal, HashMap } from "effect";

class Foo {
  constructor(readonly a: number) {}
  [Hash.symbol]() {
    return 0;
  }
  [Equal.symbol](that: Equal.Equal) {
    return false;
  }
}

let x = new Foo(1);

let hm = HashMap.empty<Foo, string>();
hm = HashMap.set(hm, new Foo(1), "one");
console.log(HashMap.toEntries(hm));
hm = HashMap.set(hm, new Foo(2), "two");
console.log(HashMap.toEntries(hm));
hm = HashMap.set(hm, new Foo(2), "three");
console.log(HashMap.toEntries(hm));
