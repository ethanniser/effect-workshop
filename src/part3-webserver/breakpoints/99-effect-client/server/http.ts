import { NodeHttpServer } from "@effect/platform-node";
import { Effect, Layer, pipe } from "effect";
import type { ConfigError } from "effect/Config";
import {
  HttpMiddleware,
  HttpRouter,
  HttpServer,
  type HttpServerError,
  HttpServerResponse,
} from "effect/unstable/http";

import * as C from "../shared/config.ts";
import * as M from "./model.ts";
import { NodeServer } from "./node.ts";
import { type ConnectionStore, getAvailableColors } from "./shared.ts";

export const HTTPServerLive: Layer.Layer<
  HttpServer.HttpServer,
  ConfigError | HttpServerError.ServeError,
  NodeServer
> = Layer.effect(
  HttpServer.HttpServer,
  Effect.gen(function* () {
    const server = yield* NodeServer;
    const port = yield* C.PORT;
    return yield* NodeHttpServer.make(() => server, { port });
  })
);

const Routes = HttpRouter.use(
  Effect.fn(function* (router) {
    yield* router.add(
      "GET",
      "/colors",
      Effect.flatMap(getAvailableColors, (colors) =>
        pipe(
          M.AvailableColorsResponse.make({ _tag: "availableColors", colors }),

          HttpServerResponse.schemaJson(M.AvailableColorsResponse)
        )
      )
    );
  })
);

export const HttpLive: Layer.Layer<
  never,
  never,
  HttpServer.HttpServer | ConnectionStore
> = HttpRouter.serve(Routes, {
  middleware: HttpMiddleware.logger,
});
