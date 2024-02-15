import WebSocket from "ws";
import Environment from "../Environment";

export default function (
  ws: WebSocket,
  environment: string,
  username: string,
  type: string,
): void {
  console.log(environment, username);
  const envInstance = Environment.getActiveEnvironment(environment, username);
  if (envInstance !== undefined) {
    const envConsole = envInstance.getConsoleByAlias(type);
    if (envConsole === undefined) {
      ws.close();
      return;
    }

    const initialConsoleBuffer = envConsole.consumeInitialConsoleBuffer();
    if (initialConsoleBuffer.length > 0) {
      ws.send(initialConsoleBuffer);
    }

    envConsole.on("data", (data: string) => {
      ws.send(data.toString());
    });

    envConsole.on("close", () => {
      ws.send("Remote tty has gone.");
      ws.close();
    });

    ws.on("message", function (message) {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      const stringified = message.toString();
      // eslint-disable-next-line no-control-regex
      const matchings = stringified.match(/^\x1B\[8;(.*);(.*)t$/);

      if (matchings && matchings[1] && matchings[2]) {
        const lines = parseInt(matchings[1]);
        const columns = parseInt(matchings[2]);
        //console.log(
        //  "received SIGWINCH resize event (lines: " +
        //    lines +
        //    ", columns: " +
        //    columns +
        //    ")"
        //);
        envConsole.resize(columns, lines);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        envConsole.write(stringified);
        //console.log(`Received message ${message}`);
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
