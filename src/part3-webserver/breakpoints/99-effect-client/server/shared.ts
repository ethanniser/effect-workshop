import { Context, Effect, HashMap, Layer, Ref, pipe } from "effect";

import * as M from "./model.ts";

export class ConnectionStore extends Context.Service<
  ConnectionStore,
  M.ConnectionStore
>()("ConnectionStore") {
  public static readonly Live = Layer.effect(
    ConnectionStore,
    Ref.make(HashMap.empty<string, M.ServerWebSocketConnection>())
  );
}

export const getAvailableColors: Effect.Effect<
  M.Color[],
  never,
  ConnectionStore
> = Effect.gen(function* () {
  const store = yield* ConnectionStore;
  const connectionsMap = yield* Ref.get(store);
  const usedColors = Array.from(HashMap.values(connectionsMap)).map(
    (_) => _.color
  );
  return M.colors.filter((color) => !usedColors.includes(color));
});
