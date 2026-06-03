import api from "./Api";
import { startServer } from "./Server";
import MongoDBPersister from "./database/MongoDBPersister";
import MongoDBAuthenticationProvider from "./authentication/MongoDBAuthenticationProvider";
import DockerProvider from "./providers/DockerProvider";

const MONGODB_URL = process.env.MONGODB_URL;

async function bootstrap() {
  if (!MONGODB_URL) {
    console.log("MongoDB URL not set. Aborting...");
    process.exit(1);
  }

  const persister = new MongoDBPersister(MONGODB_URL);

  await persister.AddDefaultUser();
  console.log("Attempting to start Docker Application.");

  const apiRouter = api(
    persister,
    [new MongoDBAuthenticationProvider(persister)],
    new DockerProvider(),
  );
  
  startServer(apiRouter);

  if (process.env.BACKEND_ASSIGNMENT_TYPE === "mongodb") {
    console.log("Attempting to add missing assignments to persister.");
    try {
      await persister.CreateAssignments();

      console.log("Attempting to load environments from persister.");
      await persister.LoadEnvironments();
    } catch (error) {
      console.error("Error creating assignments or loading environments:", error);
    }
  }
}

bootstrap().catch((err) => {
  console.error("Critical error during startup:", err);
  process.exit(1);
});