import { Data, Effect } from "effect";

type FetchError = Data.TaggedEnum<{
  NetworkError: {};
  TimeoutError: {};
}>;

const { NetworkError, TimeoutError } = Data.taggedEnum<FetchError>();

interface HttpClient extends Data.Case {
  readonly _tag: "HttpClient";
  readonly fetch: (url: string) => Effect.Effect<never, FetchError, string>;
}

const HttpClient = Data.tagged<HttpClient>("HttpClient");
