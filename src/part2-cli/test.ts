#!/usr/bin/env bun

import {
  Config,
  ConfigError,
  ConfigProvider,
  Console,
  Context,
  Data,
  Duration,
  Effect,
  Either,
  HashMap,
  Layer,
  Option,
  Schedule,
  pipe,
} from "effect";
import * as Schema from "@effect/schema/Schema";
import { BunContext, Runtime, FileSystem } from "@effect/platform-bun";
import { Args, Command, Options } from "@effect/cli";
import { HttpClient, HttpClientLive } from "./httpClient";
import { DurationFromString, HashMapFromStrings } from "./schema";
import * as ParseResult from "@effect/schema/ParseResult";
import * as Http from "@effect/platform-bun/HttpClient";

const fooOption = Options.text("foo");

const Tag = Context.Tag<string>("tag");

const handle = Effect.flatMap(Tag, (_) => Console.log(_));

const run = Command.make("bend", { fooOption }).pipe(
  Command.withHandler(() => handle),
  Command.provideEffect(Tag, ({ fooOption }) =>
    Effect.succeed(Tag.of(fooOption))
  ),
  Command.withDescription("an effect http client"),
  Command.run({
    name: "Test",
    version: "1.0.0",
  })
);

const main = Effect.suspend(() => run(globalThis.process.argv.slice(2)));

main.pipe(
  Effect.provide(BunContext.layer),
  Effect.provide(HttpClientLive),
  Effect.withConfigProvider(
    ConfigProvider.nested(ConfigProvider.fromEnv(), "BEND")
  ),
  Effect.tapErrorCause(Effect.logError),
  Runtime.runMain
);

Http.headers.empty;
