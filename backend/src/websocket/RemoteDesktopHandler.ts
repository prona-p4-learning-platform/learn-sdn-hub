import WebSocket from "ws";
import Environment from "../Environment";

export default function (
  wsFromBrowser: WebSocket,
  environment: string,
  username: string,
  desktopQueryString: string
): void {
  const envInstance = Environment.getActiveEnvironment(environment, username);
  if (envInstance !== undefined) {
    // guacamole exmple:
    //   wss://guacamole-host.example.org/guacamole/websocket-tunnel?token=<token-here>&GUAC_DATA_SOURCE=mysql&GUAC_ID=16&GUAC_TYPE=c&GUAC_WIDTH=2940&GUAC_HEIGHT=1279&GUAC_DPI=96&GUAC_TIMEZONE=Europe%2FBerlin&GUAC_AUDIO=audio%2FL8&GUAC_AUDIO=audio%2FL16&GUAC_IMAGE=image%2Fjpeg&GUAC_IMAGE=image%2Fpng&GUAC_IMAGE=image%2Fwebp
    const desktop = envInstance.getDesktopByAlias(desktopQueryString);
    const guacamoleServerURL = new URL(desktop.guacamoleServerURL);
    // currently use ws, backend and guacd are on the same host anyway, maybe upgrade to wss (port 8443) and check certs etc.
    guacamoleServerURL.protocol = "ws";
    const wsToRemoteDesktop = new WebSocket(
      guacamoleServerURL.toString() +
        "/websocket-tunnel?token=" +
        desktop.remoteDesktopToken.authToken +
        "&GUAC_DATA_SOURCE=" +
        desktop.remoteDesktopToken.dataSource +
        "&GUAC_ID=" +
        username +
        "-" +
        environment +
        "&GUAC_TYPE=c"
    );
    wsToRemoteDesktop.on("open", () => {
      wsFromBrowser.send("backend websocket ready");
      wsFromBrowser.on("message", (data) => {
        //console.log(data.toString());
        wsToRemoteDesktop.send(data);
      });
      wsToRemoteDesktop.on("message", (data) => {
        //console.log(data.toString());
        wsFromBrowser.send(data);
      });
    });
    wsToRemoteDesktop.on("error", (err) => {
      console.log(err);
      wsFromBrowser.close();
    });
    wsToRemoteDesktop.on("close", () => {
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
