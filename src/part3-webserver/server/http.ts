import * as Http from "@effect/platform-node/HttpServer";
import { Config, Effect, Layer } from "effect";
import { NodeServer } from "./node";
import { getAvailableColors } from "./shared";
import { Schema } from "@effect/schema";
import { AvailableColorsResponseFromJSON } from "./model";

export const HTTPServerLive = Layer.scoped(
  Http.server.Server,
  NodeServer.pipe(
    Effect.zip(Config.integer("PORT").pipe(Config.withDefault(3000))),
    Effect.flatMap(([server, port]) => Http.server.make(() => server, { port }))
  )
);

export const HttpLive = Http.router.empty.pipe(
  Http.router.get(
    "/colors",
    Effect.gen(function* (_) {
      const availableColors = yield* _(getAvailableColors);
      return yield* _(
        Http.response.schemaJson(AvailableColorsResponseFromJSON)({
          _tag: "availableColors",
          colors: availableColors,
        })
      );
    })
  ),
  Http.server.serve(Http.middleware.logger)
);
