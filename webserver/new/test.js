import WebSocket from "ws";

// Connect to the WebSocket server
const ws = new WebSocket("ws://localhost:3000"); // Adjust the port if your server is running on a different one

ws.on("open", function open() {
  console.log("Connected to the server");

  // Send a startup message
  const startupMessage = JSON.stringify({
    _tag: "startup",
    name: "TestClient",
  });
  ws.send(startupMessage);

  // Send a test message after a short delay
  setTimeout(() => {
    const testMessage = JSON.stringify({
      _tag: "message",
      message: "Hello from the client!",
    });
    ws.send(testMessage);
  }, 1000);
});

ws.on("message", function incoming(data) {
  console.log("Received message from server:", data.toString());
});

ws.on("close", function close() {
  console.log("Disconnected from the server");
});

ws.on("error", function error(err) {
  console.error("WebSocket error:", err);
});
