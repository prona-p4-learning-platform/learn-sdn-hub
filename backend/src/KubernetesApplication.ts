import api from "./Apik8s";
import serverCreator from "./Server";
import MongoDBPersister from "./database/MongoDBPersister";
import MongoDBAuthenticationProvider from "./authentication/MongoDBAuthenticationProvider";
import {K8sClient}from "./providers/k8s-client";

const MONGODB_URL = process.env.MONGODB_URL;

if (MONGODB_URL) {
    const persister = new MongoDBPersister(MONGODB_URL);

    console.log("Attempting to start Kubernetes Application.");

    serverCreator(
    api(
        persister,
        [new MongoDBAuthenticationProvider(persister)],
        new K8sClient(),
    ),
    );

    if (process.env.BACKEND_ASSIGNMENT_TYPE === "mongodb") {
    console.log("Attempting to add missing assignments to persister.");

    persister
        .CreateAssignments()
        .then(async () => {
        console.log("Attempting to load environments from persister.");
        await persister.LoadEnvironments();
        })
        .catch((error) => {
        console.error("Error creating assignments:", error);
        });
    }
}
else  {
    console.log("MongoDB URL not set. Aborting...");
    process.exit(1);
}
