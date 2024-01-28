import type { ParseError } from "@effect/schema/ParseResult";
import * as S from "@effect/schema/Schema";
import { Context, PubSub, HashMap, Ref, Stream, Data, Fiber } from "effect";

export const StartupMessage = S.struct({
  _tag: S.literal("startup"),
  name: S.string,
});

export const StartupMessageFromString = S.parseJson(StartupMessage);

export type StartupMessage = S.Schema.To<typeof StartupMessage>;

export class BadStartupMessageError extends Data.TaggedError(
  "BadStartupMessage"
)<{
  readonly rawMessage: string;
  readonly parseError: ParseError;
}> {}

export const IncomingMessage = S.union(
  S.struct({
    _tag: S.literal("message"),
    message: S.string,
  })
);

export const IncomingMessageFromString = S.parseJson(IncomingMessage);

export type IncomingMessage = S.Schema.To<typeof IncomingMessage>;

export class UnknownIncomingMessageError extends Data.TaggedError(
  "UnknownIncomingMessage"
)<{
  readonly rawMessage: string;
  readonly parseError: ParseError;
}> {}

export class WebSocketError extends Data.TaggedError("WebSocketError")<{
  readonly error: Error;
}> {}

export const OutgoingMessage = S.union(
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
export type OutgoingMessage = S.Schema.To<typeof OutgoingMessage>;

export type WebSocketConnection = {
  readonly _rawWS: WebSocket;
  readonly name: string;
  readonly messages: Stream.Stream<
    never,
    WebSocketError | UnknownIncomingMessageError,
    IncomingMessage
  >;
  readonly fiber: Fiber.Fiber<
    UnknownIncomingMessageError | WebSocketError,
    void
  >;
};

export type ConnectionStore = Ref.Ref<
  HashMap.HashMap<string, WebSocketConnection>
>;
export type MessagePubSub = PubSub.PubSub<OutgoingMessage>;
