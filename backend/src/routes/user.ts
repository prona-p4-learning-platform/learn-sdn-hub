import { Router } from "express";
import bodyParser from "body-parser";
import { AuthenticationProvider } from "../authentication/AuthenticationProvider";
import environments from "../Configuration";
import jwt from "jsonwebtoken";
import { celebrate, Joi, Segments } from "celebrate";

const loginValidator = celebrate({
  [Segments.BODY]: Joi.object().keys({
    username: Joi.string().required(),
    password: Joi.string().required(),
  }),
});

export default (authProviders: AuthenticationProvider[]): Router => {
  const router = Router();

  router.get("/assignments", async (req, res) => {
    return res.status(200).json(Array.from(environments.keys()));
  });

  router.post("/login", bodyParser.json(), loginValidator, async (req, res) => {
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
