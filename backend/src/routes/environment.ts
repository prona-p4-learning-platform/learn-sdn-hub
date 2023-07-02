import { Router, Request, RequestHandler } from "express";
import Environment, {
  Submission,
  AliasedFile,
  Task,
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

const fileWithAliasValidator = celebrate({
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
    (req: Request, res) => {
      const environment = req.params.environment;
      const targetEnv = environments.get(String(environment));
      if (targetEnv === undefined) {
        return res
          .status(404)
          .json({ error: true, message: "Environment not found" });
      }
      return res.status(200).json({
        files: targetEnv.editableFiles.map((file: AliasedFile) => file.alias),
        filePaths: targetEnv.editableFiles.map(
          (file: AliasedFile) => file.absFilePath
        ),
        // first task in array of tasks will define the tab
        ttyTabs: targetEnv.tasks
          .filter((subtasks: Task[]) => subtasks[0].provideTty === true)
          .map((subtask: Task[]) => subtask[0].name),
        ttys: targetEnv.tasks
          .filter((subtasks: Task[]) =>
            subtasks.filter((task: Task) => task.provideTty === true)
          )
          .map((subtasks: Task[]) =>
            subtasks.map((subtask: Task) => subtask.name)
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
    }
  );

  router.get(
    "/:environment/assignment",
    authenticationMiddleware,
    environmentPathParamValidator,
    async (req: RequestWithUser, res) => {
      const environment = req.params.environment;
      const targetEnv = environments.get(String(environment));
      console.log("/:environment/assignment");
      if (targetEnv === undefined) {
        return res
          .status(404)
          .json({ error: true, message: "Environment not found" });
      }
      let markdown;
      // if assignmentLabSheetLocation specified as "instance", get lab sheet from instance filesystem
      if (targetEnv.assignmentLabSheetLocation === "instance") {
        const env = Environment.getActiveEnvironment(
          req.params.environment,
          req.user.username
        );
        markdown = await env.readFile(targetEnv.assignmentLabSheet, true);
      } else {
        markdown = fs
          .readFileSync(path.resolve(__dirname, targetEnv.assignmentLabSheet))
          .toString();
      }
      res.send(markdown);
    }
  );

  router.post(
    "/create",
    authenticationMiddleware,
    queryValidator,
    (req: RequestWithUser, res) => {
      const environment = req.query.environment;
      const targetEnv = environments.get(String(environment));
      if (targetEnv === undefined) {
        return res
          .status(404)
          .json({ error: true, message: "Environment not found" });
      }
      Environment.createEnvironment(
        req.user.username,
        req.user.groupNumber,
        String(environment),
        targetEnv,
        provider,
        persister
      )
        .then(() => {
          res.status(200).json();
        })
        .catch((err: Error) => {
          console.log(err);
          res.status(500).json({ status: "error", message: err.message });
        });
    }
  );

  router.post(
    "/delete",
    authenticationMiddleware,
    queryValidator,
    (req: RequestWithUser, res) => {
      const environment = req.query.environment;
      const targetEnv = environments.get(String(environment));
      if (targetEnv === undefined) {
        return res
          .status(404)
          .json({ error: true, message: "Environment not found" });
      }
      Environment.deleteEnvironment(req.user.username, String(environment))
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
          console.log("Failed to delete environment " + err);
          res.status(500).json({
            status: "error",
            message: "Failed to delete environment " + err.message,
          });
        });
    }
  );

  router.get(
    "/:environment/file/:alias",
    authenticationMiddleware,
    fileWithAliasValidator,
    (req: RequestWithUser, res) => {
      const env = Environment.getActiveEnvironment(
        req.params.environment,
        req.user.username
      );
      env
        .readFile(req.params.alias)
        .then((content: string) => {
          res
            .set("Content-Location", env.getFilePathByAlias(req.params.alias))
            .set("Access-Control-Expose-Headers", "Content-Location")
            .status(200)
            .end(content);
        })
        .catch((err) => {
          console.log(err);
          res.status(500).json({ error: true, message: err.message });
        });
    }
  );

  router.post(
    "/:environment/file/:alias",
    bodyParser.text({ type: "text/plain" }) as RequestHandler,
    authenticationMiddleware,
    fileWithAliasValidator,
    (req: RequestWithUser, res) => {
      const env = Environment.getActiveEnvironment(
        req.params.environment,
        req.user.username
      );
      env
        .writeFile(req.params.alias, req.body)
        .then(() => res.status(200).end())
        .catch((err: Error) =>
          res.status(400).json({ status: "error", message: err.message })
        );
    }
  );

  router.post(
    "/:environment/restart",
    authenticationMiddleware,
    environmentPathParamValidator,
    (req: RequestWithUser, res) => {
      const env = Environment.getActiveEnvironment(
        req.params.environment,
        req.user.username
      );
      env
        .restart()
        .then(() => {
          res
            .status(200)
            .json({ status: "finished", message: "Restart complete" });
        })
        .catch((err) =>
          res.status(500).json({ status: "error", message: err.message })
        );
    }
  );

  router.post(
    "/:environment/test",
    bodyParser.json({ type: "application/json" }) as RequestHandler,
    authenticationMiddleware,
    environmentPathParamValidator,
    (req: RequestWithUser, res) => {
      const env = Environment.getActiveEnvironment(
        req.params.environment,
        req.user.username
      );
      env
        .test(req.body.activeStep, req.body.terminalState)
        .then((testResult) => {
          res.status(200).json({
            status: "finished",
            message: testResult,
          });
        })
        .catch((err) =>
          res.status(500).json({ status: "error", message: err.message })
        );
    }
  );

  // remove body-parser as it is included in express >=4.17
  router.post(
    "/:environment/submit",
    bodyParser.json({ type: "application/json" }) as RequestHandler,
    authenticationMiddleware,
    environmentPathParamValidator,
    (req: RequestWithUser, res) => {
      const env = Environment.getActiveEnvironment(
        req.params.environment,
        req.user.username
      );
      env
        .submit(req.body.activeStep, req.body.terminalState)
        .then(() => {
          res.status(200).json({
            status: "finished",
            message:
              "Terminal content and files submitted! Assignment finished!",
          });
        })
        .catch((err) =>
          res.status(500).json({ status: "error", message: err.message })
        );
    }
  );

  router.get(
    "/deployed-user-environments",
    authenticationMiddleware,
    (req: RequestWithUser, res) => {
      const deployedEnvList = Environment.getDeployedUserEnvironmentList(
        req.user.username
      );
      return res.status(200).json(Array.from(deployedEnvList));
    }
  );

  router.get(
    "/deployed-group-environments",
    authenticationMiddleware,
    (req: RequestWithUser, res) => {
      const deployedEndpList = Environment.getDeployedGroupEnvironmentList(
        req.user.groupNumber
      );
      return res.status(200).json(Array.from(deployedEndpList));
    }
  );

  router.get(
    "/submissions",
    authenticationMiddleware,
    async (req: RequestWithUser, res) => {
      await Environment.getUserSubmissions(
        persister,
        req.user.username,
        req.user.groupNumber
      )
        .then((submittedEnvList) => {
          return res
            .status(200)
            .json(Array.from(submittedEnvList ?? ([] as Submission[])));
        })
        .catch((err) => {
          console.log("No submission found " + err);
          return res.status(200).json(Array.from([] as Submission[]));
        });
    }
  );

  router.get(
    "/:environment/provider-instance-status",
    authenticationMiddleware,
    environmentPathParamValidator,
    (req: RequestWithUser, res) => {
      const env = Environment.getActiveEnvironment(
        req.params.environment,
        req.user.username
      );
      env
        .getProviderInstanceStatus()
        .then((value) => {
          return res.status(200).json({ status: value });
        })
        .catch(() => {
          return res.status(200).json({ status: "" });
        });
    }
  );

  return router;
};
