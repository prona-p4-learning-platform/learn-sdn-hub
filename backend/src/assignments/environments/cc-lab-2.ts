import type { EnvironmentDescription } from "../../Environment";

export const name = "CC-Lab-2";
export const environment: EnvironmentDescription = {
  type: "normal",
  //providerImage: "cc-container",
  //providerDockerCmd: "",
  providerProxmoxTemplateTag: "learn-sdn-hub-develop-cc-template",
  mountKubeconfig: true,
  terminals: [
    [
      {
        type: "Shell",
        name: "host1",
        cwd: "/home/p4/cc-container/labs/lab2",
        executable: "export TERM=\"xterm-256color\" && pushd /home/p4/cc-container && /home/p4/cc-container/update-image.sh && popd",
        params: [],
        provideTty: true,
      },
    ],
  ],
  editableFiles: [
    {
      absFilePath: "/home/p4/cc-container/labs/lab2/grafana-values.yaml",
      alias: "grafana-values.yaml",
    },
    {
      absFilePath: "/home/p4/cc-container/labs/lab2/sample-apps.yaml",
      alias: "sample-apps.yaml",
    },
    {
      absFilePath: "/home/p4/cc-container/labs/lab2/README.md",
      alias: "README.md",
    },
  ],
  stopCommands: [],
  description: "CC-Test description",
  assignmentLabSheetLocation: "instance",
  assignmentLabSheet: "/home/p4/cc-container/labs/lab2/README.md",
};
