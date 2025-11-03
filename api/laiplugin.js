import WebSocket from "ws";
import dotenv from "dotenv";
import { runTool } from "./run.js";

dotenv.config();

const RECONNECT_INTERVAL = 15000;

export async function startLaiPluginClient() {
  const uri = process.env.LAI_PLUGIN_SERVER || "ws://localhost:8000/tools";
  const token = process.env.LAI_PLUGIN_AUTH || "";

  function connect() {
    const ws = new WebSocket(uri, { headers: { Authorization: `Bearer ${token}` } });

    ws.on("open", () => console.log("Connected to LAI Plugin server"));

    ws.on("message", async message => {
      try {
        const command = JSON.parse(message.toString());
        console.log("Received LAI command:", command);

        let response;
        if (command.command) {
          const result = await runTool(command);
          response = { status: "success", messageid: command.messageid, data: result };
        } else if (command.type) {
          response = { status: "success", ack: true };
        } else {
          response = { status: "error", message: "No command field" };
        }

        ws.send(JSON.stringify(response));
      } catch (err) {
        ws.send(JSON.stringify({ status: "error", message: String(err) }));
      }
    });

    ws.on("close", () => {
      console.log("Connection closed, retrying...");
      setTimeout(connect, RECONNECT_INTERVAL);
    });

    ws.on("error", err => console.error("Plugin client error:", err));
  }

  connect();
}
