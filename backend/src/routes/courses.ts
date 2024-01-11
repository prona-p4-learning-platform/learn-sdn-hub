import { Router } from "express";
import authenticationMiddleware, {
  RequestWithUser,
} from "../authentication/AuthenticationMiddleware";
import adminRoleMiddleware from "../admin/AdminRoleMiddleware";
import { Persister } from "../database/Persister";

export default (persister: Persister): Router => {
  const router = Router();

  router.get(
    "/",
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
  return router;
};
