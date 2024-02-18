import { Resolver, Router, Rpc } from "@effect/rpc";
import * as S from "@effect/schema/Schema";
import { Console, Effect, Layer, Stream } from "effect";
import { HttpRouter, HttpResolver } from "@effect/rpc-http";
import * as HttpServer from "@effect/platform/HttpServer";
import * as HttpClient from "@effect/platform/HttpClient";
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { createServer } from "node:http";

// rpc or remote procedure call is a way to call a function on a remote server
// it abstracts the network communication and makes it look like a local function call
// all while remaining full type safe
// effect provides its own rpc implementation

// it starts by defining a schema for the client and server to use
// Requests can return a simple value, or a stream
// Requests are constructed with the form: tag, errorSchema, successSchema, inputs
// these are all defined by schemas, instead of types because
// the schemas are used to serialize and deserialize the data over the network

export class Todo extends S.TaggedClass<Todo>()("Todo", {
  id: S.number.pipe(S.int()),
  title: S.string,
  completed: S.boolean,
}) {}

export class GetTodoError extends S.TaggedError<GetTodoError>()(
  "GetTodoError",
  {}
) {}

export class GetTodos extends Rpc.StreamRequest<GetTodos>()(
  "GetTodos",
  GetTodoError,
  Todo,
  {}
) {}

export class GetTodoById extends S.TaggedRequest<GetTodoById>()(
  "GetTodoById",
  GetTodoError,
  Todo,
  { id: S.number.pipe(S.int()) }
) {}

// Next well create our server

// first we make a router using our schema
const router = Router.make(
  Rpc.stream(GetTodos, () =>
    Stream.fromIterable(
      [1, 2, 3].map((id) => new Todo({ id, title: "todo", completed: false }))
    )
  ),
  Rpc.effect(GetTodoById, ({ id }) =>
    id === 1
      ? Effect.succeed(new Todo({ id, title: "todo", completed: false }))
      : Effect.fail(new GetTodoError({}))
  )
);

export type Router = typeof router;

// you can implement the server in any way you want, but here we'll use the http router

const HttpLive = HttpServer.router.empty.pipe(
  HttpServer.router.post("/rpc", HttpRouter.toHttpApp(router)),
  HttpServer.server.serve(HttpServer.middleware.logger),
  HttpServer.server.withLogAddress,
  Layer.provide(NodeHttpServer.server.layer(createServer, { port: 3000 }))
);

Layer.launch(HttpLive).pipe(NodeRuntime.runMain);

// and finally we can create a client, again this can be done in any way you want
// but here we'll use the http client

const client = HttpResolver.make<Router>(
  HttpClient.client
    .fetchOk()
    .pipe(
      HttpClient.client.mapRequest(
        HttpClient.request.prependUrl("http://localhost:3000/rpc")
      )
    )
).pipe(Resolver.toClient);

// and now we can use the client with our rpc requests

client(new GetTodos()).pipe(
  Stream.runCollect,
  Effect.flatMap(
    Effect.forEach(({ id }) => client(new GetTodoById({ id })), {
      batching: true,
    })
  ),
  Effect.tap(Console.log),
  Effect.runFork
);
