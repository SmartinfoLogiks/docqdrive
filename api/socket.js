import WebSocket, { WebSocketServer } from "ws";
import { runTool } from "./run.js";

export async function startWebSocketServer() {
  const port = process.env.SOCKET_PORT || 8768;
  const wss = new WebSocketServer({ port });

  wss.on("connection", ws => {
    ws.on("message", async message => {
      try {
        const command = JSON.parse(message.toString());
        console.log("Received WebSocket command:", command);
        const response = await runTool(command);
        ws.send(JSON.stringify(response));
      } catch (err) {
        ws.send(JSON.stringify({ status: "error", message: String(err) }));
      }
    });
  });

  console.log(`WebSocket server started on ws://0.0.0.0:${port}`);
}
