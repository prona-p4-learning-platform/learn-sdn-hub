import type { EnvironmentDescription } from "../../Environment";

export const name = "vCluster-test";
export const environment: EnvironmentDescription = {
  type: "k8s-vcluster",
  //providerImage: "cc-container",
  //providerDockerCmd: "",
  providerProxmoxTemplateTag: "learn-sdn-hub-develop-cc-template",
  terminals: [
    [
      {
        type: "Shell",
        name: "host1",
        cwd: "/home/p4/labs/lab1",
        executable: "",
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
