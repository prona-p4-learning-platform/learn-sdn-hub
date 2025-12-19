import WSSetupFunction from "./websocket";
import { createServer } from "http";
import express, { Router } from "express";
import cors from "cors";
import { errors } from "celebrate";
//import history from "connect-history-api-fallback";
import path from "path";

export default function (api: Router): void {
  let port = 3001;
  const app = express();
  const server = createServer(app);

  WSSetupFunction(server);

  app.use(cors());
  app.use(api);
  app.use(errors());

  if(false) {
    //app.use(history());
    const frontendStaticDir = path.resolve(__dirname, "..", "static");
    console.log("Serving static html from " + frontendStaticDir);
  
    app.use(express.static(frontendStaticDir));
  }

  if (process.env.BACKEND_HTTP_PORT !== undefined) {
    port = parseInt(process.env.BACKEND_HTTP_PORT);
  }

  server.listen(port, function () {
    console.log(`HTTP Server listening on port ${port}`);
  });
}
