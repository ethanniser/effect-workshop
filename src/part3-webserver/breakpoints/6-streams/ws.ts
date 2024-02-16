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
import type { RawData, WebSocket, WebSocketServer } from "ws";
import type { ParseError } from "@effect/schema/ParseResult";

const createConnectionsStream = (wss: WebSocketServer) =>
  Stream.async<WebSocket, Error>((emit) => {
    wss.on("connection", (ws: WebSocket) => {
      emit(Effect.succeed(Chunk.of(ws)));
    });
    wss.on("error", (err) => {
      emit(Effect.fail(Option.some(err)));
    });
    wss.on("close", () => {
      emit(Effect.fail(Option.none()));
    });
  });

const parseMessage = pipe(
  S.parseJson(M.ServerIncomingMessage),
  S.decodeUnknown
);

const encodeMessage = pipe(S.parseJson(M.ServerOutgoingMessage), S.encode);

const parseStartupMessage = pipe(
  S.parseJson(M.StartupMessage),
  S.decodeUnknown
);

const initializeConnection = (
  ws: WebSocket,
  publish: (message: M.ServerOutgoingMessage) => Effect.Effect<void>
) =>
  Effect.gen(function* (_) {
    const connectionsRef = yield* _(CurrentConnections);

    const { color, name } = yield* _(
      Effect.async<M.StartupMessage, ParseError>((emit) => {
        ws.once("message", (data) => {
          pipe(data, parseStartupMessage, emit);
        });
      })
    );

    // TODO! Check if the color is available and if the name is already taken
    yield* _(publish({ _tag: "join", name, color }));

    const connection: M.WebSocketConnection = {
      _rawWS: ws,
      name,
      color,
      timeConnected: Date.now(),
      send: (message) =>
        pipe(
          message,
          encodeMessage,
          Effect.andThen((msg) => Effect.sync(() => ws.send(msg)))
        ),
      close: Effect.sync(() => ws.close()),
    };

    yield* _(
      Ref.update(connectionsRef, (connections) =>
        HashMap.set(connections, name, connection)
      )
    );

    const rawMessagesStream = Stream.async<RawData, Error>((emit) => {
      ws.on("message", (data) => {
        emit(Effect.succeed(Chunk.of(data)));
      });
      ws.on("error", (err) => {
        emit(Effect.fail(Option.some(err)));
      });
      ws.on("close", () => {
        emit(Effect.fail(Option.none()));
      });
    });

    const parsedMessagesStream = pipe(
      rawMessagesStream,
      Stream.mapEffect(parseMessage),
      Stream.map((message) => ({
        ...message,
        name,
        color,
        timestamp: Date.now(),
      })),
      Stream.concat(Stream.make({ _tag: "leave", name, color } as const))
    );

    yield* _(Stream.runForEach(parsedMessagesStream, publish));
  });

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
