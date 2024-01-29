import { Context, Effect, HashMap, Layer, Ref } from "effect";
import * as M from "./model";

export const ConnectionStore = Context.Tag<M.ConnectionStore>();
export const ConnectionStoreLive = Layer.effect(
  ConnectionStore,
  Ref.make(HashMap.empty<string, M.ServerWebSocketConnection>())
);

export const getAvailableColors = Effect.gen(function* (_) {
  const store = yield* _(ConnectionStore);
  const connectionsMap = yield* _(Ref.get(store));
  const usedColors = Array.from(HashMap.values(connectionsMap)).map(
    (_) => _.color
  );
  return M.colors.filter((color) => !usedColors.includes(color));
});
