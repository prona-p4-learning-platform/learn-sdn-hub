/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-misused-promises */
// TODO: fix eslint instead of disabling rules

import { Router } from "express";
import Environment, {
  AliasedFile,
  TerminalType,
  AssignmentStep,
} from "../Environment";
import bodyParser from "body-parser";
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
        res.status(404).json({ error: true, message: "Environment not found" });
        return;
      }

      res.status(200).json({
        files: targetEnv.editableFiles.map((file: AliasedFile) => file.alias),
        filePaths: targetEnv.editableFiles.map(
          (file: AliasedFile) => file.absFilePath,
        ),
        // first subterminal in array of subterminals will define the tab name
        terminals: targetEnv.terminals.filter((subterminals: TerminalType[]) =>
          subterminals.filter(
            (subterminal: TerminalType) =>
              (subterminal.type === "Shell" && subterminal.provideTty) ||
              subterminal.type === "Desktop" ||
              subterminal.type === "WebApp",
          ),
        ),
        stepNames:
          targetEnv.steps?.map((step: AssignmentStep) => step.name) ?? [],
        stepLabels:
          targetEnv.steps?.map((step: AssignmentStep) => step.label) ?? [],
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
    async (req, res) => {
      const reqWithUser = req as RequestWithUser;
      const environment = reqWithUser.params.environment;
      const targetEnv = environments.get(String(environment));

      console.log("/:environment/assignment");

      if (targetEnv === undefined) {
        res.status(404).json({ error: true, message: "Environment not found" });
        return;
      }

      let markdown: string | undefined;
      // if assignmentLabSheetLocation specified as "instance",
      // get lab sheet from instance filesystem
      if (targetEnv.assignmentLabSheetLocation === "instance") {
        const env = Environment.getActiveEnvironment(
          reqWithUser.params.environment,
          reqWithUser.user.username,
        );

        if (env) {
          markdown = await env.readFile(targetEnv.assignmentLabSheet, true);
        } else {
          res
            .status(500)
            .send({ status: "error", message: "Environment not found." });
          return;
        }
      } else {
        markdown = fs
          .readFileSync(path.resolve(__dirname, targetEnv.assignmentLabSheet))
          .toString();
      }

      res.send(markdown);
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
        res.status(404).json({ error: true, message: "Environment not found" });
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
          res.status(200).json();
        })
        .catch((err: Error) => {
          console.log(err);
          res.status(500).json({ status: "error", message: err.message });
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
        res.status(404).json({ error: true, message: "Environment not found" });
        return;
      }

      Environment.deleteEnvironment(
        reqWithUser.user.username,
        String(environment),
      )
        .then((deleted) => {
          if (deleted === true) {
            res.status(200).json();
          } else {
            res.status(500).json({
              status: "error",
              message: "Environment deletion failed",
            });
          }
        })
        .catch((err: Error) => {
          console.log("Failed to delete environment " + err.message);
          res.status(500).json({
            status: "error",
            message: "Failed to delete environment " + err.message,
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
            res
              .set(
                "Content-Location",
                env.getFilePathByAlias(reqWithUser.params.alias),
              )
              .set("Access-Control-Expose-Headers", "Content-Location")
              .status(200)
              .end(content);
          })
          .catch((err) => {
            console.log(err);
            res.status(500).json({ error: true, message: err.message });
          });
      } else {
        res
          .status(500)
          .json({ error: true, message: "No active environment found." });
      }
    },
  );

  router.post(
    "/:environment/file/:alias",
    bodyParser.text({ type: "text/plain" }),
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
          .writeFile(reqWithUser.params.alias, reqWithUser.body)
          .then(() => res.status(200).end())
          .catch((err: Error) =>
            res.status(400).json({ status: "error", message: err.message }),
          );
      } else {
        res
          .status(500)
          .json({ error: true, message: "No active environment found." });
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
          res.status(200).end(content);
        })
        .catch((err) => {
          console.log(err);
          res.status(500).json({ error: true, message: err.message });
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
          .catch((err) =>
            res.status(500).json({ status: "error", message: err.message }),
          );
      } else {
        res
          .status(500)
          .json({ error: true, message: "No active environment found." });
      }
    },
  );

  router.post(
    "/:environment/test",
    bodyParser.json({ type: "application/json" }),
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
          .test(reqWithUser.body.activeStep, reqWithUser.body.terminalState)
          .then((testResult) => {
            res.status(200).json({
              status: "finished",
              message: testResult,
            });
          })
          .catch((err) =>
            res.status(500).json({ status: "error", message: err.message }),
          );
      } else {
        res
          .status(500)
          .json({ error: true, message: "No active environment found." });
      }
    },
  );

  // remove body-parser as it is included in express >=4.17
  router.post(
    "/:environment/submit",
    bodyParser.json({ type: "application/json" }),
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
          .submit(reqWithUser.body.activeStep, reqWithUser.body.terminalState)
          .then(() => {
            res.status(200).json({
              status: "finished",
              message:
                "Terminal content and files submitted! Assignment finished!",
            });
          })
          .catch((err) =>
            res.status(500).json({ status: "error", message: err.message }),
          );
      } else {
        res
          .status(500)
          .json({ error: true, message: "No active environment found." });
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

      res.status(200).json(Array.from(deployedEnvList));
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

      res.status(200).json(Array.from(deployedEndpList));
    },
  );

  router.get("/submissions", authenticationMiddleware, async (req, res) => {
    const reqWithUser = req as RequestWithUser;

    await Environment.getUserSubmissions(
      persister,
      reqWithUser.user.username,
      reqWithUser.user.groupNumber,
    )
      .then((submittedEnvList) => {
        res.status(200).json(Array.from(submittedEnvList ?? []));
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
            res.status(200).json({ status: value });
          })
          .catch(() => {
            res.status(200).json({ status: "" });
          });
      } else {
        res
          .status(500)
          .json({ error: true, message: "No active environment found." });
      }
    },
  );

  return router;
};
