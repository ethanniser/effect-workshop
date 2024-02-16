import {
  Chunk,
  Effect,
  HashMap,
  Layer,
  Match,
  Option,
  Ref,
  Stream,
  pipe,
} from "effect";
import { CurrentConnections, WSSServer } from "./shared";
import * as M from "./model";
import * as S from "@effect/schema/Schema";
import type { WebSocketServer } from "ws";

const messagesStream = (wss: WebSocketServer) =>
  Stream.asyncEffect<M.ServerOutgoingMessage, never, never>((emit) =>
    Effect.gen(function* (_) {
      wss.on("connection", (ws: WebSocket) => {
        ws.on("message", (data) => {
          const _ = Effect.gen(function* (_) {
            const allMessagesSchema = S.union(
              M.ServerIncomingMessage,
              M.StartupMessage
            );

            const parse = S.parseJson(allMessagesSchema).pipe(S.decodeUnknown);
            const message = yield* _(parse(data));
            const __ = Match.value(message).pipe(
              Match.tag("startup", (message) => ({
                _tag: "join",
                name: message.name,
                color: message.color,
              })),
              Match.tag("message", (message) => ({
                _tag: "message",
                message: message.message,
                timestamp: Date.now(),
              })),
              Match.exhaustive
            );
          });

          ws.on("close", () => {
            emit(
              Effect.succeed(
                Chunk.of({
                  _tag: "leave",
                  name: conn.value.name,
                  color: conn.value.color,
                })
              )
            );
          });
        });
      });
    })
  );

export const Live = Layer.effectDiscard(
  Effect.gen(function* (_) {
    const wss = yield* _(WSSServer);
    const currentConnections = yield* _(CurrentConnections);
    const connections = yield* _(Ref.get(currentConnections));
    function broadcastMessage(message: M.ServerOutgoingMessage) {
      const messageString = JSON.stringify(message);
      HashMap.forEach(connections, (conn) => {
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
              if (!M.colors.includes(color) || HashMap.has(connections, name)) {
                ws.close(); // Close the connection if the color is not available or the name is already taken
                return;
              }

              connectionName = name;
              console.log(`New connection: ${name}`);

              Ref.update(currentConnections, (connections) =>
                HashMap.set(connections, name, {
                  _rawWS: ws,
                  name,
                  color,
                  timeConnected: Date.now(),
                })
              );
              broadcastMessage({ _tag: "join", name, color });
              break;
            }
            case "message": {
              if (connectionName) {
                const conn = HashMap.get(connections, connectionName);
                if (Option.isSome(conn)) {
                  broadcastMessage({
                    _tag: "message",
                    name: conn.value.name,
                    color: conn.value.color,
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
          const conn = HashMap.get(connections, connectionName);
          if (Option.isSome(conn)) {
            broadcastMessage({
              _tag: "leave",
              name: conn.value.name,
              color: conn.value.color,
            });
            Ref.update(currentConnections, (connections) =>
              HashMap.remove(connections, connectionName)
            );
            console.log(`Connection closed: ${connectionName}`);
          }
        }
      });
    });
  })
);
