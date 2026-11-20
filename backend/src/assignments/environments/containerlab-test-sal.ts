import type { EnvironmentDescription } from "../../Environment";

// SAL
export const name = "Containerlab-Test-SAL";
export const environment: EnvironmentDescription = {
  type: "normal",
  providerProxmoxTemplateTag: "learn-sdn-hub-template-apel",
  // providerProxmoxTemplateTag: "learn-sdn-hub-develop-template",
  sshTunnelingPorts: ["50080$(GROUP_ID)"],
  terminals: [
    [
      {
        type: "Shell",
        name: "host1",
        cwd: "/home/p4/containerlab-testlabs/",
        executable: "./generate_topology.sh",
        params: ["\"simple_test_lab\"", "$(GROUP_ID)", "1"],
        provideTty: true,
      },
    ],
    [
      {
        type: "Shell",
        name: "host2",
        cwd: "/home/p4/containerlab-testlabs/",
        executable: "./start_container.sh",
        params: ["\"simple_test_lab\"", "$(GROUP_ID)", "2"],
        provideTty: true,
      },
    ],
    [
      {
        type: "WebApp",
        name: "Topologie Graph",
        url: "http://localhost:50080$(GROUP_ID)",
      },
    ],
    [
      {
        type: "Shell",
        name: "topologie_graph",
        cwd: "/home/p4/containerlab-testlabs/",
        executable: "./generate_graph.sh",
        params: ["\"simple_test_lab\"", "$(GROUP_ID)"],
        provideTty: true, //TODO SAL: "false" does not work correctly in this case (though used correcly during undeploy and running tests in the backend), possibly some error in SSHConsole?
      },
    ],
    // [
    //   {
    //     type: "Shell",
    //     name: "TEST",
    //     cwd: "/home/p4/containerlab-testlabs/",
    //     executable: "echo TEST",
    //     params: [],
    //     provideTty: false,
    //   },
    // ],
  ],
  editableFiles: [
    {
      absFilePath:
        "/home/p4/containerlab-testlabs/lab-notes.md",
      alias: "lab-notes",
    }
  ],
  stopCommands: [
    {
      type: "Shell",
      name: "bash",
      cwd: "/home/p4/containerlab-testlabs/",
      executable: "sudo clab destroy",
      //TODO: SAL: also in the script with additional parameters, as a topology file must be specified
      params: [],
      provideTty: false,
    },
  ],
  description: "ContainerLab Test SAL",
  assignmentLabSheetLocation: "instance",
  assignmentLabSheet: "/home/p4/containerlab-testlabs/README.md",
};
