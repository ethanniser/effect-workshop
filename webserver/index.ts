import * as Http from "@effect/platform-node/HttpServer";
import * as NodeContext from "@effect/platform-node/NodeContext";
import { runMain } from "@effect/platform-node/Runtime";
import * as Schema from "@effect/schema/Schema";
import { Console, Either, Match, Stream } from "effect";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { createServer } from "node:http";
import * as Chat from "./chat";

const ServerLive = Http.server.layer(() => createServer(), { port: 3000 });
const StartMessage = Effect.gen(function* (_) {
  const server = yield* _(Http.server.Server);
  const formattedAddress = Match.value(server.address).pipe(
    Match.when({ _tag: "UnixAddress" }, (address) => address.path),
    Match.when(
      { _tag: "TcpAddress" },
      (address) => `http://localhost:${address.port}`
    ),
    Match.exhaustive
  );
  yield* _(Console.log(`Server started on ${formattedAddress}`));
});

const sendSchema = Schema.struct({
  name: Schema.string,
  message: Schema.string,
});

const recieveSchema = Schema.struct({
  name: Schema.string,
  lastRecievedTimestamp: Schema.DateFromString,
});

const HttpLive = Http.router.empty.pipe(
  Http.router.post(
    "/send",
    Effect.gen(function* (_) {
      const body = yield* _(Http.request.schemaBodyJson(sendSchema));
      const result = yield* _(
        Chat.send(body.name, body.message),
        Effect.either
      );
      return Either.match(result, {
        onRight: () => Http.response.empty().pipe(Http.response.setStatus(200)),
        onLeft: (error) =>
          Http.response
            .text("Error: could not send message")
            .pipe(Http.response.setStatus(500)),
      });
    })
  ),
  Http.router.get(
    "/recieve",
    Effect.gen(function* (_) {
      const { searchParams } = yield* _(Http.router.RouteContext);
      const query = yield* _(Schema.decodeUnknown(recieveSchema)(searchParams));
      return yield* _(
        Http.response.json({
          name: query.name,
          message: "Hello World!",
        })
      );
    })
  ),
  Http.router.get(
    "/test",
    Effect.gen(function* (_) {
      yield* _(Effect.addFinalizer(() => Console.log("Finalizing!")));
      return Http.response.text("Hello World!");
    })
  ),
  Http.server.serve(Http.middleware.logger),
  Layer.merge(Layer.effectDiscard(StartMessage)),
  Layer.provide(ServerLive),
  Layer.provide(NodeContext.layer),
  Layer.provide(Chat.ChatLive)
);

runMain(Layer.launch(HttpLive));
