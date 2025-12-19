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
  const envInstance = Environment.getActiveEnvironment(
    environment,
    groupNumber,
  );
  if (envInstance !== undefined) {
    Promise.all([
      envInstance.getLanguageServerPort(),
      envInstance.getIPAddress(),
      envInstance.getJumphost(),
    ])
      .then(async (result) => {
        let [port, ipAddress] = result;
        const jumpHost = result[2];
        let sshJumpHostConnection: Client;
        let sshForwardServer: Server;
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
          sshJumpHostConnection = new Client();
          let localForwardSocketReady = false;
          let srvPort = 0;
          const dstIpAddress = ipAddress;
          const dstPort = port;
          const localForwardSocketTimeout = 10;
          sshJumpHostConnection
            .on("ready", () => {
              sshForwardServer = createServer((socket) => {
                socket.pause();
                //console.log("Forwarding out to " + dstIpAddress + ":" + dstPort);
                sshJumpHostConnection.forwardOut(
                  "127.0.0.1",
                  0,
                  dstIpAddress,
                  dstPort,
                  (err, stream) => {
                    if (err) {
                      console.log(
                        "Unable to forward lsp connection on jump host: " +
                          err.message,
                      );
                      sshJumpHostConnection.end();
                      socket.end();
                      sshForwardServer.close();
                    } else {
                      stream.pause();
                      socket.pipe(stream);
                      stream.pipe(socket);
                      socket.resume();
                      stream.resume();
                    }
                  },
                );
              })
                .listen(0)
                .on("listening", () => {
                  console.log("local lsp server socket ready...");
                  const srvIpAddress = (
                    sshForwardServer.address() as AddressInfo
                  ).address;
                  srvPort = (sshForwardServer.address() as AddressInfo).port;
                  console.log(
                    "Forwarding lsp connection from " +
                      srvIpAddress +
                      ":" +
                      srvPort +
                      " over " +
                      jumpHost.ipaddress +
                      ":" +
                      jumpHost.port +
                      " to " +
                      dstIpAddress +
                      ":" +
                      dstPort,
                  );
                  // overwrite the original ipAddress and port with the created listening server socket
                  // console.log(
                  //   "Changing lsp endpoint from " +
                  //     ipAddress +
                  //     ":" +
                  //     port +
                  //     " to 127.0.0.1:" +
                  //     srvPort,
                  // );
                  ipAddress = "127.0.0.1";
                  port = srvPort;
                  localForwardSocketReady = true;
                });
            })
            .on("close", () => {
              console.log("SSH jumphost lsp connection close");
              sshJumpHostConnection.end();
              sshForwardServer.close();
              wsFromBrowser.close();
            })
            .on("error", (err) => {
              console.log("SSH jumphost lsp connection error: " + err.message);
              sshJumpHostConnection.end();
              sshForwardServer.close();
              wsFromBrowser.close();
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
              readyTimeout: 10000,
            });
          while (!localForwardSocketReady && localForwardSocketTimeout > 0) {
            console.log("Waiting for forwarded connection on jumphost...");
            await sleep(1000);
          }
        }
        console.log(
          "Opening websocket backend connection to ws://" +
            ipAddress +
            ":" +
            port +
            "/" +
            language,
        );
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
          if (jumpHost !== undefined) {
            sshForwardServer.close();
            sshJumpHostConnection.end();
          }
          wsFromBrowser.close();
        });
        wsToLanguageServer.on("close", () => {
          console.log("LanguageServer Client closed...");
          if (jumpHost !== undefined) {
            sshForwardServer.close();
            sshJumpHostConnection.end();
          }
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

function sleep(ms: number): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
