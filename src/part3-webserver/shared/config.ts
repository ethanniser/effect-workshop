import { Config } from "effect";

export const PORT = Config.integer("PORT").pipe(Config.withDefault(3000));
export const HOST = Config.string("HOST").pipe(Config.withDefault("localhost"));
