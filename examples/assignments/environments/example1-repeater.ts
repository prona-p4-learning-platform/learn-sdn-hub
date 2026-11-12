import type { EnvironmentDescription } from "../../../backend/src/Environment";

export const name = "Example1-Repeater";

export const environment: EnvironmentDescription = {
  tasks: [
    {
      name: "bash",
      cwd: "/home/p4/tmux/example1/",
      executable: "./start-tmux-example1-bash",
      params: [],
      provideTty: true,
    },
    {
      name: "bash2",
      cwd: "/home/p4/tmux/example1/",
      executable: "./start-tmux-example1-bash2",
      params: [],
      provideTty: true,
    },
  ],
  editableFiles: [
    {
      absFilePath: "/home/p4/p4-boilerplate/Example1-Repeater/prona-repeater.p4",
      alias: "prona-repeater.p4",
    },
    {
      absFilePath: "/home/p4/p4-boilerplate/Example1-Repeater/Makefile",
      alias: "Makefile",
    },
    {
      absFilePath: "/home/p4/p4-boilerplate/Example1-Repeater/pod-topo/topology.json",
      alias: "topology.json",
    },
    {
      absFilePath: "/home/p4/p4-boilerplate/Example1-Repeater/pod-topo/s1-runtime.json",
      alias: "s1-runtime.json",
    },
  ],
  stopCommands: [
    {
      name: "bash",
      cwd: "/home/p4/",
      executable: "exit",
      params: [],
      provideTty: false,
    },
    {
      name: "bash2",
      cwd: "/home/p4/",
      executable: "exit",
      params: [],
      provideTty: false,
    },
  ],
  description: "Example1-Repeater",
  assignmentLabSheet: "../assignments/prona-repeater.md",
  maxBonusPoints: 5,
};
