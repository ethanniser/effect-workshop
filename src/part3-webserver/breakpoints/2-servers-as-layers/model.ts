import { Data, Schema as S } from "effect";
import type { SchemaError } from "effect/Schema";

export const colors = [
  "red",
  "green",
  "yellow",
  "blue",
  "magenta",
  "cyan",
  "white",
] as const;
export type Color = (typeof colors)[number];
export const Color = S.Literals([...colors]);

export const StartupMessage = S.Struct({
  _tag: S.Literal("startup"),
  color: Color,
  name: S.String,
});

export type StartupMessage = S.Schema.Type<typeof StartupMessage>;

export class BadStartupMessageError extends Data.TaggedError(
  "BadStartupMessage"
)<{
  readonly error:
    | { readonly _tag: "parseError"; readonly parseError: SchemaError }
    | { readonly _tag: "colorAlreadyTaken"; readonly color: Color };
}> {}

export const ServerIncomingMessage = S.Union([
  S.Struct({
    _tag: S.Literal("message"),
    message: S.String,
  })
]);

export type ServerIncomingMessage = S.Schema.Type<typeof ServerIncomingMessage>;

export class UnknownIncomingMessageError extends Data.TaggedError(
  "UnknownIncomingMessage"
)<{ readonly rawMessage: string; readonly parseError: SchemaError }> {}

export const ServerOutgoingMessage = S.Union([
  S.Struct({
    _tag: S.Literal("message"),
    name: S.String,
    color: Color,
    message: S.String,
    timestamp: S.Number,
  }),
  S.Struct({
    _tag: S.Literal("join"),
    name: S.String,
    color: Color,
  }),
  S.Struct({
    _tag: S.Literal("leave"),
    name: S.String,
    color: Color,
  })
]);
export type ServerOutgoingMessage = S.Schema.Type<typeof ServerOutgoingMessage>;

type WsWebSocket = import("ws").WebSocket;

export interface WebSocketConnection {
  readonly _rawWS: WsWebSocket;
  readonly name: string;
  readonly color: Color;
  readonly timeConnected: number;
}

export const AvailableColorsResponse = S.Struct({
  _tag: S.Literal("availableColors"),
  colors: S.Array(Color),
});

export type AvailableColorsResponse = S.Schema.Type<
  typeof AvailableColorsResponse
>;
