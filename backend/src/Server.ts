import WSSetupFunction from "./websocket";
import { createServer } from "http";
import express, { Router } from "express";
import cors from "cors";
import { errors } from "celebrate";
export default function (api: Router): void {
  const port = 3001;
  const app = express();
  const server = createServer(app);

  WSSetupFunction(server);

  app.use(cors());
  app.use(api);
  app.use(errors());
  server.listen(port, function () {
    console.log(`HTTP Server listening on port ${port}`);
  });
}
