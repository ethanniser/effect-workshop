import * as Http from "@effect/platform-node/HttpServer";
import * as NodeContext from "@effect/platform-node/NodeContext";
import { runMain } from "@effect/platform-node/Runtime";
import { Context } from "effect";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";

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

const HttpLive = Http.router.empty.pipe(
  Http.router.get("/test", Http.response.text("HTTP!")),
  Http.server.serve(Http.middleware.logger)
);

const WSSServer = Context.Tag<WebSocketServer>();
const WSSServerLive = Layer.effect(
  WSSServer,
  NodeServer.pipe(Effect.map((server) => new WebSocketServer({ server })))
);

const WebSocketLive = Layer.effectDiscard(
  Effect.gen(function* (_) {
    const wss = yield* _(WSSServer);
    yield* _(
      Effect.sync(() =>
        wss.on("connection", (ws) => {
          ws.on("message", (message) => {
            console.log(`received: ${message}`);
          });
          ws.send("something");
        })
      )
    );
  })
);

const ServersLive = Layer.merge(HttpLive, WebSocketLive);

const MainLive = ServersLive.pipe(
  Layer.provide(ServerLive),
  Layer.provide(WSSServerLive),
  Layer.provide(NodeContext.layer),
  Layer.provide(NodeServerLive)
);

runMain(Layer.launch(MainLive));
