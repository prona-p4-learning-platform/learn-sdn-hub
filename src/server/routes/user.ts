import { Router } from "express";
import bodyParser from "body-parser";
import { AuthenticationProvider } from "../authentication/AuthenticationProvider";
import environments from "../Configuration";

export default (authProviders: AuthenticationProvider[]): Router => {
  const router = Router();

  router.get("/assignments", async (req, res) => {
    return res.status(200).json(environments.keys());
  });

  router.post("/login", bodyParser.json(), async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    console.log(req.body)
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
