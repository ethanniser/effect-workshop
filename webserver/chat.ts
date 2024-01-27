import { Console, Context, Data, Effect, Layer, Stream } from "effect";

type ChatMessage = {
  name: string;
  message: string;
  timestamp: Date;
};

class ChatSendError extends Data.TaggedError("ChatSendError") {}
class ChatRecieveError extends Data.TaggedError("ChatRecieveError") {}

type Chat = {
  readonly _: unique symbol;
};

type ChatImpl = {
  send: (
    stream: Stream.Stream<never, never, ChatMessage>
  ) => Effect.Effect<never, ChatSendError, void>;
  recieve: (
    name: string,
    lastRecievedTimestamp: Date
  ) => Stream.Stream<never, ChatRecieveError, ChatMessage>;
};

const Chat = Context.Tag<Chat, ChatImpl>("Chat");
// export const { recieve, send } = Effect.serviceFunctions(Chat);

export const ChatLive = Layer.succeed(Chat, Chat.of({} as ChatImpl));
