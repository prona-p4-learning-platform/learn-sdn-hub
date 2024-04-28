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

  router.get(
    "/point-limits",
    authenticationMiddleware,
    async (req: RequestWithUser, res) => {
      const loggedInUser = req.user.username;

      let tempAssignmentMap = new Map(environments);
      let pointsMap = new Map();
      for (const authProvider of authProviders) {
        tempAssignmentMap = await authProvider.filterAssignmentList(
          loggedInUser,
          tempAssignmentMap
        );

        // Only include entries that have maxBonusPoints set
        pointsMap = new Map(
          Array.from(tempAssignmentMap.entries()).reduce(
            (acc, [key, value]) => {
              if (value.maxBonusPoints !== undefined) {
                acc.set(key, value.maxBonusPoints);
              }
              return acc;
            },
            new Map()
          )
        );
      }

      return res.status(200).json(Object.fromEntries(pointsMap));
    }
  );

  // remove body-parser as it is included in express >=4.17
  router.post(
    "/login",
    bodyParser.json() as RequestHandler,
    loginValidator,
    async (req, res) => {
      const username = req.body.username as string;
      const password = req.body.password as string;
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
              ...(result.role && { role: result.role }),
            },
            /* replace secret */
            "some-secret"
          ) as string;
          console.log(result, token);
          return res.status(200).json({
            token,
            username,
            groupNumber: result.groupNumber,
            ...(result.role && { role: result.role }),
          });
        } catch (err) {
          console.log("error!", err);
        }
      }
      return res.status(401).json({ error: "Not authenticated." });
    }
  );

  router.post(
    "/changePassword",
    authenticationMiddleware,
    bodyParser.json() as RequestHandler,
    async (req: RequestWithUser, res) => {
      const oldPassword = req.body.oldPassword;
      const newPassword = req.body.newPassword;
      const confirmNewPassword = req.body.confirmNewPassword;
      const loggedInUser = req.user.username;

      for (const authProvider of authProviders) {
        authProvider
          .changePassword(
            loggedInUser,
            oldPassword,
            newPassword,
            confirmNewPassword
          )
          .catch((err) => {
            console.log("error!", err);
            return res.status(500).json();
          })
          .then(() => {
            return res.status(200).json();
          });
      }
    }
  );
  return router;
};
