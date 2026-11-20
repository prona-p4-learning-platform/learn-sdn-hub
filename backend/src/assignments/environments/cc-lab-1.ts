import type { EnvironmentDescription } from "../../Environment";

export const name = "CC-Lab-1";
export const environment: EnvironmentDescription = {
  type: "k8s",
  //providerImage: "cc-container",
  //providerDockerCmd: "",
  providerProxmoxTemplateTag: "learn-sdn-hub-develop-cc-template",
  mountKubeconfig: true,
  terminals: [
    [
      {
        type: "Shell",
        name: "host1",
        cwd: "/home/p4/labs/lab1",
        executable: "export TERM=\"xterm-256color\"",
        params: [],
        provideTty: true,
      },
    ],
  ],
  editableFiles: [
    {
      absFilePath: "/home/p4/labs/lab1/nginx.yaml",
      alias: "nginx.yaml",
    },
  ],
  stopCommands: [],
  description: "CC-Test description",
  assignmentLabSheetLocation: "instance",
  assignmentLabSheet: "/home/p4/labs/lab1/README.md",
};
