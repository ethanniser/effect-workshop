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
import { Args, CliApp, Command, Options, ValidationError } from "@effect/cli";
import { HttpClient, HttpClientLive } from "./httpClient";
import { DurationFromString, HashMapFromStrings } from "./schema";
import * as ParseResult from "@effect/schema/ParseResult";

const textArg = Args.text({ name: "text" });
type CommandLineArgs = {
  readonly _: unique symbol;
};
const CommandLineArgs = Context.Tag<CommandLineArgs, string[]>(
  "CommandLineArgs"
);
const CliLive: Layer.Layer<
  CliApp.CliApp.Environment | CommandLineArgs,
  ValidationError.ValidationError,
  void
> = Command.make(
  "echo",
  {
    textArg,
  },
  ({ textArg }) => Console.log(textArg)
).pipe(
  Command.run({
    name: "echo",
    version: "1.0.0",
  })
) as any;

const CommandLineArgsLive = Layer.sync(
  CommandLineArgs,
  () => globalThis.process.argv
);

pipe(
  CliLive,
  Layer.provide(BunContext.layer),
  Layer.provide(CommandLineArgsLive),
  Layer.launch,
  Runtime.runMain
);
