import { Console, Effect, Exit, Request, RequestResolver } from "effect";

/**
 * Very often in apps we have 'requests' that are operations on some external data source
 * consider this short example
 */

interface User {
  readonly id: number;
  readonly name: string;
  readonly todoIds: ReadonlyArray<number>;
}

interface Todo {
  readonly _tag: "Todo";
  readonly id: number;
  readonly text: string;
  readonly completed: boolean;
}

class GetTodoError {
  readonly _tag = "GetTodosError";
}

class GetUserError {
  readonly _tag = "GetUserError";
}

const simulatedValidation = async <A>(
  promise: Promise<Response>
): Promise<A> => {
  /**
   * In a real world scenario, we may not want to trust our APIs to actually return the expected data
   */
  return promise.then((res) => res.json() as Promise<A>);
};

{
  const getUser: Effect.Effect<User, GetUserError, never> = Effect.tryPromise({
    try: () =>
      simulatedValidation<User>(fetch("https://api.example.demo/user")),
    catch: () => new GetUserError(),
  });

  const getTodoById = (id: number): Effect.Effect<Todo, GetTodoError, never> =>
    Effect.tryPromise({
      try: () =>
        simulatedValidation<Todo>(
          fetch(`https://api.example.demo/getTodoById?id=${id}`)
        ),
      catch: () => new GetTodoError(),
    });

  const main: Effect.Effect<void, GetUserError | GetTodoError, never> =
    Effect.gen(function* () {
      const users = yield* getUser;
      const todos = yield* Effect.all(users.todoIds.map(getTodoById), {
        concurrency: "unbounded",
      });

      yield* Console.log(todos);
    });
  void main;
}

/**
 * While this code totally works, it has a few problems
 * 1. N+1 problem - we are making a request for each todo, this can be slow and expensive.
 * 2. No caching - if we make the same request twice, we will get the same data twice.
 *
 *
 * We could of course implement these features ourselves, but that would be a lot of work.
 * Effect has a built in solution for this, with its 'Requests' apis.
 *
 *
 * We start by declaring our Requests.
 * First as an interface: `interface MyRequests extends Request.Request<ReturnType, ErrorType> { ...inputs... }`
 */
interface GetUserRequest extends Request.Request<User, GetUserError> {
  readonly _tag: "GetUser";
}
interface GetTodoByIdRequest extends Request.Request<Todo, GetTodoError> {
  readonly _tag: "GetTodoById";
  readonly id: number;
}

/**
 * And by value similar to how we declare context tags
 */
const GetUserRequest = Request.tagged<GetUserRequest>("GetUser");
const GetTodoByIdRequest = Request.tagged<GetTodoByIdRequest>("GetTodoById");

/**
 * Next, we declare our `Resolvers` which are the functions that actually perform the requests.
 * A resolver receives all pending requests as entries and completes each one
 * with an `Exit` value using `entry.completeUnsafe`.
 */
const GetUserResolver: RequestResolver.RequestResolver<GetUserRequest> =
  RequestResolver.make<GetUserRequest>((entries) =>
  Effect.forEach(entries, (entry) =>
    Effect.tryPromise({
      try: async () => {
        const user = await simulatedValidation<User>(
          fetch("https://api.example.demo/user")
        );
        entry.completeUnsafe(Exit.succeed(user));
        return user;
      },
      catch: (e) => {
        entry.completeUnsafe(Exit.fail(new GetUserError()));
        return new GetUserError();
      },
    })
  ).pipe(Effect.asVoid)
);

/**
 * The key feature here is that resolvers are able to be 'batched'
 * Requests that arrive within the delay window are all delivered to the
 * resolver together, so we can perform them all at once
 */
const GetTodoByIdResolver: RequestResolver.RequestResolver<
  GetTodoByIdRequest
> = RequestResolver.make<GetTodoByIdRequest>((entries) =>
  Effect.tryPromise({
    try: () =>
      simulatedValidation<Todo[]>(
        fetch(
          `https://api.example.demo/getTodoByIdBatched?ids=${entries
            .map((entry) => entry.request.id)
            .join(",")}`
        )
      ),
    catch: () => new GetTodoError(),
  }).pipe(
    Effect.flatMap((todos) =>
      Effect.forEach(entries, (entry, index) =>
        Effect.sync(() => entry.completeUnsafe(Exit.succeed(todos[index]!)))
      )
    ),
    Effect.catch((error) =>
      Effect.forEach(entries, (entry) =>
        Effect.sync(() => entry.completeUnsafe(Exit.fail(error)))
      )
    )
  ));

// Control the delay before the resolver is executed. This allows more
// requests to be batched together...
const GetTodoByIdResolverDelayed = RequestResolver.setDelay(
  GetTodoByIdResolver,
  "10 millis"
);
// ...and add a simple cache so repeated requests don't hit the network at all
void RequestResolver.withCache(GetTodoByIdResolverDelayed, {
  capacity: 1024,
});

/**
 * Now we can use these in combinate with `Effect.request` to perform the requests
 * Then it's as easy as rewriting the same function signatures as before
 */

const getUser: Effect.Effect<User, GetUserError, never> = Effect.request(
  GetUserRequest(undefined),
  GetUserResolver
);

const getTodoById = (id: number): Effect.Effect<Todo, GetTodoError, never> =>
  Effect.request(GetTodoByIdRequest({ id }), GetTodoByIdResolver);

/**
 * Q: Well, we've done all this work, what do we get?
 *
 * Requests made concurrently while the resolver's delay window is open
 * will be batched together into a single call.
 */

const main: Effect.Effect<void, GetTodoError | GetUserError, never> =
  Effect.gen(function* () {
    const users = yield* getUser;
    const todos = yield* Effect.all(users.todoIds.map(getTodoById), {
      concurrency: "unbounded",
    });
    yield* Console.log(todos);
  });

/**
 * This has reduced our N+1 requests to just 2 requests,
 * and thanks to `RequestResolver.withCache`, repeating them is free.
 */

void main.pipe(Effect.repeat({ times: 10 }));

/**
 * the default cache has a capacity of 65000, and a time to live of 60 seconds
 */
{
  interface TestReq extends Request.Request<void, never> {
    readonly id: number;
    readonly _tag: "TestReq";
  }
  const TestReq = Request.tagged<TestReq>("TestReq");
  const TestReqResolver = RequestResolver.make<TestReq>(
    Effect.fn(function* (entries) {
      yield* Console.log(
        "received request",
        entries.map((entry) => entry.request.id)
      );

      yield* Effect.forEach(entries, (entry) =>
        Effect.sync(() => entry.completeUnsafe(Exit.succeed(void 0)))
      );
    })
  ).pipe(RequestResolver.setDelay("10 millis"));

  const makeRequest = (id: number): Effect.Effect<void, never, never> =>
    Effect.request(TestReq({ id }), TestReqResolver);

  const main2: Effect.Effect<void, never, never> = Effect.gen(function* () {
    const requests = [
      Effect.sleep("1 seconds").pipe(
        Effect.andThen(Console.log("slept for 1 second"))
      ),
      makeRequest(2),
      makeRequest(3),
    ];
    yield* Effect.all(requests, { concurrency: "unbounded" });
  });

  void Effect.runPromise(main2); // both requests arrive in one batch
}
/**
 * Consider this example...
 *
 * Be mindful when you use batching.
 * The delay window tells the runtime to pause effects waiting for a batched request resolver;
 * they wait until every other running request has either finished, errored,
 * or is also waiting for the same batched request resolver.
 */
