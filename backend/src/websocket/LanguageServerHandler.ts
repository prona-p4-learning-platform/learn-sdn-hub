import WebSocket from "ws";
import Environment from "../Environment";
import { Client } from "ssh2";
import { AddressInfo, createServer, Server } from "net";
import fs from "fs";

export default function (
  wsFromBrowser: WebSocket,
  environment: string,
  groupNumber: number,
  language: string,
): void {
  const envInstance = Environment.getActiveEnvironment(environment, groupNumber);
  if (envInstance !== undefined) {
    Promise.all([
      envInstance.getLanguageServerPort(),
      envInstance.getIPAddress(),
      envInstance.getJumphost(),
    ])
      .then((result) => {
        let [port, ipAddress] = result;
        const jumpHost = result[2];
        if (jumpHost !== undefined) {
          console.log(
            "Establishing SSH lsp connection " +
              ipAddress +
              ":" +
              port +
              " via jump host " +
              jumpHost.ipaddress +
              ":" +
              jumpHost.port,
          );
          const sshJumpHostConnection = new Client();
          let srv: Server;
          sshJumpHostConnection
            .on("ready", () => {
              srv = createServer((socket) => {
                sshJumpHostConnection.forwardOut(
                  "127.0.0.1",
                  0,
                  ipAddress,
                  port,
                  (err, stream) => {
                    if (err) {
                      console.log(
                        "Unable to forward lsp connection on jump host: " + err.message,
                      );
                      sshJumpHostConnection.end();
                      socket.end();
                      srv.close();
                    } else {
                      socket.pipe(stream);
                    }
                  },
                );
              });
              srv.listen(0, () => {
                const srvIpAddress = (srv.address() as AddressInfo).address;
                const srvPort = (srv.address() as AddressInfo).port;
                ipAddress = srvIpAddress;
                port = srvPort;
                console.log("Forwarding lsp connection from " + srvIpAddress + ":" + srvPort  + " over " + jumpHost.ipaddress + ":" + jumpHost.port + " to " + ipAddress + ":" + port);
              });
            })
            .on("close", () => {
              console.log("SSH jumphost lsp connection close");
              sshJumpHostConnection.end();
              srv && srv.close();
            })
            .on("error", (err) => {
              console.log("SSH jumphost lsp connection error: " + err.message);
              sshJumpHostConnection.end();
              srv && srv.close();
            })
            .connect({
              host: jumpHost.ipaddress,
              port: jumpHost.port,
              username: jumpHost.username,
              password: jumpHost.password,
              privateKey: jumpHost.privateKey
                ? fs.readFileSync(jumpHost.privateKey)
                : undefined,
              //debug: (debug) => {
              //  console.log(debug)
              //},
              readyTimeout: 1000,
            });  
        }
        const wsToLanguageServer = new WebSocket(
          "ws://" + ipAddress + ":" + port + "/" + language,
        );
        wsToLanguageServer.on("open", () => {
          wsFromBrowser.send("backend websocket ready");
          wsFromBrowser.on("message", (data) => {
            //console.log(data.toString());
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            if (data.toString() === "ping") {
              wsFromBrowser.send("pong");
              return;
            } else {
              wsToLanguageServer.send(data);
            }
          });
          wsToLanguageServer.on("message", (data) => {
            //console.log(data.toString());
            // apparently new vscode-ws-jsonrpc needs string and cannot handle a blob,
            // otherwise exception from JSON.parse will be thrown
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
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
          "Could not connect to environment language server, closing connection.",
        );
        wsFromBrowser.close();
      });
  } else {
    wsFromBrowser.send("No P4 environment found, closing connection.");
    wsFromBrowser.close();
  }
}
