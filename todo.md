- finish part 3 breakpoints - start building it out, realize we need fibers -> fibers lecture

start with send just an effect? move to enqueue

final:

```ts
export interface WebSocketConnection {
  readonly _rawWS: WebSocket;
  readonly name: string;
  readonly color: Color;
  readonly timeConnected: number;
  readonly messages: Stream.Stream<ServerIncomingMessage, ParseError>;
  readonly sendQueue: Queue.Enqueue<ServerOutgoingMessage>;
  readonly close: Effect.Effect<void>;
  readonly fiber: Fiber.Fiber<void>;
}
```

- move scheduling note from runtime to concurrency + update slides
  (use as moment to discuss while true vs forever example)
- scripts to fast run each file
- explain in readme how things are broken up
