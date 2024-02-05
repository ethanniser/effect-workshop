import { Context, Layer } from "effect";
import { createServer } from "node:http";

export class NodeServer extends Context.Tag("NodeServer")<
  NodeServer,
  ReturnType<typeof createServer>
>() {}
export const NodeServerLive = Layer.sync(NodeServer, createServer);
