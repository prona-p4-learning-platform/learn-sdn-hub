import WSSetupFunction from "./websocket";
import { createServer } from "http";
import express, { Router } from "express";
import cors from "cors";

export default function (api: Router) {
  const port = 3001;
  const app = express();
  const server = createServer(app);

  WSSetupFunction(server);

  app.use(cors());
  app.use(api);

  server.listen(port, function () {
    console.log(`HTTP Server listening on port ${port}`);
  });
}
