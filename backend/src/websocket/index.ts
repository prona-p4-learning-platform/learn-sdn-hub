import { Server } from "http";
import WebSocket from "ws";
import { match } from "path-to-regexp";
import url from "url";
import ConsoleHandler from "./ConsoleHandler";
import LanguageServerHandler from "./LanguageServerHandler";
import RemoteDesktopHandler from "./RemoteDesktopHandler";
import { TokenPayload } from "../authentication/AuthenticationMiddleware";
import jwt from "jsonwebtoken";
import { Persister } from "../database/Persister";
import { InstanceProvider } from "../providers/Provider";

type WebsocketPathParams = {
  environment: string;
  type: string;
};

type LSPathParams = {
  environment: string;
  language: string;
};

type RDPathParams = {
  environment: string;
  alias: string;
};

const envMatcher = match<WebsocketPathParams>(
  "/ws/environment/:environment/type/:type",
);
const lsMatcher = match<LSPathParams>(
  "/ws/environment/:environment/languageserver/:language",
);
const rdMatcher = match<RDPathParams>(
  "/ws/environment/:environment/desktop/:alias",
);

export default function wrapWSWithExpressApp(
  server: Server,
  persister: Persister,
  provider: InstanceProvider,
): void {
  const wss = new WebSocket.Server({ server });
  wss.on("connection", function (ws, request) {
    ws.once("message", (message) => {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      const [auth, token] = message.toString().split(" ");
      if (auth !== "auth") {
        ws.send("Not authenticated.");
        ws.close();
        return;
      }

      let user: TokenPayload;
      try {
        user = jwt.verify(
          token,
          process.env.JWT_TOKENSECRET ?? "some-secret",
        ) as TokenPayload;
      } catch (_) {
        ws.send("Could not authenticate with given credentials.");
        ws.close();
        return;
      }

      const requestUrl = request.url;
      if (requestUrl) {
        const path = url.parse(requestUrl).pathname;

        if (path) {
          const envMatchResult = envMatcher(path);
          const lspMatchResult = lsMatcher(path);
          const rdMatchResult = rdMatcher(path);

          if (envMatchResult !== false) {
            const { environment, type } = envMatchResult.params;
            ConsoleHandler(
              ws,
              environment,
              user.groupNumber,
              user.sessionId,
              type,
              persister,
              provider,
            );
          } else if (lspMatchResult !== false) {
            const { environment, language } = lspMatchResult.params;
            LanguageServerHandler(
              ws,
              environment,
              user.groupNumber,
              language,
              persister,
              provider,
            );
          } else if (rdMatchResult !== false) {
            const { environment, alias } = rdMatchResult.params;
            RemoteDesktopHandler(
              ws,
              environment,
              user.groupNumber,
              alias,
              persister,
              provider,
            );
          } else {
            ws.send("No route handler.");
            ws.close();
          }
        } else {
          ws.send("No request path.");
          ws.close();
        }
      } else {
        ws.send("No request url.");
        ws.close();
      }
    });
  });
}
