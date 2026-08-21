import { createServer } from "node:http";
import { Context, Effect, HashMap, Layer, Ref } from "effect";
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
  Ref.Ref<HashMap.HashMap<string, M.WebSocketConnection>>
>()("CurrentConnections") {
  static readonly Live = Layer.effect(
    CurrentConnections,
    Ref.make(HashMap.empty<string, M.WebSocketConnection>())
  );
}

export const getAvailableColors: Effect.Effect<
  M.Color[],
  never,
  CurrentConnections
> = Effect.gen(function* () {
  const currentConnections = yield* CurrentConnections;

  const connections = yield* Ref.get(currentConnections);

  const usedColors = Array.from(HashMap.values(connections)).map(
    (_) => _.color
  );

  return M.colors.filter((color) => !usedColors.includes(color));
});
