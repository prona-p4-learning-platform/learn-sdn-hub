import type { EnvironmentDescription } from "../../Environment";

export const name = "Example6-MPLSSwitching";
export const environment: EnvironmentDescription = {
  type: "normal",
  terminals: [
    [
      {
        type: "Shell",
        name: "bash",
        cwd: "/home/p4/p4-boilerplate/Example6-MPLSSwitching/",
        executable: "ls -l",
        params: [],
        provideTty: true,
      },
    ],
    [
      {
        type: "Shell",
        name: "bash2",
        cwd: "/home/p4/p4-boilerplate/Example6-MPLSSwitching/",
        executable: "ls -l",
        params: [],
        provideTty: true,
      },
    ],
  ],
  editableFiles: [
    {
      absFilePath:
        "/home/p4/p4-boilerplate/Example6-MPLSSwitching/p4src/mpls.p4",
      alias: "mpls.p4",
    },
    {
      absFilePath:
        "/home/p4/p4-boilerplate/Example6-MPLSSwitching/network.py",
      alias: "network.py",
    },
    {
      absFilePath: "/home/p4/p4-boilerplate/Example6-MPLSSwitching/s1-commands.txt",
      alias: "s1-commands.txt",
    },
    {
      absFilePath: "/home/p4/p4-boilerplate/Example6-MPLSSwitching/s2-commands.txt",
      alias: "s2-commands.txt",
    },
    {
      absFilePath: "/home/p4/p4-boilerplate/Example6-MPLSSwitching/s3-commands.txt",
      alias: "s3-commands.txt",
    },
    {
      absFilePath: "/home/p4/p4-boilerplate/Example6-MPLSSwitching/s4-commands.txt",
      alias: "s4-commands.txt",
    },
    {
      absFilePath: "/home/p4/p4-boilerplate/Example6-MPLSSwitching/s5-commands.txt",
      alias: "s5-commands.txt",
    },
  ],
  stopCommands: [
    {
      type: "Shell",
      name: "bash",
      cwd: "/home/p4/p4-boilerplate/Example6-MPLSSwitching/",
      executable: "ls",
      params: [],
      provideTty: false,
    },
    {
      type: "Shell",
      name: "bash2",
      cwd: "/home/p4/p4-boilerplate/Example6-MPLSSwitching/",
      executable: "ls",
      params: [],
      provideTty: false,
    },
  ],
  description: "Example6-MPLSSwitching description",
  //assignmentLabSheet: "../assignments/prona-learningswitch.md",
  assignmentLabSheetLocation: "instance",
  assignmentLabSheet: "/home/p4/p4-boilerplate/Example6-MPLSSwitching/README.md",
  //providerDockerSupplementalPorts: ["80/tcp", "8080/tcp"],
  providerProxmoxTemplateTag: "learn-sdn-hub-template-acn-p4",
  useCollaboration: true,
  useLanguageClient: true,
};
