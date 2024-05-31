import config from "./Config";

export default function createWebSocket(pathAndQuery = "/"): WebSocket {
  if (!pathAndQuery.startsWith("/")) {
    pathAndQuery = "/" + pathAndQuery;
  }

  return new WebSocket(`${config.wsBackendHost}/ws${pathAndQuery}`);
}
