import { Effect, Layer } from "effect";
import { CurrentConnections, WSSServer } from "./server";
import * as M from "./model";
import * as S from "@effect/schema/Schema";

export const Live = Layer.effectDiscard(
  Effect.gen(function* (_) {
    const wss = yield* _(WSSServer);
    const currentConnections = yield* _(CurrentConnections);
    function broadcastMessage(message: M.ServerOutgoingMessage) {
      const messageString = JSON.stringify(message);
      currentConnections.forEach((conn) => {
        conn._rawWS.send(messageString);
      });
    }

    wss.on("connection", (ws: WebSocket) => {
      let connectionName: string;

      ws.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString());
          const parsedMessage = S.decodeUnknownSync(
            S.union(M.ServerIncomingMessage, M.StartupMessage)
          )(message);

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
  })
);
