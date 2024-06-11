import { Router } from "express";
import environmentRoutes from "./routes/environment";
import userRoutes from "./routes/user";
import { AuthenticationProvider } from "./authentication/AuthenticationProvider";
import { Persister } from "./database/Persister";
import { InstanceProvider } from "./providers/Provider";

export default (
  persister: Persister,
  authenticationProviders: AuthenticationProvider[],
  provider: InstanceProvider,
): Router => {
  const router = Router();

  router.use("/api/environment", environmentRoutes(persister, provider));
  router.use("/api/user", userRoutes(authenticationProviders));
  router.use("/api*", (_req, res) => {
    res.status(404).json({ error: "not_found" });
  });

  console.log("API setup finished");

  return router;
};
