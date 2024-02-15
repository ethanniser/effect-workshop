## 1 -> 2 - Servers as Layers

- Make `Tag` for http and ws servers
- Make `Layer` for http with `sync`
- Make `Layer` for ws with `effect`, first using http
- 'Listen' `effectDiscard` layer that listens
- `main` is a big `effectDiscard` layer that has 90% of the original code, just first gets the servers through context then attaches all listeners
- `Layer.merge` `main` then `listen` (order matters), then provide lives and `launch`

## 2 -> 3 - Making some room

- More files! `shared.ts` defines the server tags and layers, then final 'listen' layer, the 'current connections' tag and the `getAvailableColors` function
- `http.ts` defines a single `Live` layer that attaches a 'request' listener to the http server
- `ws.ts` defines a single `Live` layer that attaches a 'connection' listener to the ws server
- `index.ts` merges the http + ws lives, then merges with the final 'listen' layer, then provides lives and launches

## 3 -> 4 - Effect platform http

- Move port config to `config.ts`
- Write effect `Server` layer from the http server layer
- Move old manual http to effect http server

## 4 -> 5 - Ref and HashMap

- Move from `Map` to effect's `HashMap`
