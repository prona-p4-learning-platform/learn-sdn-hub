import { Router } from "express";
import compileRoutes from "./routes/compile";
import environmentRoutes from "./routes/environment";
import userRoutes from "./routes/user";
import { AuthenticationProvider } from "./authentication/AuthenticationProvider";
import { Persister } from "./database/Persister";
import { InstanceProvider } from "./providers/Provider";

export default (
  persister: Persister,
  authenticationProviders: AuthenticationProvider[],
  provider: InstanceProvider
): Router => {
  const router = Router();
  router.use("/api/compile", compileRoutes);
  router.use("/api/environment", environmentRoutes(persister, provider));
  router.use("/api/user", userRoutes(authenticationProviders));
  return router;
};
