import { Console, Effect, Function, Layer, Match, Option, pipe } from "effect";
import * as M from "./model";
import * as S from "@effect/schema/Schema";
import { BunRuntime, BunContext } from "@effect/platform-bun";
import { FileSystem } from "@effect/platform";
import * as Http from "@effect/platform/HttpClient";
import { Command, Options, Args } from "@effect/cli";

const main = Effect.gen(function* (_) {
  const options = yield* _(M.CLIOptions);

  const fetch = yield* _(Http.client.Client);

  const body = Option.getOrUndefined(options.data);

  const req = yield* _(
    Match.value(options.method)
      .pipe(
        Match.when("GET", () => Http.request.get),
        Match.when("POST", () => Http.request.post),
        Match.when("PUT", () => Http.request.put),
        Match.when("PATCH", () => Http.request.patch),
        Match.when("DELETE", () => Http.request.del),
        Match.option
      )
      .pipe(
        Effect.map((reqBuilder) =>
          reqBuilder(options.url).pipe(
            Http.request.setHeaders(options.headers),
            body ? Http.request.textBody(body) : Function.identity
          )
        )
      )
  );

  const res = yield* _(fetch(req));

  const buffer: string[] = [];

  if (Option.isSome(options.include)) {
    buffer.push(`${res.status}`);
    Object.entries(res.headers).forEach(([key, value]) => {
      buffer.push(`${key}: ${value}`);
    });
    // Add an empty line to separate headers from body
    buffer.push("");
  }

  const text = yield* _(res.text);
  buffer.push(text);

  const finalString = buffer.join("\n");

  const fs = yield* _(FileSystem.FileSystem);
  yield* _(
    Effect.matchEffect(options.output, {
      onSuccess: (output) => fs.writeFileString(output, finalString),
      onFailure: () => Console.log(finalString),
    })
  );
});

const StringPairsFromStrings = S.array(S.string).pipe(
  S.filter((arr) => arr.every((s) => s.split(": ").length === 2)),
  S.transform(
    S.array(S.tuple(S.string, S.string)),
    (arr) =>
      arr.map((s) => s.split(": ") as unknown as readonly [string, string]),
    (arr) => arr.map((s) => s.join(": "))
  )
);

const urlArg = Args.text({ name: "url" }).pipe(
  Args.withDescription("The URL to send the request to")
);

const methodOption = Options.text("method").pipe(
  Options.withAlias("X"),
  Options.withDescription("The HTTP method to use"),
  Options.withSchema(S.literal("GET", "POST", "PUT", "PATCH", "DELETE")),
  Options.withDefault("GET")
);

const dataOption = Options.text("data").pipe(
  Options.withAlias("d"),
  Options.withDescription("The body of the request"),
  Options.optional
);

const headersOption = Options.text("header").pipe(
  Options.withAlias("H"),
  Options.withDescription("The headers to send with the request"),
  Options.repeated,
  Options.withSchema(StringPairsFromStrings)
);

const outputOption = Options.file("output").pipe(
  Options.withAlias("o"),
  Options.withDescription("The file to write the response to"),
  Options.optional
);

const includeOption = Options.boolean("include").pipe(
  Options.withAlias("i"),
  Options.withDescription("Include the response headers in the output"),
  Options.optional
);

const cli = pipe(
  Command.make("root", {
    url: urlArg,
    method: methodOption,
    data: dataOption,
    headers: headersOption,
    output: outputOption,
    include: includeOption,
  }),
  Command.withHandler(() => main),
  Command.provideSync(M.CLIOptions, (_) => _),
  Command.run({
    name: "bend",
    version: "1.0.0",
  }),
  (run) => Effect.suspend(() => run(process.argv))
);

pipe(
  cli,
  Effect.provide(Http.client.layer),
  Effect.provide(BunContext.layer),
  BunRuntime.runMain
);
