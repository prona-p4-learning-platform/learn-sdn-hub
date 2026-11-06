import type { EnvironmentDescription } from "../../Environment";

export const name = "python-test";
export const environment: EnvironmentDescription = {
  type: "normal",
  terminals: [
    [
      {
        type: "Shell",
        name: "bash",
        cwd: "/home/p4/tmux/example3/",
        executable: "./start-tmux-example3-bash",
        params: [],
        provideTty: true,
      },
    ],
  ],
  editableFiles: [
    {
      absFilePath: "/home/p4/p4-boilerplate/Example0-SDN-Intro/OpenFlowApp.py",
      alias: "test1.py",
    },
    {
      absFilePath:
        "/home/p4/p4-boilerplate/Example3-LearningSwitch/learning_switch_controller_app.py",
      alias: "test2.py",
    },
    {
      absFilePath:
        "/home/p4/p4-boilerplate/Example3-LearningSwitch/p4src/prona-switch-learning.p4",
      alias: "test3.p4",
    },
  ],
  stopCommands: [
    {
      type: "Shell",
      name: "bash",
      cwd: "/home/p4/",
      executable: "exit",
      params: [],
      provideTty: false,
    },
  ],
  description: "python-test description",
  assignmentLabSheet: "../assignments/prona-learningswitch.md",
  rootPath: "/home/p4/",
  workspaceFolders: [
    "/home/p4/p4-boilerplate/Example3-LearningSwitch/",
    "/home/p4/p4-boilerplate/Example0-SDN-Intro/",
  ],
  useCollaboration: true,
  useLanguageClient: false,
};
