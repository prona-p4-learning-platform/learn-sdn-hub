import api from "./Api";
import serverCreator from "./Server";
import MemoryPersister from "./database/MemoryPersister";
import PlaintextAuthenticationProvider from "./authentication/PlaintextAuthenticationProvider";
import LocalVMProvider from "./providers/LocalVMProvider";

console.log(
  "Attempting to start Local VM Application for development purposes.",
);
const persister = new MemoryPersister();
serverCreator(
  api(
    persister,
    [new PlaintextAuthenticationProvider()],
    new LocalVMProvider(),
  ),
);
