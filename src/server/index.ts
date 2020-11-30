import WSSetupFunction from "./websocket";
import { createServer } from "http";
import DefaultApp from "./OpenStackApplication";
import express from "express";
import path from "path";
import cors from "cors";

const port = 3001;
const server = createServer(DefaultApp);

WSSetupFunction(server);

DefaultApp.use((req, res, next) => {
  if (!/(\.(?!html)\w+$|__webpack.*)/.test(req.url)) {
    req.url = "/"; // this would make express-js serve index.html
  }
  next();
});

DefaultApp.use(cors());

DefaultApp.use(
  express.static(path.resolve(__dirname, "..", "frontend", "build"))
);

server.listen(port, function () {
  console.log(`HTTP Server listening on port ${port}\n`);
});
