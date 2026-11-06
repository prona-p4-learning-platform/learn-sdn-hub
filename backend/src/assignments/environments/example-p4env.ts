import type { EnvironmentDescription } from "../../Environment";

export const name = "Example-p4env";
export const environment: EnvironmentDescription = {
  type: "normal",
  terminals: [
    [
      {
        type: "Shell",
        name: "bash",
        cwd: "/home/p4/p4-boilerplate/Example-p4env/",
        executable: "./start-terminal1.sh",
        params: [],
        provideTty: true,
      },
      {
        type: "Shell",
        name: "bash2",
        cwd: "/home/p4/p4-boilerplate/Example-p4env/",
        executable: "./start-terminal2.sh",
        params: [],
        provideTty: true,
      },
    ],
  ],
  editableFiles: [
    {
      absFilePath:
        "/home/p4/p4environment/p4programs/l2_forwarding_static/l2_forwarding_static.p4",
      alias: "l2_forwarding_static.p4",
    },
    {
      absFilePath: "/home/p4/p4environment/p4topos/diamond_shape/topology.json",
      alias: "topology.json",
    },
  ],
  stopCommands: [
    {
      type: "Shell",
      name: "bash",
      cwd: "/home/p4/p4-boilerplate/Example-p4env/",
      executable: "./stop-terminal1.sh",
      params: [],
      provideTty: false,
    },
    {
      type: "Shell",
      name: "bash2",
      cwd: "/home/p4/p4-boilerplate/Example-p4env/",
      executable: "./stop-terminal2.sh",
      params: [],
      provideTty: false,
    },
  ],
  description: "Example-p4env description",
  assignmentLabSheet: "../assignments/p4env.md",
  providerProxmoxTemplateTag: "learn-sdn-hub-template-acn-p4",
};
