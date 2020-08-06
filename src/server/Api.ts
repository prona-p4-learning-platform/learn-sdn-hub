import { Router } from "express";
import compileRoutes from "./routes/compile";
import environmentRoutes from "./routes/environment";
import userRoutes from "./routes/user";
import MongoDBPersister from "./database/MongoDBPersister";
const persister = new MongoDBPersister(process.env.MONGODB_URL);

const router = Router();
router.use("/api/compile", compileRoutes);
router.use("/api/environment", environmentRoutes(persister));
router.use("/api/user", userRoutes(persister));
export default router;
