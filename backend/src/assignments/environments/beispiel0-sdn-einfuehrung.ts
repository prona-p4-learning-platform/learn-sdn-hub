import type { EnvironmentDescription } from "../../Environment";

export const name = "Beispiel0-SDN-Einfuehrung";
export const environment: EnvironmentDescription = {
  type: "normal",
  terminals: [
    [
      {
        type: "Shell",
        name: "bash",
        cwd: "/home/p4/p4-boilerplate/Example0-SDN-Intro/",
        executable: "./start-terminal1.sh",
        params: [],
        provideTty: true,
      },
    ],
    [
      {
        type: "Shell",
        name: "bash2",
        cwd: "/home/p4/p4-boilerplate/Example0-SDN-Intro/",
        executable: "./start-terminal2.sh",
        params: [],
        provideTty: true,
      },
    ],
  ],
  editableFiles: [
    {
      absFilePath: "/home/p4/p4-boilerplate/Example0-SDN-Intro/OpenFlowTopo.py",
      alias: "OpenFlowTopo.py",
    },
    {
      absFilePath: "/home/p4/p4-boilerplate/Example0-SDN-Intro/OpenFlowApp.py",
      alias: "OpenFlowApp.py",
    },
  ],
  stopCommands: [
    {
      type: "Shell",
      name: "bash",
      cwd: "/home/p4/p4-boilerplate/Example0-SDN-Intro/",
      executable: "./stop-terminal1.sh",
      params: [],
      provideTty: false,
    },
    {
      type: "Shell",
      name: "bash2",
      cwd: "/home/p4/p4-boilerplate/Example0-SDN-Intro/",
      executable: "./stop-terminal2.sh",
      params: [],
      provideTty: false,
    },
  ],
  description: "Beispiel0-SDN-Einfuehrung beschreibung",
  assignmentLabSheet: "../assignments/prona-sdn-intro-german.md",
  rootPath: "/home/p4/",
  workspaceFolders: ["/home/p4/p4-boilerplate/Example0-SDN-Intro/"],
  useCollaboration: true,
  useLanguageClient: true,
};
