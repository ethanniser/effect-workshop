import { createServer } from "http";
import { HashMap, Ref, Context, Effect, Layer } from "effect";
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
  Ref.Ref<HashMap.HashMap<string, M.WebSocketConnection>>
>() {
  static readonly Live = Layer.effect(
    CurrentConnections,
    Ref.make(HashMap.empty<string, M.WebSocketConnection>())
  );
}

export const ListenLive = Layer.effectDiscard(
  Effect.gen(function* (_) {
    const port = yield* _(C.PORT);
    const server = yield* _(HttpServer);
    const currentConnections = yield* _(CurrentConnections);
    const connections = yield* _(Ref.get(currentConnections));
    yield* _(
      Effect.sync(() =>
        server.listen(port, () => console.log("Server started on port", port))
      )
    );
    yield* _(
      Effect.sync(() =>
        setInterval(() => {
          console.log("Current connections:", HashMap.size(connections));
        }, 1000)
      )
    );
  })
);

export const getAvailableColors = Effect.gen(function* (_) {
  const currentConnections = yield* _(CurrentConnections);
  const connections = yield* _(Ref.get(currentConnections));
  const usedColors = Array.from(HashMap.values(connections)).map(
    (_) => _.color
  );
  return M.colors.filter((color) => !usedColors.includes(color));
});
