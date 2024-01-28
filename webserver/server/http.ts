import * as Http from "@effect/platform-node/HttpServer";
import { Config, Effect, Layer } from "effect";
import { NodeServer } from "./node";

export const HTTPServerLive = Layer.scoped(
  Http.server.Server,
  NodeServer.pipe(
    Effect.zip(Config.number("PORT").pipe(Config.withDefault(3000))),
    Effect.flatMap(([server, port]) => Http.server.make(() => server, { port }))
  )
);

export const HttpLive = Http.router.empty.pipe(
  Http.router.get("/test", Http.response.text("HTTP!")),
  Http.server.serve(Http.middleware.logger)
);
