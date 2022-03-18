import { RequestHandler, Router } from "express";
import bodyParser from "body-parser";
import { AuthenticationProvider } from "../authentication/AuthenticationProvider";
import environments from "../Configuration";
import jwt from "jsonwebtoken";
import { celebrate, Joi, Segments } from "celebrate";
import authenticationMiddleware, {
  RequestWithUser,
} from "../authentication/AuthenticationMiddleware";

const loginValidator = celebrate({
  [Segments.BODY]: Joi.object().keys({
    username: Joi.string().required(),
    password: Joi.string().required(),
  }),
});

export default (authProviders: AuthenticationProvider[]): Router => {
  const router = Router();

  router.get(
    "/assignments",
    authenticationMiddleware,
    async (req: RequestWithUser, res) => {
      const loggedInUser = req.user.username;
      let tempAssignmentMap = new Map(environments);
      for (const authProvider of authProviders) {
        tempAssignmentMap = await authProvider.filterAssignmentList(
          loggedInUser,
          tempAssignmentMap
        );
      }
      return res.status(200).json(Array.from(tempAssignmentMap.keys()));
    }
  );

  // remove body-parser as it is included in express >=4.17
  router.post(
    "/login",
    bodyParser.json() as RequestHandler,
    loginValidator,
    async (req, res) => {
      const username = req.body.username;
      const password = req.body.password;
      for (const authProvider of authProviders) {
        try {
          const result = await authProvider.authenticateUser(
            username,
            password
          );
          const token = jwt.sign(
            {
              username: result.username,
              id: result.userid,
              groupNumber: result.groupNumber,
            },
            "some-secret"
          );
          console.log(result, token);
          return res.status(200).json({ token, username });
        } catch (err) {
          console.log("error!", err);
        }
      }
      return res.status(401).json({ error: "Not authenticated." });
    }
  );
  return router;
};
