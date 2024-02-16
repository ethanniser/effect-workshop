import { Config } from "effect";

export const PORT = Config.integer("PORT").pipe(Config.withDefault(3000));
