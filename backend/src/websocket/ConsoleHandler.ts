import WebSocket from "ws";
import P4Environment from "../P4Environment";

export default function (
  ws: WebSocket,
  environment: string,
  userid: string,
  type: string
): void {
  console.log(environment, userid);
  const envInstance = P4Environment.getActiveEnvironment(environment, userid);
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
      if (message.toString().match(/^\x1B\[8;(.*);(.*)t$/)) {
        const size = message.toString().match(/^\x1B\[8;(.*);(.*)t$/);
        const lines = parseInt(size[1]);
        const columns = parseInt(size[2]);
        console.log(
          "received SIGWINCH resize event (lines: " +
            lines +
            ", columns: " +
            columns +
            ")"
        );
        envConsole.resize(columns, lines);
      } else {
        envConsole.write(message.toString());
        console.log(`Received message ${message}`);
      }
    });

    ws.on("close", function () {
      console.log("WS Session closed.");
    });
  } else {
    ws.send(`${environment} is not active or has no console of type ${type}`);
    ws.close();
  }
}
