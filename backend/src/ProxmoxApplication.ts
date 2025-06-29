import api from "./Api";
import serverCreator from "./Server";
import MongoDBPersister from "./database/MongoDBPersister";
import MongoDBAuthenticationProvider from "./authentication/MongoDBAuthenticationProvider";
import ProxmoxProvider from "./providers/ProxmoxProvider";

const MONGODB_URL = process.env.MONGODB_URL;

if (MONGODB_URL) {
  const persister = new MongoDBPersister(MONGODB_URL);
  const provider = new ProxmoxProvider();

  console.log("Attempting to start Proxmox Application.");

  serverCreator(
    api(
      persister,
      [new MongoDBAuthenticationProvider(persister)],
      provider,
    ),
    persister,
    provider,
  );
} else {
  console.log("MongoDB URL not set. Aborting...");
  process.exit(1);
}
