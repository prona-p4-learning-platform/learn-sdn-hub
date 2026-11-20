import type { EnvironmentDescription } from "../../Environment";

//sudo clab inspect &>/dev/null; if [ $? -eq 1 ]; then sudo clab deploy &>/dev/null; fi; docker exec -it clab-kommprot-lab-transport-host1 bash;
export const name = "KommProt-Uebung1b";
export const environment: EnvironmentDescription = {
  type: "normal",
  terminals: [
    [
      {
        type: "Shell",
        name: "host1",
        cwd: "/home/p4/kommprot-labs/kommprot-lab-application-layer/exercise-topology",
        executable: "while [ true ]; do clear && sudo clab inspect &>/dev/null; if [ $? -eq 1 ]; then sudo clab deploy &>/dev/null; fi; docker exec -it clab-kommprot-lab-application-host1 ash; done",
        params: [],
        provideTty: true,
      },
    ],
    [
      {
        type: "Shell",
        name: "host2",
        cwd: "/home/p4/kommprot-labs/kommprot-lab-application-layer/exercise-topology",
        executable: "while [ true ]; do clear && sudo clab inspect &>/dev/null; if [ $? -eq 1 ]; then sudo clab deploy &>/dev/null; fi; docker exec -it clab-kommprot-lab-application-host2 bash; done",
        params: [],
        provideTty: true,
      },
    ],
    [
      {
        type: "Shell",
        name: "server1",
        cwd: "/home/p4/kommprot-labs/kommprot-lab-application-layer/exercise-topology",
        executable: "while [ true ]; do clear && sudo clab inspect &>/dev/null; if [ $? -eq 1 ]; then sudo clab deploy &>/dev/null; fi; docker exec -it clab-kommprot-lab-application-server1 bash; done",
        params: [],
        provideTty: true,
      },
    ],
    [
      {
        type: "Shell",
        name: "switch1",
        cwd: "/home/p4/kommprot-labs/kommprot-lab-application-layer/exercise-topology",
        executable: "while [ true ]; do clear && sudo clab inspect &>/dev/null; if [ $? -eq 1 ]; then sudo clab deploy &>/dev/null; fi; docker exec -it clab-kommprot-lab-application-switch1 ash; done",
        params: [],
        provideTty: true,
      },
    ],
  ],
  editableFiles: [
    {
      absFilePath:
        "/home/p4/kommprot-labs/kommprot-lab-application-layer/README.md",
      alias: "README",
    },
    {
      absFilePath:
        "/home/p4/kommprot-labs/kommprot-lab-application-layer/exercise-topology/server1/dnsmasq.conf",
      alias: "dnsmasq.conf",
    },
    {
      absFilePath:
        "/home/p4/kommprot-labs/kommprot-lab-application-layer/exercise-topology/kommprot-lab-application.clab.yml",
      alias: "kommprot-lab-application.clab.yml",
    },
  ],
  stopCommands: [
    {
      type: "Shell",
      name: "bash",
      cwd: "/home/p4/kommprot-labs/kommprot-lab-application-layer/exercise-topology",
      executable: "sudo clab destroy",
      params: [],
      provideTty: false,
    },
    {
      type: "Shell",
      name: "bash2",
      cwd: "/home/p4/kommprot-labs/kommprot-lab-application-layer/exercise-topology",
      executable: "",
      params: [],
      provideTty: false,
    },
  ],
  description: "KommProt-Ue1b application layer",
  assignmentLabSheetLocation: "instance",
  assignmentLabSheet: "/home/p4/kommprot-labs/kommprot-lab-application-layer/README.md",
};
