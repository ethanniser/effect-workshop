import { Context, Data, Effect, HashMap, Layer } from "effect";

type FetchError = Data.TaggedEnum<{
  UnknownError: {
    error: unknown;
  };
  TextDecodeError: {};
}>;

const { UnknownError, TextDecodeError } = Data.taggedEnum<FetchError>();

class FetchResponse extends Data.TaggedClass("FetchResponse")<{
  readonly status: number;
  readonly statusText: string;
  readonly headers: HashMap.HashMap<string, string>;
  readonly body?: string;
}> {}

interface FetchOptions {
  readonly method: "GET" | "POST" | "PUT" | "DELETE";
  readonly body?: string;
  readonly headers?: HashMap.HashMap<string, string>;
}

interface HttpClient {
  readonly _tag: "HttpClient";
  readonly fetch: (
    url: string,
    options?: FetchOptions
  ) => Effect.Effect<never, FetchError, FetchResponse>;
}

export const HttpClient = Context.Tag<HttpClient>("HttpClient");

export const HttpClientLive = Layer.succeed(HttpClient, {
  _tag: "HttpClient",
  fetch(url, options) {
    return Effect.gen(function* (_) {
      const response = yield* _(
        Effect.tryPromise({
          try: (signal) =>
            fetch(url, {
              signal,
              ...(options?.method && { method: options.method }),
              ...(options?.body && { body: options.body }),
              ...(options?.headers && {
                headers: HashMap.toEntries(options.headers),
              }),
            }),

          catch: (error) => UnknownError({ error }),
        })
      );

      const text = yield* _(
        Effect.tryPromise({
          try: () => response.text(),
          catch: () => TextDecodeError(),
        })
      );

      return new FetchResponse({
        status: response.status,
        statusText: response.statusText,
        headers: HashMap.fromIterable(response.headers.entries()),
        body: text,
      });
    });
  },
});
