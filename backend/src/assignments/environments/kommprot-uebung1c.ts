import type { EnvironmentDescription } from "../../Environment";

export const name = "KommProt-Uebung1c";
export const environment: EnvironmentDescription = {
  type: "normal",
  terminals: [
    [
      {
        type: "Shell",
        name: "host1",
        cwd: "/home/p4/kommprot-labs/kommprot-lab-transport-layer",
        executable: "while [ true ]; do clear && sudo clab inspect &>/dev/null; if [ $? -eq 1 ]; then sudo clab deploy &>/dev/null; fi; docker exec -it clab-kommprot-lab-transport-host1 bash; done",
        params: [],
        provideTty: true,
      },
    ],
    [
      {
        type: "Shell",
        name: "host2",
        cwd: "/home/p4/kommprot-labs/kommprot-lab-transport-layer",
        executable: "while [ true ]; do clear && sudo clab inspect &>/dev/null; if [ $? -eq 1 ]; then sudo clab deploy &>/dev/null; fi; docker exec -it clab-kommprot-lab-transport-host2 bash; done",
        params: [],
        provideTty: true,
      },
    ],
  ],
  editableFiles: [
    {
      absFilePath:
        "/home/p4/kommprot-labs/kommprot-lab-transport-layer/lab-notes.md",
      alias: "lab-notes",
    },
    {
      absFilePath:
        "/home/p4/kommprot-labs/kommprot-lab-application-layer/README.md",
      alias: "README",
    },
  ],
  stopCommands: [
    {
      type: "Shell",
      name: "bash",
      cwd: "/home/p4/kommprot-labs/kommprot-lab-transport-layer",
      executable: "sudo clab destroy",
      params: [],
      provideTty: false,
    },
    {
      type: "Shell",
      name: "bash2",
      cwd: "/home/p4/kommprot-labs/kommprot-lab-transport-layer",
      executable: "",
      params: [],
      provideTty: false,
    },
  ],
  description: "KommProt-Ue1c transport layer",
  assignmentLabSheetLocation: "instance",
  assignmentLabSheet: "/home/p4/kommprot-labs/kommprot-lab-transport-layer/lab-notes.md",
};
