import { RequestHandler, Router } from "express";
import authenticationMiddleware, {
  RequestWithUser,
} from "../authentication/AuthenticationMiddleware";
import adminRoleMiddleware from "../admin/AdminRoleMiddleware";
import { FileData, Persister } from "../database/Persister";
import bodyParser from "body-parser";
import environments from "../Configuration";
import {
  SubmissionAdminOverviewEntry,
  TerminalStateType,
} from "../Environment";

export default (persister: Persister): Router => {
  const router = Router();

  router.get(
    "/users",
    authenticationMiddleware,
    adminRoleMiddleware,
    async (_, res) => {
      try {
        const userData = await persister.GetAllUsers();
        return res.status(200).json(userData);
      } catch (err) {
        return res.status(500).json({ error: true, message: err.message });
      }
    }
  );

  router.get(
    "/assignments",
    authenticationMiddleware,
    adminRoleMiddleware,
    async (_, res) => {
      try {
        const assignments = await persister.GetAllAssignments();
        return res
          .status(200)
          .json(
            assignments.length > 0
              ? assignments
              : Array.from(new Map(environments).keys())
          );
      } catch (err) {
        return res.status(500).json({ error: true, message: err.message });
      }
    }
  );

  router.post(
    "/assignments/create",
    authenticationMiddleware,
    adminRoleMiddleware,
    async (_, res) => {
      try {
        const response = await persister.CreateAssignments();

        return res.status(200).json(response);
      } catch (err) {
        if (err.message === "Method not implemented.") {
          return res.status(501).json({
            error: true,
            message: "Function not yet supported for this configuration.",
          });
        } else {
          return res.status(500).json({
            error: true,
            message: err.message,
          });
        }
      }
    }
  );

  router.get(
    "/courses",
    authenticationMiddleware,
    adminRoleMiddleware,
    async (_, res) => {
      try {
        const userData = await persister.GetAllCourses();
        return res.status(200).json(userData);
      } catch (err) {
        return res.status(500).json({ error: true, message: err.message });
      }
    }
  );

  router.post(
    "/course/create",
    authenticationMiddleware,
    adminRoleMiddleware,
    bodyParser.json() as RequestHandler,
    async (req: RequestWithUser, res) => {
      if (
        req.body === undefined ||
        req.body.name === undefined ||
        req.body.name.trim() === ""
      ) {
        return res.status(400).json({
          error: true,
          message: "Invalid request. Missing course name.",
        });
      }
      const response = await persister.AddCourse(req.body.name);
      return res
        .status(response.code ?? (response.error ? 500 : 200))
        .json(response);
    }
  );

  router.post(
    "/course/:courseId/users/update",
    authenticationMiddleware,
    adminRoleMiddleware,
    bodyParser.json() as RequestHandler,
    async (req: RequestWithUser, res) => {
      const response = await persister.UpdateCourseForUsers(
        req.body,
        req.params.courseId
      );
      if (!response.error) {
        return res.status(200).json(response);
      } else {
        return res.status(500).json(response);
      }
    }
  );

  router.post(
    "/course/:courseId/assignments/update",
    authenticationMiddleware,
    adminRoleMiddleware,
    bodyParser.json() as RequestHandler,
    async (req: RequestWithUser, res) => {
      try {
        const response = await persister.UpdateAssignementsForCourse(
          req.params.courseId,
          req.body
        );
        return res.status(200).json(response);
      } catch (err) {
        return res.status(500).json({ error: true, message: err.message });
      }
    }
  );

  router.get(
    "/submissions",
    authenticationMiddleware,
    adminRoleMiddleware,
    async (_, res) => {
      await persister
        .GetAllSubmissions()
        .then((submissions) => {
          return res
            .status(200)
            .json(
              Array.from(submissions ?? ([] as SubmissionAdminOverviewEntry[]))
            );
        })
        .catch((err) => {
          console.log("No submission found " + err);
          return res
            .status(200)
            .json(Array.from([] as SubmissionAdminOverviewEntry[]));
        });
    }
  );

  router.get(
    "/submission/:submissionID/file/download/:fileName",
    authenticationMiddleware,
    adminRoleMiddleware,
    async (req: RequestWithUser, res) => {
      await persister
        .GetSubmissionFile(req.params.submissionID, req.params.fileName)
        .then((file: FileData) => {
          res
            .set("Content-disposition", `attachment; filename=${file.fileName}`)
            .set("Content-type", "application/octet-stream")
            .status(200)
            .send(file.content);
        })
        .catch((err) => {
          res.status(500).json({ error: true, message: err.message });
        });
    }
  );

  router.get(
    "/submission/:submissionID/terminals",
    authenticationMiddleware,
    adminRoleMiddleware,
    async (req: RequestWithUser, res) => {
      await persister
        .GetTerminalData(req.params.submissionID)
        .then((data: TerminalStateType[]) => {
          res.status(200).json(data);
        })
        .catch((err) => {
          res.status(500).json({ error: true, message: err.message });
        });
    }
  );

  return router;
};