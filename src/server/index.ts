import WSSetupFunction from "./websocket";
import { createServer } from "http";
import DefaultApp from "./DefaultApplication";

const server = createServer(DefaultApp);

WSSetupFunction(server);

DefaultApp.use((req, res, next) => {
  if (!/(\.(?!html)\w+$|__webpack.*)/.test(req.url)) {
    req.url = "/"; // this would make express-js serve index.html
  }
  next();
});

server.listen(3001, function () {
  console.log("Example app listening on port 3001!\n");
});
