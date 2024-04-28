import api from "./Api";
import serverCreator from "./Server";
import MongoDBPersister from "./database/MongoDBPersister";
import MongoDBAuthenticationProvider from "./authentication/MongoDBAuthenticationProvider";
import DockerProvider from "./providers/DockerProvider";

const persister = new MongoDBPersister(process.env.MONGODB_URL);
console.log("Attempting to start Docker Application.");
serverCreator(
  api(
    persister,
    [new MongoDBAuthenticationProvider(persister)],
    new DockerProvider()
  )
);
console.log("Attempting to add missing assignments to persister");
try {
  persister.CreateAssignments();
} catch (err) {
  console.error(err);
}
