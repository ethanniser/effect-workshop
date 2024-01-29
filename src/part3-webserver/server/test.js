import WebSocket from "ws";
import readline from "node:readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let ws;
const messages = []; // Initialize the messages array

const displayMessages = () => {
  process.stdout.write("\x1Bc"); // Clear the terminal, similar to console.clear()

  messages.forEach((message) => {
    process.stdout.write(message + "\n"); // Display each message with a newline
  });

  rl.prompt(true); // Redraw the prompt
};

const addMessage = (message) => {
  if (messages.length >= process.stdout.columns) {
    messages.shift(); // Remove the oldest message if the array is full
  }
  messages.push(message); // Add the new message
  displayMessages(); // Refresh the displayed messages
};

const startClient = () => {
  rl.question("Enter your name: ", (name) => {
    ws = new WebSocket("ws://localhost:3000"); // Adjust the URL/port as needed.

    ws.on("open", () => {
      console.log("Connected to the server.");
      const startupMessage = JSON.stringify({ _tag: "startup", name });
      ws.send(startupMessage);
      addMessage("Connected to the server."); // Add connection message to the array
      promptForMessage();
    });

    ws.on("message", (data) => {
      const message = JSON.parse(data);
      switch (message._tag) {
        case "message":
          const date = new Date(message.timestamp);
          addMessage(
            `${date.toLocaleTimeString()} - ${message.name}: ${message.message}`
          );
          break;
        case "join":
          addMessage(`${message.name} has joined the chat.`);
          break;
        case "leave":
          addMessage(`${message.name} has left the chat.`);
          break;
        default:
          console.error(`Unknown message type received: ${message._tag}`);
          break;
      }
    });

    ws.on("close", () => {
      addMessage("Disconnected from the server."); // Add disconnection message to the array
      process.exit(0);
    });

    ws.on("error", (error) => {
      console.error(`WebSocket error: ${error}`);
      process.exit(1);
    });
  });
};

const promptForMessage = () => {
  rl.setPrompt("ENTER MESSAGE >> "); // Set the prompt text
  rl.prompt(); // Display the prompt

  rl.on("line", (message) => {
    const outgoingMessage = JSON.stringify({ _tag: "message", message });
    ws.send(outgoingMessage);
    rl.prompt(); // Display the prompt again after sending a message
  });
};

startClient();
