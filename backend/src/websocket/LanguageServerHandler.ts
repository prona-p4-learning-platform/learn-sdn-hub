import WebSocket from "ws";
import Environment from "../Environment";

export default function (
  wsFromBrowser: WebSocket,
  environment: string,
  username: string,
  language: string
): void {
  const envInstance = Environment.getActiveEnvironment(environment, username);
  if (envInstance !== undefined) {
    Promise.all([
      envInstance.getLanguageServerPort(),
      envInstance.getIPAddress(),
    ])
      .then((result) => {
        const [port, ipAddress] = result;
        const wsToLanguageServer = new WebSocket(
          "ws://" + ipAddress + ":" + port + "/" + language
        );
        wsToLanguageServer.on("open", () => {
          wsFromBrowser.send("backend websocket ready");
          wsFromBrowser.on("message", (data) => {
            console.log(data.toString());
            wsToLanguageServer.send(data);
          });
          wsToLanguageServer.on("message", (data) => {
            console.log(data.toString());
            // apperently new vscode-ws-jsonrpc needs string and cannot handle a blob,
            // otherwise exception from JSON.parse will be thrown
            wsFromBrowser.send(data.toString());
          });
        });
        wsToLanguageServer.on("error", (err) => {
          console.log(err);
          wsFromBrowser.close();
        });
        wsToLanguageServer.on("close", () => {
          console.log("LanguageServer Client closed...");
          wsFromBrowser.close();
        });
        wsFromBrowser.on("close", () => {
          console.log("LanguageServer WebSocket closed...");
          wsToLanguageServer.close();
        });
      })
      .catch((err) => {
        console.log(err);
        wsFromBrowser.send(
          "Could not connect to environment language server, closing connection."
        );
        wsFromBrowser.close();
      });
  } else {
    wsFromBrowser.send("No P4 environment found, closing connection.");
    wsFromBrowser.close();
  }
}
