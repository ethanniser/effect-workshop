import {
  Chunk,
  Console,
  Effect,
  HashMap,
  Layer,
  Match,
  Option,
  Ref,
  Schedule,
  Stream,
  pipe,
} from "effect";
import { CurrentConnections, WSSServer, getAvailableColors } from "./shared";
import * as M from "./model";
import * as S from "@effect/schema/Schema";
import type { WebSocket, WebSocketServer } from "ws";
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
  }).pipe(Stream.tap(() => Console.log("New connection")));

const parseMessage = pipe(S.parseJson(M.ServerIncomingMessage), S.decode);

const encodeMessage = pipe(S.parseJson(M.ServerOutgoingMessage), S.encode);

const parseStartupMessage = pipe(S.parseJson(M.StartupMessage), S.decode);

const initializeConnection = (
  ws: WebSocket,
  publish: (message: M.ServerOutgoingMessage) => Effect.Effect<void>
) =>
  Effect.gen(function* (_) {
    console.log("Initializing connection");
    const connectionsRef = yield* _(CurrentConnections);

    const { color, name } = yield* _(
      Effect.async<M.StartupMessage, ParseError>((emit) => {
        ws.once("message", (data) => {
          pipe(data.toString(), parseStartupMessage, emit);
        });
      }),
      Effect.mapError(
        (parseError) =>
          new M.BadStartupMessageError({
            error: { _tag: "parseError", parseError },
          })
      ),
      Effect.flatMap((message) =>
        Effect.gen(function* (_) {
          const availableColors = yield* _(getAvailableColors);
          if (!availableColors.includes(message.color)) {
            yield* _(
              new M.BadStartupMessageError({
                error: {
                  _tag: "colorAlreadyTaken",
                  color: message.color,
                },
              })
            );
          }
          return message;
        })
      )
    );

    yield* _(Console.log(`New connection: ${name} (${color})`));
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

    const rawMessagesStream = Stream.async<string, Error>((emit) => {
      ws.on("message", (data) => {
        emit(Effect.succeed(Chunk.of(data.toString())));
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
      Stream.mapError(
        (parseError) => new M.UnknownIncomingMessageError({ parseError })
      ),
      Stream.map((message) => ({
        ...message,
        name,
        color,
        timestamp: Date.now(),
      })),
      Stream.concat(Stream.make({ _tag: "leave", name, color } as const)),
      Stream.tapError((err) => Console.error(err))
    );

    yield* _(Stream.runForEach(parsedMessagesStream, publish));
  });

export const Live = Layer.effectDiscard(
  Effect.gen(function* (_) {
    const wss = yield* _(WSSServer);
    const currentConnectionsRef = yield* _(CurrentConnections);
    const publish = (message: M.ServerOutgoingMessage) =>
      Effect.gen(function* (_) {
        console.log("Publishing message", message);
        const connections = yield* _(Ref.get(currentConnectionsRef));
        yield* _(
          Effect.forEach(HashMap.values(connections), (conn) =>
            conn.send(message)
          )
        );
      }).pipe(
        Effect.catchAll((err) => Console.error(err)),
        Effect.asUnit
      );

    const connectionsStream = createConnectionsStream(wss).pipe(
      Stream.tapError((err) => Console.error(err))
    );
    yield* _(
      Stream.runForEach(connectionsStream, (ws) =>
        initializeConnection(ws, publish)
      )
    );
    yield* _(
      Effect.gen(function* (_) {
        const connections = yield* _(Ref.get(currentConnectionsRef));
        yield* _(
          Console.log(`Current connections: ${HashMap.size(connections)}`)
        );
      }),
      Effect.repeat(Schedule.spaced("1 seconds"))
    );
    // hmmmm why dont these work?
  })
);
