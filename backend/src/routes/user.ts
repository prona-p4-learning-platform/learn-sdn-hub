/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-misused-promises */
// TODO: fix eslint instead of disabling rules

import express, { Router } from "express";
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

  router.get("/assignments", authenticationMiddleware, async (req, res) => {
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
  });

  // remove body-parser as it is included in express >=4.17
  router.post("/login", express.json(), loginValidator, async (req, res) => {
    const username = req.body.username as string;
    const password = req.body.password as string;

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
  });

  router.post(
    "/changePassword",
    authenticationMiddleware,
    express.json(),
    (req, res) => {
      const reqWithUser = req as RequestWithUser;
      const oldPassword = reqWithUser.body.oldPassword;
      const newPassword = reqWithUser.body.newPassword;
      const confirmNewPassword = reqWithUser.body.confirmNewPassword;
      const loggedInUser = reqWithUser.user.username;

      for (const authProvider of authProviders) {
        authProvider
          .changePassword(
            loggedInUser,
            oldPassword,
            newPassword,
            confirmNewPassword,
          )
          .catch((err) => {
            console.log("error!", err);
            res.status(500).json({ status: "error", message: err.message });
          })
          .then(() => {
            res.status(200).json({
              status: "success",
              message: "Password changed successfully!",
            });
          });
      }
    },
  );

  return router;
};
