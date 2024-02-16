import { Layer, pipe } from "effect";
import { BunRuntime } from "@effect/platform-bun";
import * as HTTP from "./http";
import * as WS from "./ws";
import * as SERVER from "./shared";

const serversLayer = Layer.merge(HTTP.Live, WS.Live);

pipe(
  Layer.merge(serversLayer, SERVER.ListenLive),
  Layer.provide(SERVER.WSSServer.Live),
  Layer.provide(SERVER.HttpServer.Live),
  Layer.provide(SERVER.CurrentConnections.Live),
  Layer.launch,
  BunRuntime.runMain
);
