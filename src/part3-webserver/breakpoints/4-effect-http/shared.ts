import { createServer } from "http";
import { Config, Context, Effect, Layer } from "effect";
import * as M from "./model";
import * as C from "./config";
import { WebSocketServer } from "ws";

export class HttpServer extends Context.Tag("HttpServer")<
  HttpServer,
  ReturnType<typeof createServer>
>() {
  static readonly Live = Layer.sync(HttpServer, createServer);
}

export class WSSServer extends Context.Tag("WSSServer")<
  WSSServer,
  WebSocketServer
>() {
  static readonly Live = Layer.effect(
    WSSServer,
    HttpServer.pipe(Effect.map((server) => new WebSocketServer({ server })))
  );
}

export class CurrentConnections extends Context.Tag("CurrentConnections")<
  CurrentConnections,
  Map<string, M.WebSocketConnection>
>() {
  static readonly Live = Layer.sync(CurrentConnections, () => new Map());
}

export const getAvailableColors = Effect.gen(function* (_) {
  const currentConnections = yield* _(CurrentConnections);
  const currentColors = Array.from(currentConnections.values()).map(
    (conn) => conn.color
  );
  const availableColors = M.colors.filter(
    (color) => !currentColors.includes(color)
  );
  return availableColors;
});
