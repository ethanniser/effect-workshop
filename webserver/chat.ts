import { Console, Context, Data, Effect, Layer, ReadonlyArray } from "effect";

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
    name: string,
    message: string
  ) => Effect.Effect<never, ChatSendError, void>;
  recieve: (
    name: string,
    lastRecievedTimestamp: Date
  ) => Effect.Effect<never, ChatRecieveError, readonly ChatMessage[]>;
};

const Chat = Context.Tag<Chat, ChatImpl>("Chat");
export const { recieve, send } = Effect.serviceFunctions(Chat);

export const ChatLive = Layer.succeed(
  Chat,
  Chat.of({
    send: (name, message) =>
      Console.log(`Sending message from ${name}: ${message}`),
    recieve: (name, lastRecievedTimestamp) => Effect.succeed([]),
  })
);
