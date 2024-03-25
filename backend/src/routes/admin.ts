import { RequestHandler, Router } from "express";
import authenticationMiddleware, {
  RequestWithUser,
} from "../authentication/AuthenticationMiddleware";
import adminRoleMiddleware from "../admin/AdminRoleMiddleware";
import { Persister } from "../database/Persister";
import bodyParser from "body-parser";
import environments from "../Configuration";

export default (persister: Persister): Router => {
  const router = Router();

  router.get(
    "/users",
    authenticationMiddleware,
    adminRoleMiddleware,
    async (req: RequestWithUser, res) => {
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
    async (req: RequestWithUser, res) => {
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
    async (req: RequestWithUser, res) => {
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
    async (req: RequestWithUser, res) => {
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

  return router;
};
