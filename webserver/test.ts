import http from "http";
import WebSocket from "ws";

// Function to test the HTTP endpoint
const testHttpEndpoint = () => {
  const options = {
    hostname: "localhost",
    port: 3000,
    path: "/test",
    method: "GET",
  };

  const req = http.request(options, (res) => {
    console.log(`HTTP Status Code: ${res.statusCode}`);

    res.on("data", (d) => {
      process.stdout.write(`HTTP Response: ${d}\n`);
    });
  });

  req.on("error", (error) => {
    console.error(`HTTP Error: ${error}`);
  });

  req.end();
};

// Function to test the WebSocket endpoint
const testWsEndpoint = () => {
  const ws = new WebSocket("ws://localhost:3000");

  ws.on("open", function open() {
    console.log("WebSocket connection established");
    ws.send("Hello, server!");
  });

  ws.on("message", function incoming(data) {
    console.log(`WebSocket message: ${data}`);
    ws.close(); // Close the connection after receiving the message
  });

  ws.on("close", () => {
    console.log("WebSocket connection closed");
  });

  ws.on("error", function error(err) {
    console.error(`WebSocket Error: ${err}`);
  });
};

// Execute both test functions
console.log("Testing HTTP endpoint...");
testHttpEndpoint();

console.log("Testing WebSocket endpoint...");
testWsEndpoint();
