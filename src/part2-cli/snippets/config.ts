import { Effect, Config, Layer, ConfigProvider, pipe } from "effect";

// Configuration is an important part of any application
// But it tends to not be very type safe (looking at you, `process.env`)

// Effect's `Config` module provides a way to query a configuration in a type safe way
// As well as having a completely swappable backend

// To retrieve configuration value, we pass the string key to one of the primitive functions

const PORT = Config.number("PORT");
const HOST = Config.string("HOST");
const LOG_LEVEL = Config.logLevel("LOG_LEVEL");

// Configs are subtype of `Effect` so to get their value just use them in any effect context

const program = Effect.gen(function* (_) {
  const port = yield* _(PORT);
  const host = yield* _(HOST);
  const logLevel = yield* _(LOG_LEVEL);

  console.log(`Server starting on ${host}:${port} with log level ${logLevel}`);
});

// Notice how `ConfigError` now appears to represent if a configuration value is missing or invalid

// Config supports all of the combinators you are used to in effect

const config = Config.all({
  port: PORT,
  host: HOST,
  logLevel: LOG_LEVEL,
}).pipe(
  Config.map(({ port, host, logLevel }) => ({
    port,
    host,
    logLevel,
    url: `http://${host}:${port}`,
  }))
);

// other useful helpers
const secret = Config.secret("API_KEY");
// A secret is a value that will be redacted if printed to the console

const nested = Config.nested(config, "WEB");
// now maps to `WEB_PORT`, `WEB_HOST`, `WEB_LOG_LEVEL`

// Config has a completely swappable backend with the `ConfigProvider` interface
// The default backend simply reads from `process.env`

// You can provide your own, for example from a `Map`

const main = pipe(
  program,
  Effect.provide(
    Layer.setConfigProvider(
      ConfigProvider.fromMap(
        new Map([
          ["PORT", "3000"],
          ["HOST", "localhost"],
          ["LOG_LEVEL", "info"],
        ])
      )
    )
  )
);

// Other backends

ConfigProvider.fromEnv;
ConfigProvider.fromMap;
ConfigProvider.fromJson;
ConfigProvider.fromFlat;

// converting between key 'case' styles

ConfigProvider.kebabCase;
ConfigProvider.snakeCase;
ConfigProvider.constantCase;
ConfigProvider.lowerCase;
ConfigProvider.upperCase;
