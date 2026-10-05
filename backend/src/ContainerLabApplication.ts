import api from "./Api";
import { startServer } from "./Server";
import MongoDBPersister from "./database/MongoDBPersister";
import MongoDBAuthenticationProvider from "./authentication/MongoDBAuthenticationProvider";
import ContainerLabProvider from "./providers/ContainerlabProvider";

const MONGODB_URL = process.env.MONGODB_URL;

if (MONGODB_URL) {
  const persister = new MongoDBPersister(MONGODB_URL);

  console.log("Attempting to start ContainerLab Application.");

  const apiRouter = api(
    persister,
    [new MongoDBAuthenticationProvider(persister)],
    new ContainerLabProvider(),
  );

  startServer(apiRouter);
} else {
  console.log("MongoDB URL not set. Aborting...");
  process.exit(1);
}
