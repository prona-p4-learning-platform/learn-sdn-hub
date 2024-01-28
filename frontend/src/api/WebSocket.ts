import config from "./Config";

export default function createWebSocket(pathAndQuery: string = "/"): WebSocket {
  if (pathAndQuery.startsWith("/") === false) {
    pathAndQuery = "/" + pathAndQuery;
  }
  return new WebSocket(`${config.wsBackendHost}/ws${pathAndQuery}`);
}
