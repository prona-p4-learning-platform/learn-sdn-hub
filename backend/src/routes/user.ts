import { Router } from "express";
import bodyParser from "body-parser";
import { AuthenticationProvider } from "../authentication/AuthenticationProvider";
import environments from "../Configuration";
import jwt from "jsonwebtoken";

export default (authProviders: AuthenticationProvider[]): Router => {
  const router = Router();

  router.get("/assignments", async (req, res) => {
    console.log("assignments");
    return res.status(200).json(Array.from(environments.keys()));
  });

  router.post("/login", bodyParser.json(), async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    for (const authProvider of authProviders) {
      try {
        const result = await authProvider.authenticateUser(username, password);
        const token = jwt.sign(
          { username: result.username, id: result.userid },
          "some-secret"
        );
        return res.status(200).json({ token, username });
      } catch (err) {
        console.log("error!", err);
      }
    }
    return res.status(401).json({ error: "Not authenticated." });
  });
  return router;
};
