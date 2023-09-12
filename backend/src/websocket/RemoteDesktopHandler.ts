import WebSocket from "ws";
import Environment from "../Environment";
import { addConnection, removeConnection } from "./CurrentConnections";

export default function (
  wsFromBrowser: WebSocket,
  environment: string,
  username: string,
  desktopQueryString: string,
  groupNumber: number
): void {
  const envInstance = Environment.getActiveEnvironment(environment, username);
  if (envInstance !== undefined) {
    // guacamole exmple:
    //   wss://guacamole-host.example.org/guacamole/websocket-tunnel?token=<token-here>&GUAC_DATA_SOURCE=mysql&GUAC_ID=16&GUAC_TYPE=c&GUAC_WIDTH=2940&GUAC_HEIGHT=1279&GUAC_DPI=96&GUAC_TIMEZONE=Europe%2FBerlin&GUAC_AUDIO=audio%2FL8&GUAC_AUDIO=audio%2FL16&GUAC_IMAGE=image%2Fjpeg&GUAC_IMAGE=image%2Fpng&GUAC_IMAGE=image%2Fwebp
    const desktop = envInstance.getDesktopByAlias(desktopQueryString);
    const guacamoleServerURL = new URL(desktop.guacamoleServerURL);
    // currently use ws, backend and guacd are on the same host anyway, maybe upgrade to wss (port 8443) and check certs etc.
    guacamoleServerURL.protocol = "wss";
    // Save combination of groupNumber and environment to check if there are multiple connections to the same environment
    const connectedKey = groupNumber + "-" + environment;
    // Add connection
    const curConnected = addConnection(connectedKey);
    // Add -join to the connection name if there are multiple connections to the same environment
    // Use connection entry that joins the original connection
    const joinAddition = (curConnected > 1) ? "-join" : "";
    const wsToRemoteDesktop = new WebSocket(
      guacamoleServerURL.toString() +
        "websocket-tunnel?token=" +
        desktop.remoteDesktopToken.authToken +
        "&GUAC_DATA_SOURCE=" +
        desktop.remoteDesktopToken.dataSource +
        "&GUAC_ID=" +
        groupNumber +
        "-" +
        environment +
        joinAddition +
        "&GUAC_TYPE=c&GUAC_TIMEZONE=Europe%2FBerlin",
        "guacamole"
    );
    wsToRemoteDesktop.on("open", () => {
      wsFromBrowser.on("message", (data) => {
        // Browser to Remote Desktop
        wsToRemoteDesktop.send(data.toString());
      });
      wsToRemoteDesktop.on("message", (data) => {
        // Remote Desktop to Browser
        wsFromBrowser.send(data.toString());
      });
    });
    wsToRemoteDesktop.on("error", (err) => {
      console.log(err);
      wsFromBrowser.close();
    });
    wsToRemoteDesktop.on("close", () => {
      removeConnection(connectedKey);
      console.log("RemoteDesktop Client closed...");
      wsFromBrowser.close();
    });
    wsFromBrowser.on("close", () => {
      console.log("RemoteDesktop WebSocket closed...");
      wsToRemoteDesktop.close();
    });
  } else {
    wsFromBrowser.send("No environment found, closing connection.");
    wsFromBrowser.close();
  }
}
