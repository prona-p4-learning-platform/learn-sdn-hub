import { Router, json } from "express";
import Environment, { TerminalStateType } from "../Environment";
import environments from "../Configuration";
import { InstanceProvider } from "../providers/Provider";
import { Persister } from "../database/Persister";
import fs from "fs";
import path from "path";
import authenticationMiddleware, {
  RequestWithUser,
} from "../authentication/AuthenticationMiddleware";
import { celebrate, Joi, Segments } from "celebrate";

const environmentPathParamValidator = celebrate({
  [Segments.PARAMS]: Joi.object().keys({
    environment: Joi.string().required(),
  }),
});

const queryValidator = celebrate({
  [Segments.QUERY]: Joi.object().keys({
    environment: Joi.string().required(),
  }),
});

const environmentPathParamWithAliasValidator = celebrate({
  [Segments.PARAMS]: Joi.object().keys({
    environment: Joi.string().required(),
    alias: Joi.string().required(),
  }),
});

export default (persister: Persister, provider: InstanceProvider): Router => {
  const router = Router();

  router.get(
    "/:environment/configuration",
    environmentPathParamValidator,
    (req, res) => {
      const environment = req.params.environment;
      const targetEnv = environments.get(String(environment));

      if (targetEnv === undefined) {
        res
          .status(404)
          .json({ status: "error", message: "Environment not found" });
        return;
      }

      res.status(200).json({
        files: targetEnv.editableFiles.map((file) => file.alias),
        filePaths: targetEnv.editableFiles.map((file) => file.absFilePath),
        // first subterminal in array of subterminals will define the tab name
        terminals: targetEnv.terminals.map((subterminals) =>
          subterminals.filter(
            (subterminal) =>
              (subterminal.type === "Shell" && subterminal.provideTty) ||
              subterminal.type === "Desktop" ||
              subterminal.type === "WebApp",
          ),
        ),
        stepNames: targetEnv.steps?.map((step) => step.name) ?? [],
        stepLabels: targetEnv.steps?.map((step) => step.label) ?? [],
        rootPath: targetEnv.rootPath,
        workspaceFolders: targetEnv.workspaceFolders,
        useCollaboration: targetEnv.useCollaboration,
        useLanguageClient: targetEnv.useLanguageClient,
      });
    },
  );

  router.get(
    "/:environment/assignment",
    authenticationMiddleware,
    environmentPathParamValidator,
    (req, res) => {
      const reqWithUser = req as RequestWithUser;
      const environment = reqWithUser.params.environment;
      const targetEnv = environments.get(String(environment));

      console.log("/:environment/assignment");

      if (targetEnv === undefined) {
        res
          .status(404)
          .json({ status: "error", message: "Environment not found" });
        return;
      }

      // if assignmentLabSheetLocation specified as "instance",
      // get lab sheet from instance filesystem
      if (targetEnv.assignmentLabSheetLocation === "instance") {
        const env = Environment.getActiveEnvironment(
          reqWithUser.params.environment,
          reqWithUser.user.username,
        );

        if (env) {
          env
            .readFile(targetEnv.assignmentLabSheet, true)
            .then((markdown) => {
              res.status(200).json({ content: markdown });
            })
            .catch((err) => {
              let message = "Unknown error";
              if (err instanceof Error) message = err.message;

              res.status(500).json({ status: "error", message });
            });
        } else {
          res
            .status(500)
            .send({ status: "error", message: "Environment not found." });
        }
      } else {
        try {
          const markdown = fs
            .readFileSync(path.resolve(__dirname, targetEnv.assignmentLabSheet))
            .toString();

          res.status(200).json({ content: markdown });
        } catch (err) {
          let message = "Unknown error";
          if (err instanceof Error) message = err.message;

          res.status(500).json({ status: "error", message });
        }
      }
    },
  );

  router.post(
    "/create",
    authenticationMiddleware,
    queryValidator,
    (req, res) => {
      const reqWithUser = req as RequestWithUser;
      const environment = reqWithUser.query.environment;
      const targetEnv = environments.get(String(environment));

      if (targetEnv === undefined) {
        res
          .status(404)
          .json({ status: "error", message: "Environment not found" });
        return;
      }

      Environment.createEnvironment(
        reqWithUser.user.username,
        reqWithUser.user.groupNumber,
        String(environment),
        targetEnv,
        provider,
        persister,
      )
        .then(() => {
          res.status(200).json({ status: "success" });
        })
        .catch((err) => {
          let message = "Unknown error";
          if (err instanceof Error) message = err.message;

          res.status(500).json({ status: "error", message });
        });
    },
  );

  router.post(
    "/delete",
    authenticationMiddleware,
    queryValidator,
    (req, res) => {
      const reqWithUser = req as RequestWithUser;
      const environment = reqWithUser.query.environment;
      const targetEnv = environments.get(String(environment));

      if (targetEnv === undefined) {
        res
          .status(404)
          .json({ status: "error", message: "Environment not found" });
        return;
      }

      Environment.deleteEnvironment(
        reqWithUser.user.username,
        String(environment),
      )
        .then((deleted) => {
          if (deleted) {
            res.status(200).json({ status: "success" });
          } else {
            res.status(500).json({
              status: "error",
              message: "Environment deletion failed",
            });
          }
        })
        .catch((err) => {
          let message = "Unknown error";
          if (err instanceof Error) message = err.message;

          console.log("Failed to delete environment " + message);
          res.status(500).json({
            status: "error",
            message: "Failed to delete environment " + message,
          });
        });
    },
  );

  router.get(
    "/:environment/file/:alias",
    authenticationMiddleware,
    environmentPathParamWithAliasValidator,
    (req, res) => {
      const reqWithUser = req as RequestWithUser;
      const env = Environment.getActiveEnvironment(
        reqWithUser.params.environment,
        reqWithUser.user.username,
      );

      if (env) {
        env
          .readFile(reqWithUser.params.alias)
          .then((content: string) => {
            res.status(200).json({
              content,
              location: env.getFilePathByAlias(reqWithUser.params.alias),
            });
          })
          .catch((err) => {
            let message = "Unknown error";
            if (err instanceof Error) message = err.message;

            res.status(500).json({ status: "error", message });
          });
      } else {
        res
          .status(500)
          .json({ status: "error", message: "No active environment found." });
      }
    },
  );

  router.post(
    "/:environment/file/:alias",
    json(),
    authenticationMiddleware,
    environmentPathParamWithAliasValidator,
    (req, res) => {
      const reqWithUser = req as RequestWithUser;
      const env = Environment.getActiveEnvironment(
        reqWithUser.params.environment,
        reqWithUser.user.username,
      );

      if (env) {
        const body = reqWithUser.body as Record<string, unknown>; // TODO: add validator

        env
          .writeFile(reqWithUser.params.alias, body.data as string)
          .then(() => {
            res.status(200).json({ status: "success" });
          })
          .catch((err) => {
            let message = "Unknown error";
            if (err instanceof Error) message = err.message;

            res.status(400).json({ status: "error", message });
          });
      } else {
        res
          .status(500)
          .json({ status: "error", message: "No active environment found." });
      }
    },
  );

  router.get(
    "/:environment/collabdoc/:alias",
    authenticationMiddleware,
    environmentPathParamWithAliasValidator,
    (req, res) => {
      const reqWithUser = req as RequestWithUser;

      Environment.getCollabDoc(
        reqWithUser.params.alias,
        reqWithUser.params.environment,
        reqWithUser.user.username,
      )
        .then((content) => {
          res.status(200).json({ content });
        })
        .catch((err) => {
          let message = "Unknown error";
          if (err instanceof Error) message = err.message;

          res.status(500).json({ status: "error", message });
        });
    },
  );

  router.post(
    "/:environment/restart",
    authenticationMiddleware,
    environmentPathParamValidator,
    (req, res) => {
      const reqWithUser = req as RequestWithUser;
      const env = Environment.getActiveEnvironment(
        reqWithUser.params.environment,
        reqWithUser.user.username,
      );

      if (env) {
        env
          .restart()
          .then(() => {
            res
              .status(200)
              .json({ status: "finished", message: "Restart complete" });
          })
          .catch((err) => {
            let message = "Unknown error";
            if (err instanceof Error) message = err.message;

            res.status(500).json({ status: "error", message });
          });
      } else {
        res
          .status(500)
          .json({ status: "error", message: "No active environment found." });
      }
    },
  );

  router.post(
    "/:environment/test",
    json(),
    authenticationMiddleware,
    environmentPathParamValidator,
    (req, res) => {
      const reqWithUser = req as RequestWithUser;
      const env = Environment.getActiveEnvironment(
        reqWithUser.params.environment,
        reqWithUser.user.username,
      );
      const { activeStep, terminalState } = reqWithUser.body as {
        activeStep: string;
        terminalState: TerminalStateType[];
      };

      if (env) {
        env
          .test(activeStep, terminalState)
          .then((testResult) => {
            if (testResult.code >= 200 && testResult.code < 251) {
              res.status(testResult.code).json({
                status: "passed",
                message: testResult.message,
              });
            } else {
              res.status(testResult.code).json({
                status: "failed",
                message: testResult.message,
              });
            }
          })
          .catch((err) => {
            let message = "Unknown error";
            if (err instanceof Error) message = err.message;

            res.status(500).json({ status: "error", message });
          });
      } else {
        res
          .status(500)
          .json({ status: "error", message: "No active environment found." });
      }
    },
  );

  router.post(
    "/:environment/submit",
    json(),
    authenticationMiddleware,
    environmentPathParamValidator,
    (req, res) => {
      const reqWithUser = req as RequestWithUser;
      const env = Environment.getActiveEnvironment(
        reqWithUser.params.environment,
        reqWithUser.user.username,
      );
      // TODO: add validator
      const { activeStep, terminalState } = reqWithUser.body as {
        activeStep: string;
        terminalState: TerminalStateType[];
      };

      if (env) {
        env
          .submit(activeStep, terminalState)
          .then(() => {
            res.status(200).json({
              status: "finished",
              message:
                "Terminal content and files submitted! Assignment finished!",
            });
          })
          .catch((err) => {
            let message = "Unknown error";
            if (err instanceof Error) message = err.message;

            res.status(500).json({ status: "error", message });
          });
      } else {
        res
          .status(500)
          .json({ status: "error", message: "No active environment found." });
      }
    },
  );

  router.get(
    "/deployed-user-environments",
    authenticationMiddleware,
    (req, res) => {
      const reqWithUser = req as RequestWithUser;
      const deployedEnvList = Environment.getDeployedUserEnvironmentList(
        reqWithUser.user.username,
      );

      res.status(200).json(deployedEnvList);
    },
  );

  router.get(
    "/deployed-group-environments",
    authenticationMiddleware,
    (req, res) => {
      const reqWithUser = req as RequestWithUser;
      const deployedEndpList = Environment.getDeployedGroupEnvironmentList(
        reqWithUser.user.groupNumber,
      );

      res.status(200).json(deployedEndpList);
    },
  );

  router.get("/submissions", authenticationMiddleware, (req, res) => {
    const reqWithUser = req as RequestWithUser;

    Environment.getUserSubmissions(
      persister,
      reqWithUser.user.username,
      reqWithUser.user.groupNumber,
    )
      .then((submittedEnvList) => {
        res.status(200).json(submittedEnvList);
      })
      .catch((err) => {
        console.log("No submission found " + err);
        res.status(200).json([]);
      });
  });

  router.get(
    "/:environment/provider-instance-status",
    authenticationMiddleware,
    environmentPathParamValidator,
    (req, res) => {
      const reqWithUser = req as RequestWithUser;
      const env = Environment.getActiveEnvironment(
        reqWithUser.params.environment,
        reqWithUser.user.username,
      );

      if (env) {
        env
          .getProviderInstanceStatus()
          .then((value) => {
            res.status(200).json({ status: "success", message: value });
          })
          .catch(() => {
            res.status(200).json({ status: "success", message: "" });
          });
      } else {
        res
          .status(500)
          .json({ status: "error", message: "No active environment found." });
      }
    },
  );

  return router;
};
