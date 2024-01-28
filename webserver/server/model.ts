import { PubSub, HashMap, Ref, Stream, Fiber } from "effect";
import {
  BadStartupMessageError,
  ServerIncomingMessage,
  StartupMessage,
  UnknownIncomingMessageError,
  WebSocketError,
  ServerOutgoingMessage,
  StartupMessageFromJSON,
  ServerIncomingMessageFromJSON,
  ServerOutgoingMessageFromJSON,
  type WebSocketConnection,
} from "../shared/model";

export {
  BadStartupMessageError,
  ServerIncomingMessage,
  StartupMessage,
  UnknownIncomingMessageError,
  WebSocketError,
  ServerOutgoingMessage,
  StartupMessageFromJSON,
  ServerIncomingMessageFromJSON,
  ServerOutgoingMessageFromJSON,
};

export type ConnectionStore = Ref.Ref<
  HashMap.HashMap<string, ServerWebSocketConnection>
>;
export type MessagePubSub = PubSub.PubSub<ServerOutgoingMessage>;

export type ServerWebSocketConnection = WebSocketConnection<
  ServerIncomingMessage,
  ServerOutgoingMessage
>;
