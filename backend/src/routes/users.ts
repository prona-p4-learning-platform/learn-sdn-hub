import { RequestHandler, Router } from "express";
import authenticationMiddleware, {
  RequestWithUser,
} from "../authentication/AuthenticationMiddleware";
import adminRoleMiddleware from "../admin/AdminRoleMiddleware";
import { Persister } from "../database/Persister";
import bodyParser from "body-parser";

export default (persister: Persister): Router => {
  const router = Router();

  router.get(
    "/",
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

  router.post(
    "/course/:courseId/update",
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

  return router;
};
