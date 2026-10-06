// Example: containerlab assignment deploying a topology by URL.
//
// This mirrors the lab described in sample-topology-with-mgmt-host.clab.yml
// (dnsmasq server on a bridged switch). The topology YAML (and the file
// referenced by its bind mount, server1/dnsmasq.conf) must be served by a
// web server; the provider fetches the topology from topologyUrl and stages
// every referenced bind source — resolved relative to the topology URL's
// directory — into the clab-api-server workspace before deploying.
//
// Run the backend with ContainerLabApplication.ts and the CLAB_* environment
// variables documented in the README's containerlab section.

import { EnvironmentDescription } from "../../backend/src/Environment";

const environments = new Map<string, EnvironmentDescription>();

environments.set("Containerlab-Dnsmasq-TopologyUrl", {
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
  topologyUrl: "https://<webhost>/labs/sample.clab.yml",
});
