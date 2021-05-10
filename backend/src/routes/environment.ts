import { Router, Request } from "express";
import P4Environment from "../P4Environment";
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
        files: targetEnv.editableFiles.map((file) => file.alias),
        // first task in array of tasks will define the tab
        ttyTabs: targetEnv.tasks
          .filter((subtasks) => subtasks[0].provideTty === true)
          .map((subtask) => subtask[0].name),
        ttys: targetEnv.tasks
          .filter((subtasks) =>
            subtasks.filter((task) => task.provideTty === true)
          )
          .map((subtasks) => subtasks.map((subtask) => subtask.name)),
        stepNames: targetEnv.steps?.map((step) => step.name) ?? [],
        stepLabels: targetEnv.steps?.map((step) => step.label) ?? [],
      });
    }
  );

  router.get(
    "/:environment/assignment",
    environmentPathParamValidator,
    (req, res) => {
      const environment = req.params.environment;
      const targetEnv = environments.get(String(environment));
      console.log("/:environment/assignment");
      if (targetEnv === undefined) {
        return res
          .status(404)
          .json({ error: true, message: "Environment not found" });
      }
      const markdown = fs
        .readFileSync(path.resolve(__dirname, targetEnv.assignmentLabSheet))
        .toString();

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
      P4Environment.createEnvironment(
        req.user.username,
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
      P4Environment.deleteEnvironment(req.user.username, String(environment))
        .then(() => {
          res.status(200).json();
        })
        .catch((err: Error) => {
          console.log(err);
          res.status(500).json({ status: "error", message: err.message });
        });
    }
  );

  router.get(
    "/:environment/file/:alias",
    authenticationMiddleware,
    fileWithAliasValidator,
    (req: RequestWithUser, res) => {
      const env = P4Environment.getActiveEnvironment(
        req.params.environment,
        req.user.id
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
    bodyParser.text({ type: "text/plain" }),
    authenticationMiddleware,
    fileWithAliasValidator,
    (req: RequestWithUser, res) => {
      const env = P4Environment.getActiveEnvironment(
        req.params.environment,
        req.user.id
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
      const env = P4Environment.getActiveEnvironment(
        req.params.environment,
        req.user.id
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
    bodyParser.json({ type: "application/json" }),
    authenticationMiddleware,
    environmentPathParamValidator,
    (req: RequestWithUser, res) => {
      const env = P4Environment.getActiveEnvironment(
        req.params.environment,
        req.user.id
      );
      env
        .test(req.body.activeStep, req.body.terminalState)
        .then(() => {
          res
            .status(200)
            .json({ status: "finished", message: "Test successfull" });
        })
        .catch((err) =>
          res.status(500).json({ status: "error", message: err })
        );
    }
  );

  router.get(
    "/active",
    authenticationMiddleware,
    (req: RequestWithUser, res) => {
      const activeEnvList = P4Environment.getActiveEnvironmentList(req.user.id);
      return res.status(200).json(Array.from(activeEnvList));
    }
  );

  return router;
};
