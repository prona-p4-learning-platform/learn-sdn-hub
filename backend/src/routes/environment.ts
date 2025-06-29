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
        // Check if user has this environment deployed
        persister.GetUserEnvironments(reqWithUser.user.username)
          .then((userEnvironments) => {
            const deployedEnv = userEnvironments.find(env => env.environment === environment);
            if (deployedEnv) {
              // Create a temporary environment instance to read the file
              Environment.createEnvironment(
                reqWithUser.user.username,
                reqWithUser.user.groupNumber,
                reqWithUser.user.sessionId,
                environment,
                targetEnv,
                provider,
                persister,
              )
                .then((env) => {
                  return env.readFile(targetEnv.assignmentLabSheet, true);
                })
                .then((markdown) => {
                  res.status(200).json({ content: markdown });
                })
                .catch((err) => {
                  let message = "Unknown error";
                  if (err instanceof Error) message = err.message;
                  res.status(500).json({ status: "error", message });
                });
            } else {
              res.status(500).send({ 
                status: "error", 
                message: "Environment not deployed. Please deploy the environment first." 
              });
            }
          })
          .catch((err) => {
            let message = "Unknown error";
            if (err instanceof Error) message = err.message;
            res.status(500).json({ status: "error", message });
          });
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
      const environment = reqWithUser.query.environment as string;
      const targetEnv = environments.get(environment);

      if (targetEnv === undefined) {
        res
          .status(404)
          .json({ status: "error", message: "Environment not found" });
        return;
      }

      Environment.createEnvironment(
        reqWithUser.user.username,
        reqWithUser.user.groupNumber,
        reqWithUser.user.sessionId,
        environment,
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
      const environment = reqWithUser.query.environment as string;
      const targetEnv = environments.get(environment);

      if (targetEnv === undefined) {
        res
          .status(404)
          .json({ status: "error", message: "Environment not found" });
        return;
      }

      Environment.deleteEnvironment(persister, provider, reqWithUser.user.groupNumber, environment)
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
      const environment = reqWithUser.params.environment;
      const targetEnv = environments.get(String(environment));

      if (targetEnv === undefined) {
        res
          .status(404)
          .json({ status: "error", message: "Environment not found" });
        return;
      }

      // Check if user has this environment deployed
      persister.GetUserEnvironments(reqWithUser.user.username)
        .then((userEnvironments) => {
          const deployedEnv = userEnvironments.find(env => env.environment === environment);
          if (deployedEnv) {
            // Create a temporary environment instance to read the file
            Environment.createEnvironment(
              reqWithUser.user.username,
              reqWithUser.user.groupNumber,
              reqWithUser.user.sessionId,
              environment,
              targetEnv,
              provider,
              persister,
            )
              .then((env) => {
                return env.readFile(reqWithUser.params.alias);
              })
              .then((content: string | undefined) => {
                if (content === undefined) {
                  res.status(404).json({
                    status: "error",
                    message: "File not found or handler not initialized",
                  });
                  return;
                }
                res.status(200).json({
                  content,
                  location: targetEnv.editableFiles.find(f => f.alias === reqWithUser.params.alias)?.absFilePath,
                });
              })
              .catch((err) => {
                let message = "Unknown error";
                if (err instanceof Error) message = err.message;

                res.status(500).json({ status: "error", message });
              });
          } else {
            res.status(500).json({ 
              status: "error", 
              message: "Environment not deployed. Please deploy the environment first." 
            });
          }
        })
        .catch((err) => {
          let message = "Unknown error";
          if (err instanceof Error) message = err.message;
          res.status(500).json({ status: "error", message });
        });
    },
  );

  router.post(
    "/:environment/file/:alias",
    json(),
    authenticationMiddleware,
    environmentPathParamWithAliasValidator,
    (req, res) => {
      const reqWithUser = req as RequestWithUser;
      const environment = reqWithUser.params.environment;
      const targetEnv = environments.get(String(environment));

      if (targetEnv === undefined) {
        res
          .status(404)
          .json({ status: "error", message: "Environment not found" });
        return;
      }

      // Check if user has this environment deployed
      persister.GetUserEnvironments(reqWithUser.user.username)
        .then((userEnvironments) => {
          const deployedEnv = userEnvironments.find(env => env.environment === environment);
          if (deployedEnv) {
            // Create a temporary environment instance to write the file
            Environment.createEnvironment(
              reqWithUser.user.username,
              reqWithUser.user.groupNumber,
              reqWithUser.user.sessionId,
              environment,
              targetEnv,
              provider,
              persister,
            )
              .then((env) => {
                const body = reqWithUser.body as Record<string, unknown>; // TODO: add validator
                return env.writeFile(reqWithUser.params.alias, body.data as string);
              })
              .then(() => {
                res.status(200).json({ status: "success" });
              })
              .catch((err) => {
                let message = "Unknown error";
                if (err instanceof Error) message = err.message;

                res.status(400).json({ status: "error", message });
              });
          } else {
            res.status(500).json({ 
              status: "error", 
              message: "Environment not deployed. Please deploy the environment first." 
            });
          }
        })
        .catch((err) => {
          let message = "Unknown error";
          if (err instanceof Error) message = err.message;
          res.status(500).json({ status: "error", message });
        });
    },
  );

  router.get(
    "/:environment/collabdoc/:alias",
    authenticationMiddleware,
    environmentPathParamWithAliasValidator,
    (req, res) => {
      const reqWithUser = req as RequestWithUser;
      const environment = reqWithUser.params.environment;
      const targetEnv = environments.get(String(environment));

      if (targetEnv === undefined) {
        res
          .status(404)
          .json({ status: "error", message: "Environment not found" });
        return;
      }

      // Check if user has this environment deployed
      persister.GetUserEnvironments(reqWithUser.user.username)
        .then((userEnvironments) => {
          const deployedEnv = userEnvironments.find(env => env.environment === environment);
          if (deployedEnv) {
            // Create a temporary environment instance for collaboration document
            Environment.createEnvironment(
              reqWithUser.user.username,
              reqWithUser.user.groupNumber,
              reqWithUser.user.sessionId,
              environment,
              targetEnv,
              provider,
              persister,
            )
              .then((env) => {
                return Environment.getCollabDoc(reqWithUser.params.alias, env);
              })
              .then((content) => {
                res.status(200).json({ content });
              })
              .catch((err) => {
                let message = "Unknown error";
                if (err instanceof Error) message = err.message;

                res.status(500).json({ status: "error", message });
              });
          } else {
            res.status(500).json({ 
              status: "error", 
              message: "Environment not deployed. Please deploy the environment first." 
            });
          }
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
      const environment = reqWithUser.params.environment;
      const targetEnv = environments.get(String(environment));

      if (targetEnv === undefined) {
        res
          .status(404)
          .json({ status: "error", message: "Environment not found" });
        return;
      }

      // Check if user has this environment deployed
      persister.GetUserEnvironments(reqWithUser.user.username)
        .then((userEnvironments) => {
          const deployedEnv = userEnvironments.find(env => env.environment === environment);
          if (deployedEnv) {
            // Create a temporary environment instance to restart
            Environment.createEnvironment(
              reqWithUser.user.username,
              reqWithUser.user.groupNumber,
              reqWithUser.user.sessionId,
              environment,
              targetEnv,
              provider,
              persister,
            )
              .then((env) => {
                return env.restart(reqWithUser.user.sessionId);
              })
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
            res.status(500).json({ 
              status: "error", 
              message: "Environment not deployed. Please deploy the environment first." 
            });
          }
        })
        .catch((err) => {
          let message = "Unknown error";
          if (err instanceof Error) message = err.message;
          res.status(500).json({ status: "error", message });
        });
    },
  );

  router.post(
    "/:environment/test",
    json(),
    authenticationMiddleware,
    environmentPathParamValidator,
    (req, res) => {
      const reqWithUser = req as RequestWithUser;
      const environment = reqWithUser.params.environment;
      const targetEnv = environments.get(String(environment));
      const { activeStep, terminalState } = reqWithUser.body as {
        activeStep: string;
        terminalState: TerminalStateType[];
      };

      if (targetEnv === undefined) {
        res
          .status(404)
          .json({ status: "error", message: "Environment not found" });
        return;
      }

      // Check if user has this environment deployed
      persister.GetUserEnvironments(reqWithUser.user.username)
        .then((userEnvironments) => {
          const deployedEnv = userEnvironments.find(env => env.environment === environment);
          if (deployedEnv) {
            // Create a temporary environment instance to run tests
            Environment.createEnvironment(
              reqWithUser.user.username,
              reqWithUser.user.groupNumber,
              reqWithUser.user.sessionId,
              environment,
              targetEnv,
              provider,
              persister,
            )
              .then((env) => {
                return env.test(activeStep, terminalState);
              })
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
            res.status(500).json({ 
              status: "error", 
              message: "Environment not deployed. Please deploy the environment first." 
            });
          }
        })
        .catch((err) => {
          let message = "Unknown error";
          if (err instanceof Error) message = err.message;
          res.status(500).json({ status: "error", message });
        });
    },
  );

  router.post(
    "/:environment/submit",
    json(),
    authenticationMiddleware,
    environmentPathParamValidator,
    (req, res) => {
      const reqWithUser = req as RequestWithUser;
      const environment = reqWithUser.params.environment;
      const targetEnv = environments.get(String(environment));
      // TODO: add validator
      const { activeStep, terminalState } = reqWithUser.body as {
        activeStep: string;
        terminalState: TerminalStateType[];
      };

      if (targetEnv === undefined) {
        res
          .status(404)
          .json({ status: "error", message: "Environment not found" });
        return;
      }

      // Check if user has this environment deployed
      persister.GetUserEnvironments(reqWithUser.user.username)
        .then((userEnvironments) => {
          const deployedEnv = userEnvironments.find(env => env.environment === environment);
          if (deployedEnv) {
            // Create a temporary environment instance to submit
            Environment.createEnvironment(
              reqWithUser.user.username,
              reqWithUser.user.groupNumber,
              reqWithUser.user.sessionId,
              environment,
              targetEnv,
              provider,
              persister,
            )
              .then((env) => {
                return env.submit(activeStep, terminalState);
              })
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
            res.status(500).json({ 
              status: "error", 
              message: "Environment not deployed. Please deploy the environment first." 
            });
          }
        })
        .catch((err) => {
          let message = "Unknown error";
          if (err instanceof Error) message = err.message;
          res.status(500).json({ status: "error", message });
        });
    },
  );

  router.get(
    "/deployed-user-environments",
    authenticationMiddleware,
    (req, res) => {
      const reqWithUser = req as RequestWithUser;
      Environment.getDeployedUserSessionEnvironmentList(
        persister,
        reqWithUser.user.username,
      )
        .then((deployedEnvList) => {
          res.status(200).json(deployedEnvList);
        })
        .catch((err) => {
          let message = "Unknown error";
          if (err instanceof Error) message = err.message;
          res.status(500).json({ status: "error", message });
        });
    },
  );

  router.get(
    "/deployed-group-environments",
    authenticationMiddleware,
    (req, res) => {
      const reqWithUser = req as RequestWithUser;
      Environment.getDeployedGroupEnvironmentList(
        persister,
        reqWithUser.user.groupNumber,
      )
        .then((deployedEndpList) => {
          res.status(200).json(deployedEndpList);
        })
        .catch((err) => {
          let message = "Unknown error";
          if (err instanceof Error) message = err.message;
          res.status(500).json({ status: "error", message });
        });
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
      const environment = reqWithUser.params.environment;
      const targetEnv = environments.get(String(environment));

      if (targetEnv === undefined) {
        res
          .status(404)
          .json({ status: "error", message: "Environment not found" });
        return;
      }

      // Check if user has this environment deployed
      persister.GetUserEnvironments(reqWithUser.user.username)
        .then((userEnvironments) => {
          const deployedEnv = userEnvironments.find(env => env.environment === environment);
          if (deployedEnv) {
            // Create a temporary environment instance to get provider status
            Environment.createEnvironment(
              reqWithUser.user.username,
              reqWithUser.user.groupNumber,
              reqWithUser.user.sessionId,
              environment,
              targetEnv,
              provider,
              persister,
            )
              .then((env) => {
                return env.getProviderInstanceStatus();
              })
              .then((value: string) => {
                res.status(200).json({ status: "success", message: value });
              })
              .catch(() => {
                res.status(200).json({ status: "success", message: "" });
              });
          } else {
            res.status(500).json({ 
              status: "error", 
              message: "Environment not deployed. Please deploy the environment first." 
            });
          }
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
