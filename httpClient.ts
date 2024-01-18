import { Context, Data, Duration, Effect } from "effect";

type FetchError = Data.TaggedEnum<{
  UnknownError: {
    error: unknown;
  };
  TimeoutError: {};
  TextDecodeError: {};
}>;

const { UnknownError, TimeoutError, TextDecodeError } =
  Data.taggedEnum<FetchError>();

class FetchResponse extends Data.TaggedClass("FetchResponse")<{
  readonly status: number;
  readonly statusText: string;
  readonly headers: Map<string, string>;
  readonly body: string;
}> {}

interface FetchOptions {
  readonly timeout: Duration.Duration;
  readonly method: "GET" | "POST" | "PUT" | "DELETE";
  readonly body: string;
  readonly headers: Map<string, string>;
}

interface HttpClient {
  readonly _tag: "HttpClient";
  readonly fetch: (
    url: string,
    options?: FetchOptions
  ) => Effect.Effect<never, FetchError, FetchResponse>;
}

const HttpClient = Context.Tag<HttpClient>("HttpClient");

const HttpClientLive = HttpClient.of({
  _tag: "HttpClient",
  fetch(url, options) {
    return Effect.gen(function* (_) {
      const response = yield* _(
        Effect.tryPromise({
          try: (signal) =>
            fetch(url, {
              signal,
              method: options?.method,
              body: options?.body,
              headers: Object.fromEntries(options?.headers ?? []),
            }),
          catch: (error) => UnknownError({ error }),
        }),
        Effect.timeout(options?.timeout ?? Duration.infinity),
        Effect.mapError((error) => {
          if (error._tag === "NoSuchElementException") {
            return TimeoutError();
          }
          return error;
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
        headers: new Map(Object.entries(response.headers)),
        body: text,
      });
    });
  },
});
