import api from "./Api";
import serverCreator from "./Server";
import MongoDBPersister from "./database/MongoDBPersister";
import MongoDBAuthenticationProvider from "./authentication/MongoDBAuthenticationProvider";
import OpenStackProvider from "./providers/OpenStackProvider";

const MONGODB_URL = process.env.MONGODB_URL;

if (MONGODB_URL) {
  const persister = new MongoDBPersister(MONGODB_URL);

  console.log("Attempting to start OpenStack Application.");

  serverCreator(
    api(
      persister,
      [new MongoDBAuthenticationProvider(persister)],
      new OpenStackProvider(),
    ),
  );
} else {
  console.log("MongoDB URL not set. Aborting...");
  process.exit(1);
}
