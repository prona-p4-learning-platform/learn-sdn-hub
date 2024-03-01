import config from "./Config";
import Guacamole from "guacamole-common-js";

import { GuacamoleProxyTunnel } from "./GuacamoleProxyTunnel";

export default function createTunnel(
  pathAndQuery = "/",
): Guacamole.WebSocketTunnel {
  if (!pathAndQuery.startsWith("/")) {
    pathAndQuery = "/" + pathAndQuery;
  }

  console.log(`${config.wsBackendHost}${pathAndQuery}`);
  return new GuacamoleProxyTunnel(`${config.wsBackendHost}/ws${pathAndQuery}`);
}
