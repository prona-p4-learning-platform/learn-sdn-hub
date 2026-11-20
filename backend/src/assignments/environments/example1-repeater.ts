import type { EnvironmentDescription } from "../../Environment";

export const name = "Example1-Repeater";
export const environment: EnvironmentDescription = {
  type: "normal",
  terminals: [
    [
      {
        type: "Shell",
        name: "bash",
        cwd: "/home/p4/p4-boilerplate/Example1-Repeater/",
        executable: "./start-terminal1.sh",
        params: [],
        provideTty: true,
      },
    ],
    [
      {
        type: "Shell",
        name: "bash2",
        cwd: "/home/p4/p4-boilerplate/Example1-Repeater/",
        executable: "./start-terminal2.sh",
        params: [],
        provideTty: true,
      },
    ],
  ],
  editableFiles: [
    {
      absFilePath:
        "/home/p4/p4-boilerplate/Example1-Repeater/prona-repeater.p4",
      alias: "prona-repeater.p4",
    },
    {
      absFilePath: "/home/p4/p4-boilerplate/Example1-Repeater/Makefile",
      alias: "Makefile",
    },
    {
      absFilePath:
        "/home/p4/p4-boilerplate/Example1-Repeater/pod-topo/topology.json",
      alias: "topology.json",
    },
    {
      absFilePath:
        "/home/p4/p4-boilerplate/Example1-Repeater/pod-topo/s1-runtime.json",
      alias: "s1-runtime.json",
    },
  ],
  stopCommands: [
    {
      type: "Shell",
      name: "bash",
      cwd: "/home/p4/p4-boilerplate/Example1-Repeater/",
      executable: "./stop-terminal1.sh",
      params: [],
      provideTty: false,
    },
    {
      type: "Shell",
      name: "bash2",
      cwd: "/home/p4/p4-boilerplate/Example1-Repeater/",
      executable: "./stop-terminal2.sh",
      params: [],
      provideTty: false,
    },
  ],
  steps: [
    {
      name: "1",
      label: "make h1 ping h3 work",
      tests: [
        {
          type: "SSHCommand",
          command: "mx h1 ping -c 3 10.0.10.3",
          stdOutMatch: "(.*)",
          successMessage: "ping from h1 to h3 worked!",
          errorHint: "ping from h1 to h3 did not work. Check your P4 code.",
        },
      ],
    },
  ],
  submissionPrepareCommand:
    "tar zcvf /tmp/$user-$environment.tar.gz /home/p4/p4-boilerplate/Example1-Repeater/",
  submissionSupplementalFiles: ["/tmp/$user-$environment.tar.gz"],
  submissionCleanupCommand: "rm /tmp/$user-$environment.tar.gz",
  description: "Example1-Repeater description",
  assignmentLabSheet: "../assignments/prona-repeater.md",
  assignmentLabSheetLocation: "backend",
  //providerDockerSupplementalPorts: ["80/tcp", "8080/tcp"],
  providerProxmoxTemplateTag: "learn-sdn-hub-template-acn-p4",
  useCollaboration: true,
  useLanguageClient: false,
};
