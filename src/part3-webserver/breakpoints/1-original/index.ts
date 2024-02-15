import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import * as M from "./model";
import * as S from "@effect/schema/Schema";

const currentConnections: Map<string, M.WebSocketConnection> = new Map();

const server = createServer((req, res) => {
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

  const message: M.AvailableColorsResponse = {
    _tag: "availableColors",
    colors: availableColors,
  };
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(message));
});

const wss = new WebSocketServer({ server });

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
        broadcastMessage({ _tag: "leave", name: conn.name, color: conn.color });
        currentConnections.delete(connectionName);
        console.log(`Connection closed: ${connectionName}`);
      }
    }
  });
});

function broadcastMessage(message: M.ServerOutgoingMessage) {
  const messageString = JSON.stringify(message);
  currentConnections.forEach((conn) => {
    conn._rawWS.send(messageString);
  });
}

setInterval(() => {
  console.log("Current connections:", currentConnections.size);
}, 1000);

server.listen(3000, () => {
  console.log("Server started on port 3000");
});
