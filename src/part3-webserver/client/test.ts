import { NodeContext, Runtime } from "@effect/platform-node";
import { Console, Effect } from "effect";
import * as Http from "@effect/platform-node/HttpClient";
import * as S from "@effect/schema/Schema";

const Todo = S.struct({
  userId: S.number,
  id: S.number,
  title: S.string,
  body: S.string,
});

const main = Effect.gen(function* (_) {
  const fetch = yield* _(Http.client.Client);
  const reqest = Http.request.get(
    "https://jsonplaceholder.typicode.com/posts/1"
  );
  const response = yield* _(fetch(reqest));
  const todo = yield* _(Http.response.schemaBodyJson(Todo)(response));
});

main.pipe(
  Effect.provide(NodeContext.layer),
  Effect.provide(Http.client.layer),
  Runtime.runMain
);
