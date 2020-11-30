import api from "./Api";
import express from "express";
import MemoryPersister from "./database/MemoryPersister";
import PlaintextAuthenticationProvider from "./authentication/PlaintextAuthenticationProvider";

const app = express();
const persister = new MemoryPersister();
app.use(api(persister, [new PlaintextAuthenticationProvider()]));

export default app;
