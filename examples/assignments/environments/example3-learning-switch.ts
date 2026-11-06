import type { EnvironmentDescription } from "../../../backend/src/Environment";

export const name = "Example3-LearningSwitch";

export const environment: EnvironmentDescription = {
  tasks: [
    {
      name: "bash",
      cwd: "/home/p4/tmux/example3/",
      executable: "./start-tmux-example3-bash",
      params: [],
      provideTty: true,
    },
    {
      name: "bash2",
      cwd: "/home/p4/tmux/example3/",
      executable: "./start-tmux-example3-bash2",
      params: [],
      provideTty: true,
    },
    {
      name: "bash3",
      cwd: "/home/p4/tmux/example3/",
      executable: "./start-tmux-example3-bash3",
      params: [],
      provideTty: true,
    },
  ],
  editableFiles: [
    {
      absFilePath: "/home/p4/p4-boilerplate/Example3-LearningSwitch/p4src/prona-switch-learning.p4",
      alias: "prona-switch-learning.p4",
    },
    {
      absFilePath: "/home/p4/p4-boilerplate/Example3-LearningSwitch/learning_switch_controller_app.py",
      alias: "learning_switch_controller_app.py",
    },
    {
      absFilePath: "/home/p4/p4-boilerplate/Example3-LearningSwitch/p4app.json",
      alias: "p4app.json",
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
    {
      name: "bash3",
      cwd: "/home/p4/",
      executable: "exit",
      params: [],
      provideTty: false,
    },
  ],
  description: "Example3-LearningSwitch",
  assignmentLabSheet: "../assignments/prona-learningswitch.md",
};
