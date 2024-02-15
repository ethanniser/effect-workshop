## 1 -> 2 - Servers as Layers

- Make `Tag` for http and ws servers
- Make `Layer` for http with `sync`
- Make `Layer` for ws with `effect`, first using http
- 'Listen' `effectDiscard` layer that listens
- `main` is a big `effectDiscard` layer that has 90% of the original code, just first gets the servers through context then attaches all listeners
- `Layer.merge` `main` then `listen` (order matters), then provide lives and `launch`
