import { Resolver, Rpc } from "@effect/rpc";
import * as S from "@effect/schema/Schema";
import { Console, Effect, Layer, Stream } from "effect";
import { HttpRouter, HttpResolver } from "@effect/rpc-http";
import * as HttpServer from "@effect/platform/HttpServer";
import * as HttpClient from "@effect/platform/HttpClient";
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { createServer } from "node:http";
import {
  GetTodoById,
  GetTodos,
  type Router,
} from "./part4-whatsnext/snippets/6-rpc";

const client = HttpResolver.make<Router>(
  HttpClient.client
    .fetchOk()
    .pipe(
      HttpClient.client.mapRequest(
        HttpClient.request.prependUrl("http://0.0.0.0:3000/rpc")
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
