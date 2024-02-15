import { Effect, Layer } from "effect";
import { HttpServer, getAvailableColors } from "./shared";
import * as M from "./model";

export const Live = Layer.effectDiscard(
  Effect.gen(function* (_) {
    const http = yield* _(HttpServer);
    const availableColors = yield* _(getAvailableColors);

    http.on("request", (req, res) => {
      if (req.url !== "/colors") {
        res.writeHead(404);
        res.end("Not Found");
        return;
      }

      const message: M.AvailableColorsResponse = {
        _tag: "availableColors",
        colors: availableColors,
      };
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(message));
    });
  })
);
