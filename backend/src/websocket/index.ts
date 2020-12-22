import { Server } from "http";
import WebSocket from "ws";
import { match } from "path-to-regexp";
import url from "url";
import ConsoleHandler from "./ConsoleHandler";
import LanguageServerHandler from "./LanguageServerHandler";
interface WebsocketPathParams {
  environment: string;
  type: string;
}

interface LSPathParams {
  language: string;
  environment: string;
}

const envMatcher = match<WebsocketPathParams>(
  "/environment/:environment/type/:type"
);
const lsMatcher = match<LSPathParams>(
  "/environment/:environment/languageserver/:language"
);

export default function wrapWSWithExpressApp(server: Server): void {
  const wss = new WebSocket.Server({ server });
  wss.on("connection", function (ws, request) {
    const path = url.parse(request.url).pathname;
    const envMatchResult = envMatcher(path);
    const lspMatchResult = lsMatcher(path);
    if (envMatchResult !== false) {
      const { environment, type } = envMatchResult.params;
      ConsoleHandler(ws, environment, type);
    } else if (lspMatchResult !== false) {
      const { environment, language } = lspMatchResult.params;
      LanguageServerHandler(ws, environment, language);
    } else {
      ws.send(`No route handler.`);
      ws.close();
    }
  });
}
