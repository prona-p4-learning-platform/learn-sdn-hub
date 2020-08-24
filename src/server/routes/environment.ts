import { Router } from "express";
import P4Environment from "../P4Environment";
import bodyParser from "body-parser";
import environments from "../Configuration";
import OpenStackProvider from "../OpenStackProvider";
import { Persister } from "../database/Persister";

export default (persister: Persister): Router => {
  const router = Router();
  const provider = new OpenStackProvider();

  router.get("/:environment/configuration", (req, res) => {
    const environment = req.params.environment;
    const targetEnv = environments.get(String(environment));
    if (targetEnv === undefined) {
      return res
        .status(404)
        .json({ error: true, message: "Environment not found" });
    }
    return res.status(200).json({
      files: targetEnv.editableFiles.map((file) => file.alias),
      ttys: targetEnv.tasks
        .filter((task) => task.provideTty === true)
        .map((task) => task.name),
    });
  });

  router.post("/create", (req, res) => {
    const environment = req.query.environment;
    const targetEnv = environments.get(String(environment));
    if (targetEnv === undefined) {
      return res
        .status(404)
        .json({ error: true, message: "Environment not found" });
    }
    P4Environment.createEnvironment(
      "testuser",
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
        res.status(200).json({ status: "error", message: err.message });
      });
  });

  router.get("/:environment/file/:alias", (req, res) => {
    const env = P4Environment.getActiveEnvironment(req.params.environment);
    env
      .readFile(req.params.alias)
      .then((content: string) => {
        res.status(200).end(content);
      })
      .catch((err) => {
        console.log(err);
        res.status(500).json({ error: true, message: err.message });
      });
  });

  router.post(
    "/:environment/file/:alias",
    bodyParser.text({ type: "text/plain" }),
    (req, res) => {
      const env = P4Environment.getActiveEnvironment(req.params.environment);
      console.log("body:", req.body);
      env
        .writeFile(req.params.alias, req.body)
        .catch((err: Error) =>
          res.status(400).json({ status: "error", message: err.message })
        );
    }
  );

  router.post("/:environment/restart", (req, res) => {
    const env = P4Environment.getActiveEnvironment(req.params.environment);
    env
      .restart()
      .then(() => {
        res
          .status(200)
          .json({ status: "finished", message: "Restart complete" });
      })
      .catch((err) =>
        res.status(400).json({ status: "error", message: err.message })
      );
  });

  return router;
};
