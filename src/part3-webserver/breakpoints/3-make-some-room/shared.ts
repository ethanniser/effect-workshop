import { createServer } from "node:http";
import { Config, Context, Effect, Layer } from "effect";
import type { ConfigError } from "effect/Config";
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

export const ListenLive: Layer.Layer<
  never,
  ConfigError,
  HttpServer | CurrentConnections
> = Layer.effectDiscard(
  Effect.gen(function* () {
    const port = yield* Config.int("PORT").pipe(Config.withDefault(3000));

    const server = yield* HttpServer;

    const currentConnections = yield* CurrentConnections;

    yield* Effect.sync(() =>
      server.listen(port, () => console.log("Server started on port", port))
    );

    yield* Effect.sync(() =>
      setInterval(
        () => console.log("Current connections:", currentConnections.size),
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

  const currentColors = Array.from(currentConnections.values()).map(
    (conn) => conn.color
  );

  const availableColors = M.colors.filter(
    (color) => !currentColors.includes(color)
  );

  return availableColors;
});
