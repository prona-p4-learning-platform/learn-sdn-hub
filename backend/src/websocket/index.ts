import { Server } from "http";
import WebSocket from "ws";
import { match } from "path-to-regexp";
import url from "url";
import P4Environment from "../P4Environment";

interface WebsocketPathParams {
  environment: string;
  type: string;
}

interface LSPathParams {
  language: string;
}

const envMatcher = match<WebsocketPathParams>(
  "/environment/:environment/type/:type"
);
const lsMatcher = match<LSPathParams>("/languageserver/:language");

export default function wrapWSWithExpressApp(server: Server): void {
  const wss = new WebSocket.Server({ server });
  wss.on("connection", function (ws, request) {
    const path = url.parse(request.url).pathname;
    const envMatchResult = envMatcher(path);
    const lspMatchResult = lsMatcher(path);

    if (envMatchResult !== false) {
      const { environment, type } = envMatchResult.params;
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
        ws.send(
          `${environment} is not active or has no console of type ${type}`
        );
        ws.close();
      }
    } else if (lspMatchResult !== false) {
      //forward connection to LS-Server-Instance
    } else {
      ws.send(`No route handler.`);
      ws.close();
    }
  });
}
