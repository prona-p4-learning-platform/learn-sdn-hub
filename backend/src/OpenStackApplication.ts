import api from "./Api";
import serverCreator from "./Server";
import MongoDBPersister from "./database/MongoDBPersister";
import MongoDBAuthenticationProvider from "./authentication/MongoDBAuthenticationProvider";
import OpenStackProvider from "./providers/OpenStackProvider";

const persister = new MongoDBPersister(process.env.MONGODB_URL);
console.log("Attempting to start OpenStack Application.");
serverCreator(
  api(
    persister,
    [new MongoDBAuthenticationProvider(persister)],
    new OpenStackProvider()
  )
);
