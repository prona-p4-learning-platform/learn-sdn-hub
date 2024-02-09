import { Server } from "http";
import WebSocket from "ws";
import { match } from "path-to-regexp";
import url from "url";
import ConsoleHandler from "./ConsoleHandler";
import LanguageServerHandler from "./LanguageServerHandler";
import RemoteDesktopHandler from "./RemoteDesktopHandler";
import { TokenPayload } from "../authentication/AuthenticationMiddleware";
import jwt from "jsonwebtoken";
interface WebsocketPathParams {
  environment: string;
  type: string;
}

interface LSPathParams {
  environment: string;
  language: string;
}

interface RDPathParams {
  environment: string;
  alias: string;
}

const envMatcher = match<WebsocketPathParams>(
  "/ws/environment/:environment/type/:type",
);
const lsMatcher = match<LSPathParams>(
  "/ws/environment/:environment/languageserver/:language",
);
const rdMatcher = match<RDPathParams>(
  "/ws/environment/:environment/desktop/:alias",
);

export default function wrapWSWithExpressApp(server: Server): void {
  const wss = new WebSocket.Server({ server });
  wss.on("connection", function (ws, request) {
    ws.once("message", (message) => {
      const [auth, token] = message.toString().split(" ");
      if (auth !== "auth") {
        ws.send("Not authenticated.");
        return ws.close();
      }
      let user;
      try {
        /* replace secret */
        user = jwt.verify(token, "some-secret") as TokenPayload;
      } catch (err) {
        ws.send("Could not authenticate with given credentials.");
        return ws.close();
      }
      const path = url.parse(request.url).pathname;
      const envMatchResult = envMatcher(path);
      const lspMatchResult = lsMatcher(path);
      const rdMatchResult = rdMatcher(path);
      if (envMatchResult !== false) {
        const { environment, type } = envMatchResult.params;
        ConsoleHandler(ws, environment, user.username, type);
      } else if (lspMatchResult !== false) {
        const { environment, language } = lspMatchResult.params;
        LanguageServerHandler(ws, environment, user.username, language);
      } else if (rdMatchResult !== false) {
        const { environment, alias } = rdMatchResult.params;
        RemoteDesktopHandler(
          ws,
          environment,
          user.username,
          alias,
          user.groupNumber,
        );
      } else {
        ws.send(`No route handler.`);
        ws.close();
      }
    });
  });
}
