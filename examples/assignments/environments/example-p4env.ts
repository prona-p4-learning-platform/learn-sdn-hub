import type { EnvironmentDescription } from "../../../backend/src/Environment";

export const name = "Example-p4env";

export const environment: EnvironmentDescription = {
  tasks: [
    {
      name: "bash",
      cwd: "/home/p4/tmux/example4/",
      executable: "./start-tmux-example4-bash",
      params: [],
      provideTty: true,
    },
    {
      name: "bash2",
      cwd: "/home/p4/tmux/example4/",
      executable: "./start-tmux-example4-bash2",
      params: [],
      provideTty: true,
    },
  ],
  editableFiles: [
    {
      absFilePath: "/home/p4/p4environment/p4programs/l2_forwarding_static/l2_forwarding_static.p4",
      alias: "l2_forwarding_static.p4",
    },
    {
      absFilePath: "/home/p4/p4environment/p4topos/diamond_shape/topology.json",
      alias: "topology.json",
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
  description: "Example-p4env",
  assignmentLabSheet: "../assignments/p4env.md",
};
