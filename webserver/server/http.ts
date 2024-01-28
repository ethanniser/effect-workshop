import * as Http from "@effect/platform-node/HttpServer";
import { Effect, Layer } from "effect";
import { NodeServer } from "./node";

export const HTTPServerLive = Layer.scoped(
  Http.server.Server,
  NodeServer.pipe(
    Effect.flatMap((server) => Http.server.make(() => server, { port: 3000 }))
  )
);

export const HttpLive = Http.router.empty.pipe(
  Http.router.get("/test", Http.response.text("HTTP!")),
  Http.server.serve(Http.middleware.logger)
);
