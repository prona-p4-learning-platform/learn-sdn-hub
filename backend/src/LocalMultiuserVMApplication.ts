import api from "./Api";
import serverCreator from "./Server";
import MemoryPersister from "./database/MemoryPersister";
import PlaintextMultiuserAuthenticationProvider from "./authentication/PlaintextMultiuserAuthenticationProvider";
import LocalMultiuserVMProvider from "./providers/LocalMultiuserVMProvider";

console.log(
  "Attempting to start Local Multiuser VM Application using static user to host mapping.",
);
const persister = new MemoryPersister();
const provider = new LocalMultiuserVMProvider();
serverCreator(
  api(
    persister,
    [new PlaintextMultiuserAuthenticationProvider(persister)],
    provider,
  ),
  persister,
  provider,
);
