import WSSetupFunction from "./websocket";
import { createServer } from "http";
import express, { Router } from "express";
import cors from "cors";
import { errors } from "celebrate";
import path from "path";
import history from "connect-history-api-fallback";
import { Persister } from "./database/Persister";
import { InstanceProvider } from "./providers/Provider";

export default function (
  api: Router,
  persister: Persister,
  provider: InstanceProvider,
): void {
  let port = 3001;
  let host = "0.0.0.0";

  const app = express();
  const server = createServer(app);

  WSSetupFunction(server, persister, provider);

  app.use(cors());
  app.use(api);
  app.use(errors());

  const frontendStaticDir = path.resolve(__dirname, "..", "static");
  console.log("Serving static html from " + frontendStaticDir);

  app.use(history());
  app.use(express.static(frontendStaticDir));

  if (process.env.BACKEND_HTTP_PORT !== undefined) {
    port = parseInt(process.env.BACKEND_HTTP_PORT);
  }

  if (process.env.BACKEND_HTTP_HOST !== undefined) {
    host = process.env.BACKEND_HTTP_HOST;
  }

  server.listen(port, host, function () {
    console.log(`HTTP Server listening on port ${port}`);
  });
}
