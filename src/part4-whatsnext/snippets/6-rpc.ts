import { createServer } from "node:http";

import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { Console, Effect, Layer, Schema, Stream, type Scope } from "effect";
import { FetchHttpClient, HttpRouter } from "effect/unstable/http";
import {
  Rpc,
  RpcClient,
  RpcGroup,
  RpcSerialization,
  RpcServer,
} from "effect/unstable/rpc";

/**
 * `rpc` or "remote procedure call" is a way to call a function on a remote server;
 * It abstracts the network communication and makes it look like a local function call
 * all while remaining full type safe.
 * Effect provides its own rpc implementation.
 *
 * In v4 you define a group of procedures with schemas for their payloads and results:
 * - Requests can return a simple value, or a stream (with `stream: true`)
 * - The schemas are used to serialize and deserialize the data over the network
 */

/**
 * request.ts
 */
class Todo extends Schema.Class<Todo>("Todo")({
  id: Schema.Int,
  title: Schema.String,
  completed: Schema.Boolean,
}) {}

class GetTodoError extends Schema.TaggedError<GetTodoError>()(
  "GetTodoError",
  {}
) {}

const TodosRpc = RpcGroup.make(
  Rpc.make("GetTodos", {
    success: Todo,
    stream: true,
  }),
  Rpc.make("GetTodoById", {
    success: Todo,
    error: GetTodoError,
    payload: { id: Schema.Number.pipe(Schema.check(Schema.isInt())) },
  })
);

type TodosRpc = typeof TodosRpc;

/**
 * # Implementing the handlers (`handlers.ts`)
 *
 * First, we implement each procedure with `group.toLayer`.
 */
const TodosHandlers = TodosRpc.toLayer({
  GetTodos: () =>
    Stream.fromIterable(
      [1, 2, 3].map((id) => new Todo({ id, title: "todo", completed: false }))
    ),
  GetTodoById: ({ id }: { readonly id: number }) =>
    id === 1
      ? Effect.succeed(new Todo({ id, title: "todo", completed: false }))
      : Effect.fail(new GetTodoError()),
});

/**
 * # Serving the API (e.g. `server.ts`)
 *
 * Next well create our server;
 * `RpcServer.layerHttp` registers an `/rpc` route on the current HttpRouter.
 */
export const RpcServerLive = RpcServer.layerHttp({
  group: TodosRpc,
  path: "/rpc",
  protocol: "http",
}).pipe(
  Layer.provide(RpcSerialization.layerJson),
  Layer.provide(TodosHandlers)
);

const Routes = HttpRouter.use(Effect.fn(function* (_router: any) {}));

const HttpServerLive = HttpRouter.serve(Routes).pipe(
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 }))
);

export const ServerLive = Layer.merge(HttpServerLive, RpcServerLive);

// NodeRuntime.runMain(Layer.launch(ServerLive));

/**
 * # On the client side (e.g. `client.ts`)
 *
 * And finally we can create a typed client from the same group definition,
 * pointing it at the server with an HTTP protocol.
 */
const ClientLive = RpcClient.layerProtocolHttp({
  url: "http://localhost:3000/rpc",
}).pipe(Layer.provide(RpcSerialization.layerJson));

export const program: Effect.Effect<void, unknown, Scope.Scope> = Effect.gen(
  function* () {
    const client = yield* RpcClient.make(TodosRpc).pipe(
      Effect.provide(ClientLive)
    );

    yield* Effect.log("Running the client");

    const todos: Stream.Stream<Todo, unknown> = client.GetTodos();

    yield* Effect.log(yield* Stream.runCollect(todos));

    const todo = yield* client.GetTodoById({ id: 1 });

    yield* Console.log(todo);
  }
).pipe(Effect.provide(FetchHttpClient.layer));

/**
 * and now we can use the client with our rpc requests
 */
Effect.scoped(program).pipe(Effect.runFork);
