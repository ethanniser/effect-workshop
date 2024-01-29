import * as NodeContext from "@effect/platform-node/NodeContext";
import * as Http from "@effect/platform-node/HttpServer";
import { runMain } from "@effect/platform-node/Runtime";
import { Console, Effect, Layer, LogLevel, Logger } from "effect";
import { HTTPServerLive, HttpLive } from "./http";
import { WSSServer, WSSServerLive, WebSocketLive } from "./ws";
import { NodeServerLive } from "./node";
import { ConnectionStoreLive } from "./shared";

const ServersLive = Layer.merge(HttpLive, WebSocketLive);

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

const MainLive = ServersLive.pipe(
  Layer.merge(StartMessage),
  Layer.provide(HTTPServerLive),
  Layer.provide(WSSServerLive),
  Layer.provide(ConnectionStoreLive),
  Layer.provide(NodeServerLive),
  Layer.provide(NodeContext.layer),
  Layer.provide(Logger.minimumLogLevel(LogLevel.Debug))
);

runMain(Layer.launch(MainLive));
