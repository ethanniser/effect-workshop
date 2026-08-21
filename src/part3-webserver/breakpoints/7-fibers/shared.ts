import { createServer } from "node:http";
import { Context, Effect, HashMap, Layer, Ref } from "effect";
import type { ConfigError } from "effect/Config";
import { WebSocketServer } from "ws";

import * as C from "./config.ts";
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

export const ListenLive: Layer.Layer<
  never,
  ConfigError,
  CurrentConnections | HttpServer
> = Layer.effectDiscard(
  Effect.gen(function* () {
    const port = yield* C.PORT;

    const server = yield* HttpServer;

    const currentConnections = yield* CurrentConnections;

    const connections = yield* Ref.get(currentConnections);

    yield* Effect.sync(() =>
      server.listen(port, () => console.log("Server started on port", port))
    );

    yield* Effect.sync(() =>
      setInterval(
        () => console.log("Current connections:", HashMap.size(connections)),
        1000
      )
    );
  })
);

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
