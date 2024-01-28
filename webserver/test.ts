import {
  Chunk,
  Console,
  Effect,
  Fiber,
  Layer,
  PubSub,
  Ref,
  Stream,
} from "effect";

const program = Effect.gen(function* (_) {
  const pubsub = yield* _(PubSub.unbounded<number>());

  yield* _(
    Stream.fromPubSub(pubsub),
    Stream.tap((message) =>
      Effect.log(`Received message ${JSON.stringify(message)} from pubsub`)
    ),
    Stream.runDrain,
    Effect.forkDaemon
  );

  const stream = Stream.tick("250 millis");
  const ref = yield* _(Ref.make(0));
  yield* _(
    stream,
    Stream.tap(() =>
      Effect.gen(function* (_) {
        const value = yield* _(Ref.get(ref));
        yield* _(PubSub.publish(pubsub, value));
        yield* _(Console.log(`Published ${value}`));
        yield* _(Ref.update(ref, (n) => n + 1));
      })
    ),
    Stream.runDrain,
    Effect.forkDaemon
  );
}).pipe(Effect.scoped);

Effect.runPromise(Layer.launch(Layer.effectDiscard(program)));
