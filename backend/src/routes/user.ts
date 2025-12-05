import { json, Router } from "express";
import { AuthenticationProvider } from "../authentication/AuthenticationProvider";
import environments from "../Configuration";
import { celebrate, Joi, Segments } from "celebrate";
import authenticationMiddleware, {
  RequestWithUser,
} from "../authentication/AuthenticationMiddleware";
import { Persister } from "../database/Persister";
import { LoginError, userService } from "../service/user.service";

const authValidator = celebrate({
  [Segments.BODY]: Joi.object({
    type: Joi.string().valid("jwt", "basic").required(),
    token: Joi.when("type", {
      is: "jwt",
      then: Joi.string().required(),
      otherwise: Joi.forbidden(),
    }),
    username: Joi.when("type", {
      is: "basic",
      then: Joi.string().required(),
      otherwise: Joi.forbidden(),
    }),
    password: Joi.when("type", {
      is: "basic",
      then: Joi.string().required(),
      otherwise: Joi.forbidden(),
    }),
  }),
});

/**
 * TODO Currently only the /login endpoint are extracted into the {@link user.service}. Everything else could also be exported to enforce encapsulation.
 */
export default (
  authProviders: AuthenticationProvider[],
  persister: Persister,
): Router => {
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
        const assignmentTypes: Record<string, boolean> = {};

        map.forEach((value, key) => {
          if (!value.mountKubeconfig) {
            assignmentsSplitted[0].push(key);
          } else {
            assignmentsSplitted[1].push(key);
          }

          if(value.isExam !== undefined) {
            assignmentTypes[key] = value.isExam;
          }
        });

        res.status(200).json({ assignments: assignmentsSplitted, types: assignmentTypes });
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

  router.post("/login", json(), authValidator, (req, res) => {
    const login = async () => {
      const body = req.body as Record<string, string>;
      try {
        switch (body.type) {
          case "jwt": {
            const loginResponse = await userService.loginOidc(
              body.token,
              persister,
            );
            res.status(200).json(loginResponse);
            return;
          }
          case "basic": {
            const loginResponse = await userService.loginBasic(
              body.username,
              body.password,
              authProviders,
            );
            res.status(200).json(loginResponse);
            return;
          }
        }
      } catch (error) {
        // Error handling
        if (error instanceof LoginError) {
          res.status(401).json({ status: "error", error: error.message });
          return;
        }
        if (error instanceof Error) {
          res.status(500).json({ status: "error", error: error.message });
          return;
        }
        // Handle unexpected error types
        res
          .status(500)
          .json({ status: "error", error: "An unknown error occurred" });
      }
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
