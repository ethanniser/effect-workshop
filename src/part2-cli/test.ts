import { Context, Effect } from "effect";

class Service1 extends Context.Tag("Service1")<
  Service1,
  {
    readonly foo: Effect.Effect<string>;
  }
>() {}

class Service2 extends Context.Tag("Service2")<
  Service2,
  {
    readonly foo: Effect.Effect<string>;
  }
>() {}

const main = Effect.flatMap(Service1, (_) => _.foo);

const next = main.pipe(
  Effect.provideService(Service2, { foo: Effect.succeed("bar") })
);
