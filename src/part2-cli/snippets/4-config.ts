import { Config, ConfigProvider, Effect, pipe } from "effect";
import type { ConfigError } from "effect/Config";

/**
 * Configuration is an important part of any application.
 * But it tends to not be very type safe (looking at you, `process.env`)...
 *
 *
 * Effect's `Config` module provides a way to query a configuration in a type safe way
 * As well as having a completely swappable backend.
 *
 *
 * To retrieve configuration value, we pass the string key to one of the primitive functions
 */

const PORT = Config.number("PORT");
const HOST = Config.string("HOST");
const LOG_LEVEL = Config.logLevel("LOG_LEVEL");

/**
 * `Config` is yieldable so to get their value just use them in any effect context
 */
const program: Effect.Effect<void, ConfigError, never> = Effect.gen(
  function* () {
    const port: number = yield* PORT;
    const host: string = yield* HOST;
    const logLevel = yield* LOG_LEVEL;

    console.log(
      `Server starting on ${host}:${port} with log level ${logLevel}`
    );
  }
);
/**
 * Notice how `ConfigError` now appears to represent if a configuration value is missing or invalid
 */

/**
 * Config supports all of the combinators you are used to in effect
 */
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

/**
 * other useful helpers:
 */

/**
 * A secret is a value that will be redacted if printed to the console
 */
const secret = Config.redacted("API_KEY");

const nested = Config.nested(config, "WEB"); // now maps to `WEB_PORT`, `WEB_HOST`, `WEB_LOG_LEVEL`

/**
 * Config has a completely swappable backend with the `ConfigProvider` interface
 * The default backend simply reads from `process.env`
 *
 * You can provide your own, for example, from an object
 */

const main = pipe(
  program,
  Effect.provide(
    ConfigProvider.layer(
      ConfigProvider.fromUnknown({
        PORT: "3000",
        HOST: "localhost",
        LOG_LEVEL: "info",
      })
    )
  )
);

/**
 * Other backends
 */
ConfigProvider.fromEnv;
ConfigProvider.fromUnknown;
ConfigProvider.fromDotEnv;
ConfigProvider.fromDotEnvContents;

/**
 * converting between key 'case' styles, e.g. camelCase keys reading SCREAMING_SNAKE_CASE env vars
 */
ConfigProvider.constantCase;
