import WSSetupFunction from "./websocket";
import { createServer } from "http";
import express, { Router } from "express";
import cors from "cors";
import { errors } from "celebrate";
import path from "path";
import history from "connect-history-api-fallback";
export default function (api: Router): void {
  const port = 3001;
  const app = express();
  const server = createServer(app);

  WSSetupFunction(server);

  app.use(cors());
  app.use(api);
  app.use(errors());
  const frontendStaticDir = path.resolve(__dirname, "..", "static");
  console.log("Serving static html from " + frontendStaticDir);
  app.use(history());
  app.use(express.static(frontendStaticDir));
  server.listen(port, function () {
    console.log(`HTTP Server listening on port ${port}`);
  });
}
