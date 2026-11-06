import type { EnvironmentDescription } from "../../Environment";

export const name = "Containerlab-Dnsmasq-TopologyUrl";
export const environment: EnvironmentDescription = {
  type: "normal",
  terminals: [
    [
      // DockerShell terminals run inside the lab containers via clab-api-server
      // terminal sessions (no sshd needed in the images).
      {
        type: "DockerShell",
        name: "dnsmasq-host",
        containerName: "server1",
      },
      // A regular Shell terminal logged into the jumphost itself (the host
      // running clab-api-server) for comparison.
      {
        type: "Shell",
        name: "jumphost",
        cwd: "/home/p4/",
        executable: "ssh",
        params: [],
        provideTty: true,
      },
    ],
  ],
  editableFiles: [],
  stopCommands: [],
  description: "Containerlab dnsmasq lab deployed from a topology URL",
  assignmentLabSheet: "../assignments/containerlab-dnsmasq.md",
  // The topology is fetched from this URL and deployed by path in the
  // clab-api-server workspace. Relative bind sources in the topology (e.g.
  // server1/dnsmasq.conf) are fetched from <directory of topologyUrl>/<path>.
  //topologyUrl: "https://<webhost>/labs/sample.clab.yml",
  //topologyUrl: "https://raw.githubusercontent.com/prona-p4-learning-platform/kommprot-labs/refs/heads/master/kommprot-lab-application-layer/exercise-topology/kommprot-lab-application.clab.yml",
  topologyUrl: "https://mmnet.informatik.hs-fulda.de/containerlab-provider/sample-topology-with-mgmt-host.clab.yml",
};
