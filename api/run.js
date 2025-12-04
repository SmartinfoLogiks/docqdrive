import fs from "fs";
import path from "path";
const toolsDir = path.resolve("tools");

export async function runTool(command) {
  const toolName = (command.tool || "").toLowerCase();
  const message = command.message || "";
  const params = command.params || {};
  const file = command.file || null; // <── added

  if (command.command === "list_tools") return listWorkingTools();
  else if (command.command === "list_tools_all") return listAvailableTools();

  try {
    const modulePath = path.join(toolsDir, `${toolName}.js`);

    if (!fs.existsSync(modulePath)) {
      return { status: "error", message: `Tool '${toolName}' not found` };
    }

    const toolModule = await import(`file://${modulePath}`);

    if (typeof toolModule.run === "function") {
      //pass 'file' as the 3rd argument
      const response = await toolModule.run(message, params, file);
      return { response };
    } else {
      return {
        status: "error",
        command,
        message: `Tool '${toolName}' missing run()`,
      };
    }
  } catch (err) {
    return { status: "error", command, message: String(err) };
  }
}

export function listAvailableTools() {
  return fs
    .readdirSync(toolsDir)
    .filter((f) => f.endsWith(".js") && !f.startsWith("_"))
    .map((f) => ({ name: f.replace(".js", "") }));
}

export function listWorkingTools() {
  // Load from tools.json
  try {
    const config = JSON.parse(fs.readFileSync("tools.json", "utf-8"));
    return Object.values(config).filter((t) => {
      if (!fs.existsSync(path.resolve("tools", `${t.name}.js`))) return false;
      return (
        (t.inputSchema && Object.keys(t.inputSchema).length) ||
        (t.identitySchema && Object.keys(t.identitySchema).length)
      );
    });
  } catch {
    return [];
  }
}

export function listNotWorkingTools() {
  // Load from unused_tools.json
  try {
    const config = JSON.parse(fs.readFileSync("unused_tools.json", "utf-8"));
    return Object.values(config).filter(
      (t) =>
        (t.inputSchema && Object.keys(t.inputSchema).length) ||
        (t.identitySchema && Object.keys(t.identitySchema).length)
    );
  } catch {
    return [];
  }
}
