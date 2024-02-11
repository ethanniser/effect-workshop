import {
  Console,
  Effect,
  Fiber,
  Ref,
  Schedule,
  pipe,
  Request,
  RequestResolver,
} from "effect";

interface TestReq extends Request.Request<void, never> {
  readonly id: number;
  readonly _tag: "TestReq";
}
const TestReq = Request.tagged<TestReq>("TestReq");
const TestReqResolver = RequestResolver.makeBatched(
  (requests: Array<TestReq>) =>
    Effect.gen(function* (_) {
      yield* _(
        Console.log(
          "received request",
          requests.map((r) => r.id)
        )
      );
    }).pipe(
      Effect.zipRight(
        Effect.forEach(requests, (request) =>
          Request.completeEffect(request, Effect.unit)
        )
      )
    )
);

const makeRequest = (id: number) =>
  Effect.request(TestReq({ id }), TestReqResolver);

const main = Effect.gen(function* (_) {
  const requests = [
    Effect.sleep("1 seconds").pipe(
      Effect.zipRight(Console.log("slept for 1 second"))
    ),
    makeRequest(2),
    makeRequest(3),
  ];
  yield* _(Effect.all(requests, { batching: true, concurrency: "unbounded" }));
});

Effect.runPromise(main);
