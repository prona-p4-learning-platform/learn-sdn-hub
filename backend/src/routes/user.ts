import { Router, json } from "express";
import { AuthenticationProvider } from "../authentication/AuthenticationProvider";
import environments from "../Configuration";
import jwt from "jsonwebtoken";
import { celebrate, Joi, Segments } from "celebrate";
import authenticationMiddleware, {
  RequestWithUser,
} from "../authentication/AuthenticationMiddleware";
import { randomUUID } from "crypto";

const loginValidator = celebrate({
  [Segments.BODY]: Joi.object().keys({
    username: Joi.string().required(),
    password: Joi.string().required(),
  }),
});

export default (authProviders: AuthenticationProvider[]): Router => {
  const router = Router();

  router.get("/assignments", authenticationMiddleware, (req, res) => {
    const getAssignments = async () => {
      const reqWithUser = req as RequestWithUser;
      const loggedInUser = reqWithUser.user.username;
      let tempAssignmentMap = new Map(environments);

      for (const authProvider of authProviders) {
        tempAssignmentMap = await authProvider.filterAssignmentList(
          loggedInUser,
          tempAssignmentMap,
        );
      }
      return tempAssignmentMap;
    };

    getAssignments()
      .then((map) => {
        // return list splitted by kubernetes assignments and other assignments
        const assignmentsSplitted: string[][] = [[], []];

        map.forEach((value, key) => {
          if (!value.mountKubeconfig) {
            assignmentsSplitted[0].push(key);
          } else {
            assignmentsSplitted[1].push(key);
          }
        });

        res.status(200).json(assignmentsSplitted);
      })
      .catch((err) => {
        let message = "Unknown error";
        if (err instanceof Error) message = err.message;

        res.status(500).json({ status: "error", message });
      });
  });

  router.get("/point-limits", authenticationMiddleware, (req, res) => {
    (async () => {
      const reqWithUser = req as RequestWithUser;
      const loggedInUser = reqWithUser.user.username;

      let tempAssignmentMap = new Map(environments);
      let pointsMap = new Map<string, number>();

      for (const authProvider of authProviders) {
        tempAssignmentMap = await authProvider.filterAssignmentList(
          loggedInUser,
          tempAssignmentMap,
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
            new Map<string, number>(),
          ),
        );
      }

      return res.status(200).json(Object.fromEntries(pointsMap));
    })().catch((err) => {
      let message = "Unknown error";
      if (err instanceof Error) message = err.message;

      return res.status(500).json({ status: "error", message });
    });
  });

  router.post("/login", json(), loginValidator, (req, res) => {
    const login = async () => {
      const body = req.body as Record<string, string>;
      const username = body.username;
      const password = body.password;

      for (const authProvider of authProviders) {
        try {
          const result = await authProvider.authenticateUser(
            username,
            password,
          );
          const sessionId = randomUUID();
          const token = jwt.sign(
            {
              username: result.username,
              id: result.userid,
              groupNumber: result.groupNumber,
              ...(result.role && { role: result.role }),
              sessionId: sessionId,
            },
            process.env.JWT_TOKENSECRET ?? "some-secret",
          );

          console.log(
            "Handled login for user: " +
              username +
              " token: " +
              token.substring(0, 8) +
              "..." +
              " session:" +
              sessionId +
              " groupNumber: " +
              result.groupNumber +
              " role: " +
              result.role,
          );

          res.status(200).json({
            token,
            username,
            groupNumber: result.groupNumber,
            ...(result.role && { role: result.role }),
            sessionId: sessionId,
          });
          return;
        } catch (err) {
          console.log("error!", err);
        }
      }

      res.status(401).json({ status: "error", error: "Not authenticated." });
    };

    login().catch(() => {}); // should not throw
  });

  router.post(
    "/changePassword",
    authenticationMiddleware,
    json(),
    (req, res) => {
      const change = async () => {
        const reqWithUser = req as RequestWithUser;
        const body = reqWithUser.body as Record<string, string>;
        const oldPassword = body.oldPassword;
        const newPassword = body.newPassword;
        const confirmNewPassword = body.confirmNewPassword;
        const loggedInUser = reqWithUser.user.username;
        const errors = {
          hasErrors: false,
          message: "Unknown error",
        };

        for (const authProvider of authProviders) {
          await authProvider
            .changePassword(
              loggedInUser,
              oldPassword,
              newPassword,
              confirmNewPassword,
            )
            .catch((err) => {
              let message = "Unknown error";
              if (err instanceof Error) message = err.message;

              errors.hasErrors = true;
              errors.message = message;
            });
        }

        if (errors.hasErrors) throw new Error(errors.message);
      };

      // TODO: if one provider fails passwords are changed partially
      change()
        .then(() => {
          res.status(200).json({
            status: "success",
            message: "Password changed successfully!",
          });
        })
        .catch((err) => {
          let message = "Unknown error";
          if (err instanceof Error) message = err.message;

          res.status(500).json({ status: "error", message });
        });
    },
  );

  return router;
};
