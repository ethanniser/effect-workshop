import { Context, Layer } from "effect";
import { createServer } from "node:http";

type NodeServer = {
  readonly _: unique symbol;
};
export const NodeServer = Context.Tag<
  NodeServer,
  ReturnType<typeof createServer>
>();
export const NodeServerLive = Layer.sync(NodeServer, createServer);
