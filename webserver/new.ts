import * as Http from "@effect/platform-node/HttpServer";
import * as NodeContext from "@effect/platform-node/NodeContext";
import { runMain } from "@effect/platform-node/Runtime";
import { Context } from "effect";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { createServer } from "node:http";

type NodeServer = {
  readonly _: unique symbol;
};
const NodeServer = Context.Tag<NodeServer, ReturnType<typeof createServer>>();
const NodeServerLive = Layer.sync(NodeServer, createServer);

const ServerLive = Layer.scoped(
  Http.server.Server,
  NodeServer.pipe(
    Effect.flatMap((server) => Http.server.make(() => server, { port: 3000 }))
  )
);

const test = Effect.gen(function* (_) {
  const server = yield* _(NodeServer);
  return yield* _(Http.server.make(() => server, { port: 3000 }));
});

const HttpLive = Http.router.empty.pipe(
  Http.router.get(
    "/",
    Effect.map(Http.request.ServerRequest, (req) => Http.response.text(req.url))
  ),
  Http.server.serve(Http.middleware.logger)
);

const MainLive = HttpLive.pipe(
  Layer.provide(ServerLive),
  Layer.provide(NodeContext.layer),
  Layer.provide(NodeServerLive)
);

runMain(Layer.launch(MainLive));
