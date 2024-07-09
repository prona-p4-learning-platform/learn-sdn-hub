import { variables } from "../utilities/Variables";

export default function createWebSocket(pathAndQuery = "/"): WebSocket {
  if (!pathAndQuery.startsWith("/")) {
    pathAndQuery = "/" + pathAndQuery;
  }

  return new WebSocket(`${variables.location.websocket.url}/ws${pathAndQuery}`);
}
