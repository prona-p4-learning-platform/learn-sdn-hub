import WSSetupFunction from "./websocket";
import { createServer } from "http";
import express, { Router } from "express";
import cors from "cors";
import { errors } from "celebrate";
import path from "path";
import history from "connect-history-api-fallback";
import { Int32 } from "mongodb";
export default function (api: Router): void {
  var port = 3001;
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
  if (process.env.BACKEND_HTTP_PORT != undefined) {
    port = parseInt(process.env.BACKEND_HTTP_PORT);
  }
  server.listen(port, function () {
    console.log(`HTTP Server listening on port ${port}`);
  });
}
