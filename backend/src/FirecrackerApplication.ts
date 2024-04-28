import api from "./Api";
import serverCreator from "./Server";
import MongoDBPersister from "./database/MongoDBPersister";
import MongoDBAuthenticationProvider from "./authentication/MongoDBAuthenticationProvider";
import FirecrackerProvider from "./providers/FirecrackerProvider";

const persister = new MongoDBPersister(process.env.MONGODB_URL);
console.log("Attempting to start Firecracker Application.");
serverCreator(
  api(
    persister,
    [new MongoDBAuthenticationProvider(persister)],
    new FirecrackerProvider()
  )
);
console.log("Attempting to add missing assignments to persister");
try {
  persister.CreateAssignments();
} catch (err) {
  console.error(err);
}
