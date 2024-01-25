import { Hono } from "hono";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const app = new Hono();
app.post("/", async (c) => {
  const name = c.req.header("name") ?? "World";
  const raw = await c.req.json();
  const age = "age" in raw ? raw.age : "unknown";
  return c.text(`Hello ${name}! You are ${age} years old!`);
});

console.log("Starting server on http://localhost:3000");
export default {
  port: 3000,
  fetch: app.fetch,
};
