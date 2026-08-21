import { HttpServer } from "effect/unstable/http";
import { BunRuntime } from "@effect/platform-bun";
import { Console, Effect, Layer, pipe } from "effect";

import * as HTTP from "./http.ts";
import * as SERVER from "./shared.ts";
import * as WS from "./ws.ts";

const serversLayer: Layer.Layer<
  never,
  never,
  SERVER.CurrentConnections | HttpServer.HttpServer | SERVER.WSSServer
> = Layer.merge(HTTP.Live, WS.Live);

const StartMessage: Layer.Layer<
  never,
  never,
  SERVER.WSSServer | HttpServer.HttpServer
> = Layer.effectDiscard(
  Effect.gen(function* () {
    const httpServer = yield* HttpServer.HttpServer;

    const wssServer = yield* SERVER.WSSServer;

    const httpPort =
      httpServer.address._tag === "TcpAddress"
        ? httpServer.address.port
        : "unknown";

    yield* Console.log(`HTTP server listening on port ${httpPort}`);

    const wssAdress = wssServer.address();

    const wssPort =
      typeof wssAdress === "string"
        ? wssAdress //
        : (wssAdress?.port ?? 0).toString();

    yield* Console.log(`WebSocket server listening on port ${wssPort}`);
  })
);

pipe(
  Layer.merge(serversLayer, StartMessage),
  Layer.provide(SERVER.WSSServer.Live),
  Layer.provide(HTTP.HTTPServerLive),
  Layer.provide(SERVER.HttpServer.Live),
  Layer.provide(SERVER.CurrentConnections.Live),
  Layer.launch,
  BunRuntime.runMain
);
