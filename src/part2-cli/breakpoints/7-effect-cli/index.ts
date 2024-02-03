import { Console, Effect, Function, Layer, Match, Option, pipe } from "effect";
import * as M from "./model";
import * as S from "@effect/schema/Schema";
import { FileSystem, Runtime, BunContext } from "@effect/platform-bun";
import * as Http from "@effect/platform-bun/HttpClient";

const StringPairsFromStrings = S.array(S.string).pipe(
  S.filter((arr) => arr.every((s) => s.split(": ").length === 2)),
  S.transform(
    S.array(S.tuple(S.string, S.string)),
    (arr) =>
      arr.map((s) => s.split(": ") as unknown as readonly [string, string]),
    (arr) => arr.map((s) => s.join(": "))
  )
);

function getCliOption(
  cliArgs: string[],
  option: { name: string; alias?: string }
): Option.Option<string> {
  return Option.gen(function* (_) {
    const index = yield* _(
      cliArgs.findIndex(
        (arg) => arg === `--${option.name}` || arg === `-${option.alias}`
      ),
      (_) => (_ === -1 ? Option.none() : Option.some(_))
    );
    const nextIndex = index + 1;
    const value = yield* _(Option.fromNullable(cliArgs[nextIndex]));
    return value;
  });
}

function getCliOptionMultiple(
  cliArgs: string[],
  option: { name: string; alias?: string }
): string[] {
  const indexes = cliArgs.reduce((acc, arg, index) => {
    if (arg === `--${option.name}` || arg === `-${option.alias}`) {
      if (index > cliArgs.length - 1) {
        return acc;
      }
      acc.push(index);
    }
    return acc;
  }, [] as number[]);
  return indexes.reduce((acc, index) => {
    acc.push(cliArgs[index + 1]!);
    return acc;
  }, [] as string[]);
}

const CliOptionsLive = Layer.effect(
  M.CLIOptions,
  Effect.gen(function* (_) {
    const args = yield* _(Effect.sync(() => process.argv));

    const method = getCliOption(args, { name: "method", alias: "X" }).pipe(
      Option.getOrElse(() => "GET")
    );

    const data = getCliOption(args, { name: "data", alias: "d" });

    const headers = yield* _(
      getCliOptionMultiple(args, { name: "headers", alias: "H" }),
      S.decode(StringPairsFromStrings),
      Effect.mapError(() => new M.HeaderParseError())
    );

    const output = getCliOption(args, { name: "output", alias: "O" });
    const include = getCliOption(args, { name: "include", alias: "i" }).pipe(
      Option.flatMap((_) =>
        ["true", "false"].includes(_) ? Option.some(_) : Option.none()
      ),
      Option.map((_) => _ === "true")
    );

    const url = yield* _(
      Option.fromNullable("https://jsonplaceholder.typicode.com/posts/1"),
      Effect.mapError(
        () => new M.CliOptionsParseError({ error: "No url provided" })
      )
    );

    return {
      url,
      method,
      data,
      headers,
      output,
      include,
    };
  })
);

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

pipe(
  main,
  Effect.provide(CliOptionsLive),
  Effect.provide(Http.client.layer),
  Effect.provide(BunContext.layer),
  Runtime.runMain
);
