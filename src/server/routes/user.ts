import { Router } from "express";
import bodyParser from "body-parser";
import { AuthenticationProvider } from "../authentication/AuthenticationProvider";
import environments from "../Configuration";

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
        return res.status(200).json({ token: result.token, username });
      } catch (err) {
        console.log(err);
      }
    }
    return res.status(401).json({ error: "Not authenticated." });
  });
  return router;
};
