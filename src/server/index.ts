import express from "express";
import webpack from "webpack";
import webpackDevMiddleware from "webpack-dev-middleware";
import config from "../../webpack.config";
import api from "./Api";
import WSSetupFunction from "./websocket";
import { createServer } from "http";

const app = express();
app.use(api);
const compiler = webpack(config);

const server = createServer(app);

WSSetupFunction(server);

app.use((req, res, next) => {
  if (!/(\.(?!html)\w+$|__webpack.*)/.test(req.url)) {
    req.url = "/"; // this would make express-js serve index.html
  }
  next();
});

// Tell express to use the webpack-dev-middleware and use the webpack.config.js
// configuration file as a base.
app.use(
  webpackDevMiddleware(compiler, {
    publicPath: config.output.publicPath,
  })
);
// Serve the files on port 3000.
server.listen(3000, function () {
  console.log("Example app listening on port 3000!\n");
});
