import WebSocket from "ws";
import P4Environment from "../P4Environment";

export default function (
  ws: WebSocket,
  environment: string,
  type: string
): void {
  const envInstance = P4Environment.getActiveEnvironment(`${environment}`);
  if (envInstance !== undefined) {
    const envConsole = envInstance.getConsoleByAlias(type);
    if (envConsole === undefined) {
      ws.close();
      return;
    }
    envConsole.on("data", (data: string) => {
      ws.send(data.toString());
    });
    envConsole.on("close", () => {
      ws.send("Remote tty has gone.");
      ws.close();
    });
    ws.on("message", function (message) {
      envConsole.write(message.toString());
      console.log(`Received message ${message}`);
    });

    ws.on("close", function () {
      console.log("WS Session closed.");
    });
  } else {
    ws.send(`${environment} is not active or has no console of type ${type}`);
    ws.close();
  }
}
