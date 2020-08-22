import api from "./Api";
import express from "express";
import MongoDBPersister from "./database/MongoDBPersister";
import MongoDBAuthenticationProvider from "./authentication/MongoDBAuthenticationProvider";

const app = express();
const persister = new MongoDBPersister(process.env.MONGO_URL);
app.use(api(persister, [new MongoDBAuthenticationProvider(persister)]));

export default app;
