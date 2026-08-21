import { NodeServices, NodeRuntime } from "@effect/platform-node";
import { Console, Effect, Layer, References } from "effect";
import { HttpServer, type HttpServerError } from "effect/unstable/http";
import type { ConfigError } from "effect/Config";

import { HTTPServerLive, HttpLive } from "./http.ts";
import { NodeServer } from "./node.ts";
import { ConnectionStore } from "./shared.ts";
import { WSSServer, WebSocketLive } from "./ws.ts";

const ServersLive: Layer.Layer<
  never,
  never,
  ConnectionStore | HttpServer.HttpServer | WSSServer
> = Layer.merge(HttpLive, WebSocketLive);

const StartMessage: Layer.Layer<
  never,
  never,
  HttpServer.HttpServer | WSSServer
> = Layer.effectDiscard(
  Effect.gen(function* () {
    const httpServer = yield* HttpServer.HttpServer;

    const wssServer = yield* WSSServer;

    const httpPort =
      httpServer.address._tag === "TcpAddress"
        ? httpServer.address.port
        : "unknown";

    yield* Console.log(`HTTP server listening on port ${httpPort}`);

    const wssAdress = wssServer.address();

    const wssPort =
      typeof wssAdress === "string" //
        ? wssAdress
        : (wssAdress?.port ?? 0).toString();

    yield* Console.log(`WebSocket server listening on port ${wssPort}`);
  })
);

const MainLive: Layer.Layer<
  never,
  ConfigError | HttpServerError.ServeError,
  never
> = Layer.merge(ServersLive, StartMessage).pipe(
  Layer.provide(HTTPServerLive),
  Layer.provide(WSSServer.Live),
  Layer.provide(ConnectionStore.Live),
  Layer.provide(NodeServer.Live),
  Layer.provide(NodeServices.layer)
);

NodeRuntime.runMain(
  Layer.launch(MainLive).pipe(
    Effect.provideService(References.MinimumLogLevel, "Debug")
  )
);
