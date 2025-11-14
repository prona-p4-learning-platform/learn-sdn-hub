import WebSocket from "ws";
import Environment from "../Environment";

export default function (
  ws: WebSocket,
  environment: string,
  groupNumber: number,
  sessionId: string | undefined,
  type: string,
): void {
  const envInstance = Environment.getActiveEnvironment(
    environment,
    groupNumber,
    sessionId,
  );
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
      const matchResize = stringified.match(/^\x1B\[8;(.*);(.*)t$/);
      // recently, xterm sends ESC+0;276;0c for some reason, filter that out
      // eslint-disable-next-line no-control-regex
      const matchGarbageControlSeq = stringified.match(/^\x1B\[>0;276;0c$/);

      if (matchResize && matchResize[1] && matchResize[2]) {
        const lines = parseInt(matchResize[1]);
        const columns = parseInt(matchResize[2]);
        //console.log(
        //  "received SIGWINCH resize event (lines: " +
        //    lines +
        //    ", columns: " +
        //    columns +
        //    ")"
        //);
        envConsole.resize(columns, lines);
      } else if (matchGarbageControlSeq) {
        //console.log("received terminal control seq ESC+[>0;276;0c, ignoring");
      } else {
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
