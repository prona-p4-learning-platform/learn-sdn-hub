import api from "./Api"
import { startServer } from "./Server"
import MongoDBPersister from "./database/MongoDBPersister"
import MongoDBAuthenticationProvider from "./authentication/MongoDBAuthenticationProvider"
import K8sProvider from "./providers/K8sProvider"

const MONGODB_URL = process.env.MONGODB_URL

if (MONGODB_URL) {
  const persister = new MongoDBPersister(MONGODB_URL)

  console.log("Attempting to start Kubernetes Application.")

  const apiRouter = api(
    persister,
    [new MongoDBAuthenticationProvider(persister)],
    new K8sProvider(),
  );

  startServer(apiRouter);

  if (process.env.BACKEND_ASSIGNMENT_TYPE === "mongodb") {
    console.log("Attempting to add missing assignments to persister.")
    try {
      persister
        .CreateAssignments()
        .then(async () => {
          console.log("Attempting to load environments from persister.")
          await persister.LoadEnvironments()
        })
        .catch((error) => {
          console.error("Error creating assignments:", error)
        })
    } catch (err) {
      console.error(err)
    }
  }
} else {
  console.log("MongoDB URL not set. Aborting...")
  process.exit(1)
}
