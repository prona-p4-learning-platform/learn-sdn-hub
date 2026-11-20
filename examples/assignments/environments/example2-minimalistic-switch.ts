import type { EnvironmentDescription } from "../../../backend/src/Environment";

export const name = "Example2-MinimalisticSwitch";

export const environment: EnvironmentDescription = {
  tasks: [
    {
      name: "bash",
      cwd: "/home/p4/tmux/example2/",
      executable: "./start-tmux-example2-bash",
      params: [],
      provideTty: true,
    },
    {
      name: "bash2",
      cwd: "/home/p4/tmux/example2/",
      executable: "./start-tmux-example2-bash2",
      params: [],
      provideTty: true,
    },
  ],
  editableFiles: [
    {
      absFilePath: "/home/p4/p4-boilerplate/Example2-MinimalisticSwitch/prona-switch-static-table.p4",
      alias: "prona-switch-static-table.p4",
    },
    {
      absFilePath: "/home/p4/p4-boilerplate/Example2-MinimalisticSwitch/Makefile",
      alias: "Makefile",
    },
    {
      absFilePath: "/home/p4/p4-boilerplate/Example2-MinimalisticSwitch/pod-topo/topology.json",
      alias: "topology.json",
    },
    {
      absFilePath: "/home/p4/p4-boilerplate/Example2-MinimalisticSwitch/pod-topo/s1-runtime.json",
      alias: "s1-runtime.json",
    },
    {
      absFilePath: "/home/p4/p4-boilerplate/Example2-MinimalisticSwitch/alternative/prona-switch-static-naive.p4",
      alias: "prona-switch-static-naive.p4",
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
  description: "Example2-MinimalisticSwitch",
  assignmentLabSheet: "../assignments/prona-minimalisticswitch.md",
};
