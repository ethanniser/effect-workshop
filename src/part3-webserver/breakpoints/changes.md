## 1 -> 2 - Servers as Layers

- Make `Tag` for http and ws servers
- Make `Layer` for http with `sync`
- Make `Layer` for ws with `effect`, first using http
- 'Listen' `effectDiscard` layer that listens
- `main` is a big `effectDiscard` layer that has 90% of the original code, just first gets the servers through context then attaches all listeners
- `Layer.merge` `main` then `listen` (order matters), then provide lives and `launch`

## 2 -> 3 - Making some room

- More files! `shared.ts` defines the server tags and layers, then final 'listen' layer, the `currentConnections` tag and the `getAvailableColors` function
- `http.ts` defines a single `Live` layer that attaches a 'request' listener to the http server
- `ws.ts` defines a single `Live` layer that attaches a 'connection' listener to the ws server
- `index.ts` merges the http + ws lives, then merges with the final 'listen' layer, then provides lives and launches

## 3 -> 4 - Effect platform http

- Move port config to `config.ts`
- Write effect `Server` layer from the http server layer
- Move old manual http to effect http server
- Remove old listen layer (effect http does this now)
- Add new `StartMessage` layer in index.ts

## 4 -> 5 - Ref and HashMap

- `CurrentConnections` from `Map` to effect's `HashMap`
- Wrap `CurrentConnections` in `Ref` to make it effectful
- Update live + usage

## 5 -> 6 - Streams

- modify `WebSocketConnection` to have send + close effect
- implement connections stream
- implement `initializeConnection`: listens for initial message with `async`, decodes + confirms no color conflict, then publishes join and puts connection in map, then listens for messages and publishes them
- `publish` gets the ref and for each calls `send` on the connection
- `Stream.runForEach(connectionsStream, initializeConnection)` + run connections interval
- Question why doesnt work then add forks

## 6 -> 7 - Fibers

- modify `WebSocketConnection` to have sendQueue and messages stream
- `initializeConnection` now takes enqueue for broadcasting and dequeue for listening
- creates broadcast fiber from messages stream and runs `Queue.offer(pubsub)` for each message
- creates send fiber from stream made of fresh created queue and message dequeue and for each sends to raw ws
- creates `WebSocketConnection` and adds to hashmap then joins on fibers
- in main: create fiberset, pubsub and connections stream, run `initializeConnection` for each _forked_ and add to fiberset, run pubsub and connections interval then connection log fiber (also manual sending) and finally forkdaemon the whole thing
