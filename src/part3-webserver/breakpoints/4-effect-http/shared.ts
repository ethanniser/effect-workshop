import { createServer } from "node:http";
import { Context, Effect, Layer } from "effect";
import { WebSocketServer } from "ws";

import * as M from "./model.ts";

export class HttpServer extends Context.Service<
  HttpServer,
  ReturnType<typeof createServer>
>()("HttpServer") {
  static readonly Live = Layer.sync(HttpServer, createServer);
}

export class WSSServer extends Context.Service<WSSServer, WebSocketServer>()(
  "WSSServer"
) {
  static readonly Live = Layer.effect(
    WSSServer,
    Effect.gen(function* () {
      const server = yield* HttpServer;
      return new WebSocketServer({ server });
    })
  );
}

export class CurrentConnections extends Context.Service<
  CurrentConnections,
  Map<string, M.WebSocketConnection>
>()("CurrentConnections") {
  static readonly Live = Layer.sync(CurrentConnections, () => new Map());
}

export const getAvailableColors: Effect.Effect<
  M.Color[],
  never,
  CurrentConnections
> = Effect.gen(function* () {
  const currentConnections = yield* CurrentConnections;

  const currentColors = Array.from(currentConnections.values()).map(
    (conn) => conn.color
  );

  const availableColors = M.colors.filter(
    (color) => !currentColors.includes(color)
  );

  return availableColors;
});
