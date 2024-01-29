import type { Stream, Fiber, Queue } from "effect";
import {
  StartupMessage,
  StartupMessageFromJSON,
  BadStartupMessageError,
  ServerIncomingMessage as ClientOutgoingMessage,
  ServerIncomingMessageFromJSON as ClientOutgoingMessageFromJSON,
  ServerOutgoingMessage as ClientIncomingMessage,
  ServerOutgoingMessageFromJSON as ClientIncomingMessageFromJSON,
  WebSocketError,
  UnknownIncomingMessageError,
  type WebSocketConnection,
} from "../shared/model";
export {
  StartupMessage,
  StartupMessageFromJSON,
  BadStartupMessageError,
  ClientOutgoingMessage,
  ClientOutgoingMessageFromJSON,
  ClientIncomingMessage,
  ClientIncomingMessageFromJSON,
  WebSocketError,
  UnknownIncomingMessageError,
};

export interface ClientWebSocketConnection
  extends WebSocketConnection<ClientIncomingMessage, ClientOutgoingMessage> {}
