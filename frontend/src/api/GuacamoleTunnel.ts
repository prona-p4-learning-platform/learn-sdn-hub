import Guacamole from "guacamole-common-js";

import { variables } from "../utilities/Variables";
import { GuacamoleProxyTunnel } from "./GuacamoleProxyTunnel";

export default function createTunnel(
  pathAndQuery = "/",
): Guacamole.WebSocketTunnel {
  if (!pathAndQuery.startsWith("/")) {
    pathAndQuery = "/" + pathAndQuery;
  }

  console.log(`${variables.location.websocket.url}${pathAndQuery}`);
  return new GuacamoleProxyTunnel(
    `${variables.location.websocket.url}/ws${pathAndQuery}`,
  );
}
