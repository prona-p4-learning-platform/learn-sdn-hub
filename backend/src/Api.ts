import { Router } from "express";
import environmentRoutes from "./routes/environment";
import userRoutes from "./routes/user";
import allUsersRoutes from "./routes/users";
import allCoursesRoutes from "./routes/courses";
import { AuthenticationProvider } from "./authentication/AuthenticationProvider";
import { Persister } from "./database/Persister";
import { InstanceProvider } from "./providers/Provider";

export default (
  persister: Persister,
  authenticationProviders: AuthenticationProvider[],
  provider: InstanceProvider
): Router => {
  const router = Router();
  router.use("/api/environment", environmentRoutes(persister, provider));
  router.use("/api/courses", allCoursesRoutes(persister));
  router.use("/api/users", allUsersRoutes(persister));
  router.use("/api/user", userRoutes(authenticationProviders));
  router.use("/api*", (req, res) => {
    res.status(404).json({ error: "not_found" });
  });
  console.log("API setup finished");
  return router;
};
