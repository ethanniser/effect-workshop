import { createServer } from "node:http";
import { Context, Layer } from "effect";

export class NodeServer extends Context.Service<
  NodeServer,
  ReturnType<typeof createServer>
>()("NodeServer") {
  public static readonly Live = Layer.sync(NodeServer, createServer);
}
