import { Context } from "effect";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { WebSocketServer } from "ws";
import { NodeServer } from "./node";

export const WSSServer = Context.Tag<WebSocketServer>();
export const WSSServerLive = Layer.effect(
  WSSServer,
  NodeServer.pipe(Effect.map((server) => new WebSocketServer({ server })))
);

export const WebSocketLive = Layer.effectDiscard(
  Effect.gen(function* (_) {
    const wss = yield* _(WSSServer);
    yield* _(
      Effect.sync(() =>
        wss.on("connection", (ws) => {
          ws.on("message", (message) => {
            console.log(`received: ${message}`);
          });
          ws.send("something");
        })
      )
    );
  })
);
