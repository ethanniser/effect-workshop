import { Console, Effect, Layer, pipe } from "effect";
import { BunRuntime } from "@effect/platform-bun";
import * as HTTP from "./http";
import * as Http from "@effect/platform/HttpServer";
import * as WS from "./ws";
import * as SERVER from "./shared";
import { WSSServer } from "./shared";

const serversLayer = Layer.merge(HTTP.Live, WS.Live);

const StartMessage = Layer.effectDiscard(
  Effect.gen(function* (_) {
    const httpServer = yield* _(Http.server.Server);
    const wssServer = yield* _(WSSServer);
    const httpPort =
      httpServer.address._tag === "TcpAddress"
        ? httpServer.address.port
        : "unknown";
    yield* _(Console.log(`HTTP server listening on port ${httpPort}`));
    const wssAdress = wssServer.address();
    const wssPort =
      typeof wssAdress === "string" ? wssAdress : wssAdress.port.toString();
    yield* _(Console.log(`WebSocket server listening on port ${wssPort}`));
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
