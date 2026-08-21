import chalk from "chalk";
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
import type { ConfigError } from "effect/Config";
import { Command, Prompt } from "effect/unstable/cli";
import {
  FetchHttpClient,
  HttpClient,
  HttpClientResponse,
  type HttpClientError,
} from "effect/unstable/http";
import { BunRuntime, BunServices } from "@effect/platform-bun";
import { Terminal } from "effect";
import type { SchemaError } from "effect/Schema";
import type { PlatformError } from "effect/PlatformError";

import * as C from "../shared/config.ts";
import * as M from "./model.ts";
import { WebSocketConnection } from "./ws.ts";

const colorText = (text: string, color: M.Color): string => chalk[color](text);

const write = (
  bufferRef: Ref.Ref<readonly string[]>
): Effect.Effect<void, PlatformError, Terminal.Terminal> =>
  Effect.gen(function* () {
    const terminal = yield* Terminal.Terminal;

    const buffer = yield* Ref.get(bufferRef);

    yield* terminal.display("\x1Bc");

    const prompt = "\nENTER MESSAGE >> ";

    const messages = buffer.join("\n") + prompt;

    yield* terminal.display(messages);
  });

// TODO: get available colors from server with http client and display them in the prompt

const getAvailableColors: Effect.Effect<
  readonly M.Color[],
  | SchemaError
  | ConfigError
  | HttpClientError.HttpClientError,
  HttpClient.HttpClient
> = Effect.gen(function* () {
  const client: HttpClient.HttpClient = yield* HttpClient.HttpClient;

  const PORT: number = yield* C.PORT;

  const HOST: string = yield* C.HOST;

  const response: HttpClientResponse.HttpClientResponse = yield* client.get(
    `http://${HOST}:${PORT}/colors`
  );

  const { colors } = yield* pipe(
    response,
    HttpClientResponse.schemaBodyJson(M.AvailableColorsResponse)
  );

  return colors;
}).pipe(Effect.scoped);

const rootCommand = Command.make("root", {}, () =>
  Effect.gen(function* () {
    const name = yield* Prompt.text({ message: "Please enter your name" });

    const availableColors = yield* getAvailableColors;

    if (availableColors.length === 0) {
      return yield* Console.error("Server is full!");
    }

    const color = yield* Prompt.select({
      message: "Please select a color",
      choices: availableColors.map((color) => ({
        title: color,
        value: color,
      })),
    });

    const displayBuffer = yield* Ref.make<readonly string[]>([
      `Connected to server as ${name}`,
    ]);

    yield* write(displayBuffer);

    yield* Effect.gen(function* () {
      const wsConnection = yield* WebSocketConnection;

      const terminal = yield* Terminal.Terminal;

      const recieveFiber = yield* pipe(
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

        Stream.catchCause(() => Stream.empty),

        Stream.runDrain,

        Effect.forkChild
      );

      const readFiber = yield* pipe(
        terminal.readLine,

        Effect.flatMap((message) =>
          Queue.offer(wsConnection.send, { _tag: "message", message })
        ),

        Effect.forever,

        Effect.forkChild
      );

      yield* Fiber.joinAll([recieveFiber, readFiber]);
    }).pipe(Effect.provide(WebSocketConnection.Live(name, color)));
  })
);

const run = rootCommand.pipe(
  Command.withDescription("a chat client"),
  Command.run({
    version: "1.0.0",
  })
);

const main = Effect.suspend(() => run);

main.pipe(
  Effect.provide(BunServices.layer),
  Effect.provide(FetchHttpClient.layer),
  BunRuntime.runMain
);
