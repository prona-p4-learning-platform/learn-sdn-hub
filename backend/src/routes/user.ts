import express, { Router, RequestHandler } from "express";
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

  router.get("/assignments", authenticationMiddleware, (async (req, res) => {
    const reqWithUser = req as RequestWithUser;
    const loggedInUser = reqWithUser.user.username;
    let tempAssignmentMap = new Map(environments);

    for (const authProvider of authProviders) {
      tempAssignmentMap = await authProvider.filterAssignmentList(
        loggedInUser,
        tempAssignmentMap,
      );
    }

    res.status(200).json(Array.from(tempAssignmentMap.keys()));
  }) as RequestHandler);

  router.post("/login", express.json(), loginValidator, (async (req: {body: {username: string, password: string}}, res) => {
    const username = req.body.username;
    const password = req.body.password;

    for (const authProvider of authProviders) {
      try {
        const result = await authProvider.authenticateUser(username, password);
        const token = jwt.sign(
          {
            username: result.username,
            id: result.userid,
            groupNumber: result.groupNumber,
          },
          /* TODO: replace secret */
          "some-secret",
        );

        console.log(result, token);

        res
          .status(200)
          .json({ token, username, groupNumber: result.groupNumber });
        return;
      } catch (err) {
        console.log("error!", err);
      }
    }

    res.status(401).json({ error: "Not authenticated." });
  }) as RequestHandler);

  router.post(
    "/changePassword",
    authenticationMiddleware,
    express.json(),
    (async (req, res) => {
      const reqWithUser = req as RequestWithUser;
      const { oldPassword, newPassword, confirmNewPassword } = reqWithUser.body as {
        oldPassword: string;
        newPassword: string;
        confirmNewPassword: string;
      };
      const loggedInUser = reqWithUser.user.username;

      for (const authProvider of authProviders) {
        try {
          await authProvider.changePassword(
            loggedInUser,
            oldPassword,
            newPassword,
            confirmNewPassword,
          );
          res.status(200).json();
        } catch (err: unknown) {
          console.log("Unable to change password: ", err);
          res.status(500).json({ message: (err as Error).message });
        }
      }
    }) as RequestHandler);

  return router;
};
