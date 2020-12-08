import api from "./Api";
import express from "express";
import MongoDBPersister from "./database/MongoDBPersister";
import MongoDBAuthenticationProvider from "./authentication/MongoDBAuthenticationProvider";
import OpenStackProvider from './providers/OpenStackProvider'

const app = express();
const persister = new MongoDBPersister(process.env.MONGODB_URL);
app.use(api(persister,[new MongoDBAuthenticationProvider(persister)], new OpenStackProvider()));

export default app;
