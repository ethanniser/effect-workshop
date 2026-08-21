import { Config } from "effect";

export const PORT = Config.int("PORT").pipe(Config.withDefault(3000));
