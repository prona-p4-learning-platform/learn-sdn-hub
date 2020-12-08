import api from "./Api";
import express from "express";
import MemoryPersister from "./database/MemoryPersister";
import PlaintextAuthenticationProvider from "./authentication/PlaintextAuthenticationProvider";
import LocalVMProvider from './providers/LocalVMProvider'

const app = express();
const persister = new MemoryPersister();
app.use(api(persister, [new PlaintextAuthenticationProvider()], new LocalVMProvider()));

export default app;
