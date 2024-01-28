import WebSocket from "ws";
import readline from "node:readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let ws;

const startClient = () => {
  rl.question("Enter your name: ", (name) => {
    ws = new WebSocket("ws://localhost:3000"); // Adjust the URL/port as needed.

    ws.on("open", () => {
      console.log("Connected to the server.");
      const startupMessage = JSON.stringify({ _tag: "startup", name });
      ws.send(startupMessage);
      promptForMessage();
    });

    ws.on("message", (data) => {
      console.log(`Message from server: ${data}`);
    });

    ws.on("close", () => {
      console.log("Disconnected from the server.");
      process.exit(0);
    });

    ws.on("error", (error) => {
      console.error(`WebSocket error: ${error}`);
      process.exit(1);
    });
  });
};

const promptForMessage = () => {
  rl.question("", (message) => {
    const outgoingMessage = JSON.stringify({ _tag: "message", message });
    ws.send(outgoingMessage);
    promptForMessage(); // Keep the terminal in input mode for new messages.
  });
};

startClient();
