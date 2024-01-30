import {
  Console,
  Effect,
  Fiber,
  Match,
  Queue,
  Ref,
  Stream,
  pipe,
} from "effect";
import { BunContext, Runtime, Terminal } from "@effect/platform-bun";
import { Command, Prompt } from "@effect/cli";
import { WebSocketConnection, WebSocketConnectionLive } from "./ws";
import chalk from "chalk";
import * as M from "./model";
import * as C from "../shared/config";
import * as Http from "@effect/platform-node/HttpClient";

const colorText = (text: string, color: M.Color): string => chalk[color](text);

const write = (bufferRef: Ref.Ref<readonly string[]>) =>
  Effect.gen(function* (_) {
    const terminal = yield* _(Terminal.Terminal);
    const buffer = yield* _(Ref.get(bufferRef));
    yield* _(terminal.display("\x1Bc"));
    const prompt = "\nENTER MESSAGE >> ";
    const messages = buffer.join("\n") + prompt;
    yield* _(terminal.display(messages));
  });

// TODO: get avaialble colors from server with http client and display them in the prompt

const getAvailableColors = Effect.gen(function* (_) {
  const fetch = yield* _(Http.client.Client);
  const PORT = yield* _(C.PORT);
  const HOST = yield* _(C.HOST);
  const request = Http.request.get(`http://${HOST}:${PORT}/colors`);
  const response = yield* _(fetch(request));
  const colors = yield* _(
    Http.response.schemaBodyJson(M.AvailableColorsResponseFromJSON)(response)
  );
  return colors.colors;
});

const rootCommand = Command.make("root", {}, () =>
  Effect.gen(function* (_) {
    const name = yield* _(Prompt.text({ message: "Please enter your name" }));
    const avaialbleColors = yield* _(getAvailableColors);

    if (avaialbleColors.length === 0) {
      return yield* _(Console.error("Server is full!"));
    }

    const color = yield* _(
      Prompt.select({
        message: "Please select a color",
        choices: avaialbleColors.map((color) => ({
          title: color,
          value: color,
        })),
      })
    );
    const displayBuffer = yield* _(
      Ref.make<readonly string[]>([`Connected to server as ${name}`])
    );
    yield* _(write(displayBuffer));
    yield* _(
      Effect.gen(function* (_) {
        const wsConnection = yield* _(WebSocketConnection);
        const terminal = yield* _(Terminal.Terminal);
        const recieveFiber = yield* _(
          wsConnection.messages,
          Stream.map((message) =>
            Match.value(message).pipe(
              Match.when({ _tag: "join" }, (_) => {
                const coloredName = colorText(_.name, _.color);
                return `${coloredName} has joined the chat.`;
              }),
              Match.when({ _tag: "leave" }, (_) => {
                const coloredName = colorText(_.name, _.color);
                return `${coloredName} has left the chat.`;
              }),
              Match.when({ _tag: "message" }, (_) => {
                const time = new Date(_.timestamp).toLocaleTimeString();
                const coloredName = colorText(_.name, _.color);
                return `${time} - ${coloredName}: ${_.message}`;
              }),
              Match.exhaustive
            )
          ),
          Stream.tap((message) =>
            pipe(
              terminal.columns,
              Effect.flatMap((columns) =>
                Ref.getAndUpdate(displayBuffer, (buffer) => {
                  if (buffer.length >= columns - 1) {
                    return buffer.slice(1).concat(message);
                  }
                  return buffer.concat(message);
                })
              ),
              Effect.zip(write(displayBuffer))
            )
          ),
          Stream.catchAll((error) => Effect.logError(error)),
          Stream.runDrain,
          Effect.fork
        );

        const readFiber = yield* _(
          terminal.readLine,
          Effect.flatMap((message) =>
            Queue.offer(wsConnection.send, { _tag: "message", message })
          ),
          Effect.forever,
          Effect.fork
        );

        yield* _(Fiber.joinAll([recieveFiber, readFiber]));
      }),
      Effect.provide(WebSocketConnectionLive(name, color))
    );
  })
);

const run = rootCommand.pipe(
  Command.withDescription("a chat client"),
  Command.run({
    name: "Chat",
    version: "1.0.0",
  })
);

const main = Effect.suspend(() => run(globalThis.process.argv));

main.pipe(
  Effect.provide(BunContext.layer),
  Effect.provide(Http.client.layer),
  Runtime.runMain
);
