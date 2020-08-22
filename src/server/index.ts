import webpack from "webpack";
import webpackDevMiddleware from "webpack-dev-middleware";
import config from "../../webpack.config";

import WSSetupFunction from "./websocket";
import { createServer } from "http";
import DefaultApp from "./DefaultApplication";

const compiler = webpack(config);
const server = createServer(DefaultApp);

WSSetupFunction(server);

DefaultApp.use((req, res, next) => {
  if (!/(\.(?!html)\w+$|__webpack.*)/.test(req.url)) {
    req.url = "/"; // this would make express-js serve index.html
  }
  next();
});

DefaultApp.use(
  webpackDevMiddleware(compiler, {
    publicPath: config.output.publicPath,
  })
);

server.listen(3000, function () {
  console.log("Example app listening on port 3000!\n");
});
