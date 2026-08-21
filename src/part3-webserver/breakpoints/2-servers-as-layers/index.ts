import { createServer } from "node:http";
import { BunRuntime } from "@effect/platform-bun";
import {
  Config,
  Context,
  Effect,
  Layer,
  Schema,
  pipe,
} from "effect";
import type { ConfigError } from "effect/Config";
import { type WebSocket, WebSocketServer } from "ws";

import * as M from "./model.ts";

class HttpServer extends Context.Service<
  HttpServer,
  ReturnType<typeof createServer>
>()("HttpServer") {
  static readonly Live = Layer.sync(HttpServer, createServer);
}

class WSSServer extends Context.Service<WSSServer, WebSocketServer>()(
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

const ListenLive: Layer.Layer<never, ConfigError, HttpServer> =
  Layer.effectDiscard(
    Effect.gen(function* () {
      const port = yield* Config.int("PORT").pipe(Config.withDefault(3000));

      const server = yield* HttpServer;

      yield* Effect.sync(() =>
        server.listen(port, () => console.log("Server started on port", port))
      );
    })
  );

const main: Layer.Layer<never, never, HttpServer | WSSServer> =
  Layer.effectDiscard(
    Effect.gen(function* () {
      const currentConnections: Map<string, M.WebSocketConnection> = new Map();

      function broadcastMessage(message: M.ServerOutgoingMessage) {
        const messageString = JSON.stringify(message);
        currentConnections.forEach((conn) => conn._rawWS.send(messageString));
      }

      const http = yield* HttpServer;

      http.on("request", (req, res) => {
        if (req.url !== "/colors") {
          res.writeHead(404);
          res.end("Not Found");
          return;
        }

        const currentColors = Array.from(currentConnections.values()).map(
          (conn) => conn.color
        );

        const availableColors = M.colors.filter(
          (color) => !currentColors.includes(color)
        );

        const message = M.AvailableColorsResponse.make({
          _tag: "availableColors",
          colors: availableColors,
        });

        res.writeHead(200, { "Content-Type": "application/json" });

        res.end(JSON.stringify(message));
      });

      const wss = yield* WSSServer;

      wss.on("connection", (ws: WebSocket) => {
        let connectionName: string;

        ws.on("message", (data) => {
          try {
            const message = JSON.parse(data.toString());
            const parsedMessage = pipe(
              message,
              Schema.decodeUnknownSync(
                Schema.Union([M.ServerIncomingMessage, M.StartupMessage])
              )
            );

            switch (parsedMessage._tag) {
              case "startup": {
                const { color, name } = parsedMessage;
                if (!M.colors.includes(color) || currentConnections.has(name)) {
                  ws.close(); // Close the connection if the color is not available or the name is already taken
                  return;
                }

                connectionName = name;
                console.log(`New connection: ${name}`);
                currentConnections.set(name, {
                  _rawWS: ws,
                  name,
                  color,
                  timeConnected: Date.now(),
                });
                broadcastMessage({ _tag: "join", name, color });
                break;
              }

              case "message": {
                if (connectionName) {
                  const conn = currentConnections.get(connectionName);
                  if (conn) {
                    broadcastMessage({
                      _tag: "message",
                      name: conn.name,
                      color: conn.color,
                      message: parsedMessage.message,
                      timestamp: Date.now(),
                    });
                  }
                }
                break;
              }
            }
          } catch (err) {
            console.error("Failed to process message:", err);
          }
        });

        ws.on("close", () => {
          if (connectionName) {
            const conn = currentConnections.get(connectionName);
            if (conn) {
              broadcastMessage({
                _tag: "leave",
                name: conn.name,
                color: conn.color,
              });
              currentConnections.delete(connectionName);
              console.log(`Connection closed: ${connectionName}`);
            }
          }
        });
      });

      setInterval(() => {
        console.log("Current connections:", currentConnections.size);
      }, 1000);
    })
  );

pipe(
  Layer.merge(main, ListenLive),
  Layer.provide(WSSServer.Live),
  Layer.provide(HttpServer.Live),
  Layer.launch,
  BunRuntime.runMain
);
