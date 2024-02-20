import config from "./Config";
import Guacamole from "guacamole-common-js";

import { GuacamoleProxyTunnel } from "./GuacamoleProxyTunnel";

export default function createTunnel(
  pathAndQuery: string = "/",
): Guacamole.WebSocketTunnel {
  if (pathAndQuery.startsWith("/") === false) {
    pathAndQuery = "/" + pathAndQuery;
  }

  console.log(`${config.wsBackendHost}${pathAndQuery}`);
  return new GuacamoleProxyTunnel(`${config.wsBackendHost}${pathAndQuery}`);
}
