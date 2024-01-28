import type { ParseError } from "@effect/schema/ParseResult";
import * as S from "@effect/schema/Schema";
import {
  Context,
  PubSub,
  HashMap,
  Ref,
  Stream,
  Data,
  Fiber,
  Queue,
} from "effect";

export const StartupMessage = S.struct({
  _tag: S.literal("startup"),
  name: S.string,
});

export const StartupMessageFromJSON = S.parseJson(StartupMessage);

export type StartupMessage = S.Schema.To<typeof StartupMessage>;

export class BadStartupMessageError extends Data.TaggedError(
  "BadStartupMessage"
)<{
  readonly parseError: ParseError;
}> {}

export const ServerIncomingMessage = S.union(
  S.struct({
    _tag: S.literal("message"),
    message: S.string,
  })
);

export const ServerIncomingMessageFromJSON = S.parseJson(ServerIncomingMessage);

export type ServerIncomingMessage = S.Schema.To<typeof ServerIncomingMessage>;

export class UnknownIncomingMessageError extends Data.TaggedError(
  "UnknownIncomingMessage"
)<{
  readonly rawMessage: string;
  readonly parseError: ParseError;
}> {}

export class WebSocketError extends Data.TaggedError("WebSocketError")<{
  readonly error: Error;
}> {}

export const ServerOutgoingMessage = S.union(
  S.struct({
    _tag: S.literal("message"),
    name: S.string,
    message: S.string,
    timestamp: S.number,
  }),
  S.struct({
    _tag: S.literal("join"),
    name: S.string,
  }),
  S.struct({
    _tag: S.literal("leave"),
    name: S.string,
  })
);
export const ServerOutgoingMessageFromJSON = S.parseJson(ServerOutgoingMessage);
export type ServerOutgoingMessage = S.Schema.To<typeof ServerOutgoingMessage>;

export interface WebSocketConnection<Incoming, Outgoing> {
  readonly _rawWS: WebSocket;
  readonly name: string;
  readonly timeConnected: number;
  readonly messages: Stream.Stream<never, never, Incoming>;
  readonly send: Queue.Enqueue<Outgoing>;
  readonly sendFiber: Fiber.Fiber<never, void>;
}
