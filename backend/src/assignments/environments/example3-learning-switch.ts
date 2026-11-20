import type { EnvironmentDescription } from "../../Environment";

export const name = "Example3-LearningSwitch";
export const environment: EnvironmentDescription = {
  type: "normal",
  terminals: [
    [
      {
        type: "Shell",
        name: "bash",
        cwd: "/home/p4/p4-boilerplate/Example3-LearningSwitch/",
        executable: "./start-terminal1.sh",
        params: [],
        provideTty: true,
      },
    ],
    [
      {
        type: "Shell",
        name: "bash2",
        cwd: "/home/p4/p4-boilerplate/Example3-LearningSwitch/",
        executable: "./start-terminal2.sh",
        params: [],
        provideTty: true,
      },
    ],
  ],
  editableFiles: [
    {
      absFilePath:
        "/home/p4/p4-boilerplate/Example3-LearningSwitch/p4src/prona-switch-learning.p4",
      alias: "prona-switch-learning.p4",
    },
    {
      absFilePath:
        "/home/p4/p4-boilerplate/Example3-LearningSwitch/learning_switch_controller_app.py",
      alias: "learning_switch_controller_app.py",
    },
    {
      absFilePath: "/home/p4/p4-boilerplate/Example3-LearningSwitch/p4app.json",
      alias: "p4app.json",
    },
    {
      absFilePath: "/home/p4/tutorials/exercises/basic/basic.p4",
      alias: "basic.p4",
    },
  ],
  stopCommands: [
    {
      type: "Shell",
      name: "bash",
      cwd: "/home/p4/p4-boilerplate/Example3-LearningSwitch/",
      executable: "./stop-terminal1.sh",
      params: [],
      provideTty: false,
    },
    {
      type: "Shell",
      name: "bash2",
      cwd: "/home/p4/p4-boilerplate/Example3-LearningSwitch/",
      executable: "./stop-terminal2.sh",
      params: [],
      provideTty: false,
    },
  ],
  description: "Example3-LearningSwitch description",
  assignmentLabSheet: "../assignments/prona-learningswitch.md",
  //providerDockerSupplementalPorts: ["80/tcp", "8080/tcp"],
  providerProxmoxTemplateTag: "learn-sdn-hub-template-acn-p4",
  useCollaboration: true,
  useLanguageClient: true,
};
