import type { EnvironmentDescription } from "../../Environment";

export const name = "Example5-IPv4Routing";
export const environment: EnvironmentDescription = {
  type: "normal",
  terminals: [
    [
      {
        type: "Shell",
        name: "bash",
        cwd: "/home/p4/p4-boilerplate/Example5-IPv4Routing/",
        executable: "ls -l",
        params: [],
        provideTty: true,
      },
    ],
    [
      {
        type: "Shell",
        name: "bash2",
        cwd: "/home/p4/p4-boilerplate/Example5-IPv4Routing/",
        executable: "ls -l",
        params: [],
        provideTty: true,
      },
    ],
  ],
  editableFiles: [
    {
      absFilePath:
        "/home/p4/p4-boilerplate/Example5-IPv4Routing/p4src/ipv4_routing.p4",
      alias: "ipv4_routing.p4",
    },
    {
      absFilePath:
        "/home/p4/p4-boilerplate/Example5-IPv4Routing/network.py",
      alias: "network.py",
    },
    {
      absFilePath: "/home/p4/p4-boilerplate/Example5-IPv4Routing/commands-s1.txt",
      alias: "commands-s1.txt",
    },
    {
      absFilePath: "/home/p4/p4-boilerplate/Example5-IPv4Routing/commands-s2.txt",
      alias: "commands-s2.txt",
    },
  ],
  stopCommands: [
    {
      type: "Shell",
      name: "bash",
      cwd: "/home/p4/p4-boilerplate/Example5-IPv4Routing/",
      executable: "ls",
      params: [],
      provideTty: false,
    },
    {
      type: "Shell",
      name: "bash2",
      cwd: "/home/p4/p4-boilerplate/Example5-IPv4Routing/",
      executable: "ls",
      params: [],
      provideTty: false,
    },
  ],
  description: "Example5-IPv4Routing description",
  //assignmentLabSheet: "../assignments/prona-learningswitch.md",
  assignmentLabSheetLocation: "instance",
  assignmentLabSheet: "/home/p4/p4-boilerplate/Example5-IPv4Routing/README.md",
  //providerDockerSupplementalPorts: ["80/tcp", "8080/tcp"],
  providerProxmoxTemplateTag: "learn-sdn-hub-template-acn-p4",
  useCollaboration: true,
  useLanguageClient: true,
};
