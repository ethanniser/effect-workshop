## 1 -> 2 - Servers as Layers

- Make `Tag` for http and ws servers
- Make `Layer` for http with `sync`
- Make `Layer` for ws with `effect`, first using http
- 'Listen' `effectDiscard` layer that listens
- `main` is a big `effectDiscard` layer that has 90% of the original code, just first gets the servers through context then attaches all listeners
- `Layer.merge` `main` then `listen` (order matters), then provide lives and `launch`

## 2 -> 3 - Making some room

- More files! `server.ts` defines the server tags and layers, then final 'listen' layer, the 'current connections' tag and the `getAvailableColors` function
- `http.ts` defines a single `Live` layer that attaches a 'request' listener to the http server
- `ws.ts` defines a single `Live` layer that attaches a 'connection' listener to the ws server
- `index.ts` merges the http + ws lives, then merges with the final 'listen' layer, then provides lives and launches
