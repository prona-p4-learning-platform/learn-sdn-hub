import api from "./Api"
import { startServer } from "./Server"
import MongoDBPersister from "./database/MongoDBPersister"
import MongoDBAuthenticationProvider from "./authentication/MongoDBAuthenticationProvider"
import K8sProvider from "./providers/K8sProvider"

var MONGODB_URL = process.env.MONGODB_URL
const MONGODB_HOST = process.env.MONGODB_HOST
const MONGODB_PORT = process.env.MONGODB_PORT
const MONGODB_USERNAME = process.env.MONGODB_USERNAME
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD
const MONGODB_DB = process.env.MONGODB_DB
const MONGODB_REPLICA_SET = process.env.MONGODB_REPLICA_SET
const MONGODB_DIRECT_CONNECION = process.env.MONGODB_DIRECT_CONNECION


async function startApplication() {
  if (!MONGODB_URL) {
    if(!MONGODB_HOST) {
      console.log("MONGODB_HOST not set. Aborting...")
      process.exit(1)
    }
    if(!MONGODB_PORT) {
      console.log("MONGODB_PORT not set. Aborting...")
      process.exit(1)
    }
    if(!MONGODB_USERNAME) {
      console.log("MONGODB_USERNAME not set. Aborting...")
      process.exit(1)
    }
    if(!MONGODB_PASSWORD) {
      console.log("MONGODB_PASSWORD not set. Aborting...")
      process.exit(1)
    }
    if(!MONGODB_DB) {
      console.log("MONGODB_DB not set. Aborting...")
      process.exit(1)
    }
    if(!MONGODB_REPLICA_SET) {
      console.log("MONGODB_REPLICA_SET not set. Aborting...")
      process.exit(1)
    }
    MONGODB_URL = `mongodb://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DB}?authSource=${MONGODB_USERNAME}${MONGODB_DIRECT_CONNECION ? "&directConnection=true": `replicaSet=${MONGODB_REPLICA_SET}`}`
  }

  const persister = new MongoDBPersister(MONGODB_URL)

  console.log("Attempting to start Kubernetes Application.")

  // check for default user
  await persister.AddDefaultUser()

  if (process.env.BACKEND_ASSIGNMENT_TYPE === "mongodb") {
    console.log("Attempting to add missing assignments to persister.")
    try {
      await persister.CreateAssignments()
      console.log("Attempting to load environments from persister.")
      await persister.LoadEnvironments()
    } catch (error) {
      console.error("Error initializing assignments:", error)
    }
  }

  const apiRouter = api(
    persister,
    [new MongoDBAuthenticationProvider(persister)],
    new K8sProvider(),
  )

  startServer(apiRouter)
}

startApplication().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});