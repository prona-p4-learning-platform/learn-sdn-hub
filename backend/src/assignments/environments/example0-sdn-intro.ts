import type { EnvironmentDescription } from "../../Environment";

export const name = "Example0-SDN-Intro";
export const environment: EnvironmentDescription = {
  type: "normal",
  terminals: [
    [
      {
        type: "Shell",
        name: "mininet_data-plane",
        cwd: "/home/p4/p4-boilerplate/Example0-SDN-Intro/",
        executable: "./start-terminal1.sh",
        params: [],
        provideTty: true,
      },
    ],
    [
      {
        type: "Shell",
        name: "SDN-controller_control-plane",
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
  description: "Example0-SDN-Intro description",
  providerProxmoxTemplateTag: "learn-sdn-hub-template-acn-p4",
  assignmentLabSheet: "../assignments/prona-sdn-intro-german.md",
  rootPath: "/home/p4/",
  workspaceFolders: ["/home/p4/p4-boilerplate/Example0-SDN-Intro/"],
  useCollaboration: true,
  useLanguageClient: true,
};
