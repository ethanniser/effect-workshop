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

import * as C from "./config.ts";
import * as M from "./model.ts";
import {
  type CurrentConnections,
  HttpServer as _HttpServer,
  getAvailableColors,
} from "./shared.ts";

export const HTTPServerLive: Layer.Layer<
  HttpServer.HttpServer,
  ConfigError | HttpServerError.ServeError,
  _HttpServer
> = Layer.effect(
  HttpServer.HttpServer,
  Effect.gen(function* () {
    const server = yield* _HttpServer;
    const port = yield* C.PORT;
    return yield* NodeHttpServer.make(() => server, { port });
  })
).pipe(HttpServer.withLogAddress);

const Routes = HttpRouter.use(
  Effect.fn(function* (router) {
    yield* router.add(
      "GET",
      "/colors",
      Effect.gen(function* () {
        const availableColors = yield* getAvailableColors;

        return yield* pipe(
          M.AvailableColorsResponse.make({
            _tag: "availableColors",
            colors: availableColors,
          }),
          HttpServerResponse.schemaJson(M.AvailableColorsResponse)
        );
      })
    );
  })
);

export const Live: Layer.Layer<
  never,
  never,
  CurrentConnections | HttpServer.HttpServer
> = HttpRouter.serve(Routes, {
  middleware: HttpMiddleware.logger,
});
