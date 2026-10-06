import {
  InstanceProvider,
  VMEndpoint,
  InstanceNotFoundErrorMessage,
} from "./Provider";
//import { Client } from "ssh2";
import { ToadScheduler, SimpleIntervalJob, AsyncTask } from "toad-scheduler";
import { load, dump } from "js-yaml";
import path from "path";
import ClabApiClient from "./ClabApiClient";
import type { ClabContainerInfo } from "./ClabApiClient";
import {
  collectReferencedBindSources,
  resolveFileUrl,
} from "./TopologyFiles";
//import Environment from "../Environment";

const schedulerIntervalSeconds = 5 * 60;

// Poll interval and attempt budget for waiting until all lab containers are
// running after deployLabByPath (60 x 2s = bounded 2 min, allowing for image
// pulls on first deploy).
const pollIntervalMs = 2000;
const pollMaxAttempts = 60;

export default class ContainerLabProvider implements InstanceProvider {
  // ContainerLab config
  private clab_username: string;
  private clab_password: string;
  private clab_apiUrl: string;

  // lab name prefix applied to every deployed lab (default: "")
  private labPrefix: string;

  // whether the clab API client should accept self-signed TLS certificates
  private tlsInsecure: boolean;

  // REST client for the clab API (injectable for tests); owns authentication
  private client: ClabApiClient;

  // ContainerLab Provider config
  private maxInstanceLifetimeMinutes: number;

  // SSH and LanguageServer Port config
  private sshPort: number;
  private lsPort: number;

  //private axiosInstance: AxiosInstance;

  constructor(client?: ClabApiClient) {

    // check for ContainerLab username
    const ENV_USERNAME = process.env.CLAB_USERNAME;
    if (ENV_USERNAME) this.clab_username = ENV_USERNAME;
    else {
      throw new Error(
        "ContainerLabProvider: No username provided (CLAB_USERNAME).",
      );
    }

    // check for ContainerLab password
    const ENV_PASSWORD = process.env.CLAB_PASSWORD;
    if (ENV_PASSWORD) this.clab_password = ENV_PASSWORD;
    else {
      throw new Error(
        "ContainerLabProvider: No password provided (CLAB_PASSWORD).",
      );
    }

    // check for ContainerLab auth url
    const ENV_URL = process.env.CLAB_APIURL;
    if (ENV_URL)
      this.clab_apiUrl = ENV_URL.endsWith("/") ? ENV_URL : ENV_URL + "/";
    else {
      throw new Error(
        "ContainerLabProvider: No API Url provided (CLAB_AUTHURL).",
      );
    }

    // check for max instance lifetime
    const ENV_LIFETIME = process.env.CLAB_MAX_INSTANCE_LIFETIME_MINUTES;
    if (ENV_LIFETIME) {
      const parsedLifetime = parseInt(ENV_LIFETIME);

      if (!isNaN(parsedLifetime))
        this.maxInstanceLifetimeMinutes = parsedLifetime;
      else {
        throw new Error(
          "ContainerLabProvider: Provided instance lifetime cannot be parsed (CONTAINERLAB_MAX_INSTANCE_LIFETIME_MINUTES).",
        );
      }
    } else {
      throw new Error(
        "DockerProvider: No instance lifetime provided (CLAB_MAX_INSTANCE_LIFETIME_MINUTES).",
      );
    }

    let tokenDurationMs = 60 * 60 * 1000; // default token duration 60 minutes
    const ENV_TOKEN_DURATION = process.env.CLAB_TOKEN_DURATION_IN_MINUTES
    if(ENV_TOKEN_DURATION) {
      const TOKEN_DURATION = parseInt(ENV_TOKEN_DURATION);
      if(!isNaN(TOKEN_DURATION)) {
        tokenDurationMs = TOKEN_DURATION*60*1000;
      }
      else {
        throw new Error(
          "ContainerLabProvider: Provided token duration cannot be parsed (CLAB_TOKEN_DURATION_IN_MINUTES).",
        );
      }
    }
    // check for the optional lab name prefix
    this.labPrefix = process.env.CLAB_LAB_PREFIX ?? "";

    // check whether the clab API should accept self-signed certificates
    const ENV_TLS_INSECURE = process.env.CLAB_API_TLS_INSECURE;
    this.tlsInsecure = ENV_TLS_INSECURE === "true" || ENV_TLS_INSECURE === "1";

    // better use env var to allow configuration of port numbers?
    this.sshPort = 22;
    this.lsPort = 3005;

    this.client =
      client ??
      new ClabApiClient({
        apiUrl: this.clab_apiUrl,
        username: this.clab_username,
        password: this.clab_password,
        tlsInsecure: this.tlsInsecure,
        tokenDurationMs: tokenDurationMs,
      });

    const scheduler = new ToadScheduler();

    const task = new AsyncTask(
      "ContainerLabProvider Instance Pruning Task",
      () => {
        return this.pruneServerInstance();
      },
      (err: Error) => {
        console.log(
          "ConatinerLabProvider: Could not prune stale server instances..." +
            err.message,
        );
      },
    );
    const job = new SimpleIntervalJob(
      { seconds: schedulerIntervalSeconds, runImmediately: true },
      task,
    );

    scheduler.addSimpleIntervalJob(job);

    this.client
      .getToken()
      .catch((err: unknown) => {
        console.log(
          "ContainerLabProvider: Initial authentication to ContainerLab failed: " +
            (err instanceof Error ? err.message : String(err)),
        );
      });
  }

  async createServer(
    username: string,
    groupNumber: number,
    environment: string,
    options?: {
      clabTopology?: string | object;
    },
  ): Promise<VMEndpoint> {
    // Global-Constraints naming formula: <prefix><environment>-<group>-<user>
    const labName = `${this.labPrefix}${environment}-${groupNumber}-${username}`;

    const clabTopology = options?.clabTopology;
    if (clabTopology === undefined) {
      throw new Error(
        "ContainerLabProvider: No clabTopology option provided.",
      );
    }

    try {
      // resolve the topology (URL fetch or inline object)
      let topology: object;
      let topologyUrl: string | undefined;
      if (typeof clabTopology === "string") {
        topologyUrl = clabTopology;
        topology = await this.getTopology(clabTopology);
      } else {
        topology = clabTopology;
      }

      topology = this.changeTopologyName(topology, labName);
      // spec §3: every deployed lab gets a jumphost node so Shell terminals
      // have a well-known entry container
      topology = this.addJumphostToTopology(topology);

      // stage files referenced by bind mounts (only possible for URL sources)
      const stagedFiles: Array<{ path: string; content: string }> = [];
      if (topologyUrl !== undefined) {
        for (const entry of collectReferencedBindSources(topology)) {
          const fileUrl = resolveFileUrl(topologyUrl, entry);
          let response: Response;
          try {
            response = await fetch(fileUrl);
          } catch (err) {
            throw new Error(
              `ContainerLabProvider: Failed to fetch referenced file ${fileUrl}: ${
                err instanceof Error ? err.message : String(err)
              }`,
            );
          }
          if (!response.ok) {
            throw new Error(
              `ContainerLabProvider: Failed to fetch referenced file ${fileUrl} (${response.status})`,
            );
          }
          stagedFiles.push({ path: entry, content: await response.text() });
        }
      }

      // create the workspace and stage topology and referenced files; the
      // clab API requires every file's parent directory to exist first
      const topologyPath = `${labName}/${labName}.clab.yml`;
      const directories = new Set<string>([labName]);
      for (const file of stagedFiles) {
        directories.add(path.dirname(`${labName}/${file.path}`));
      }
      for (const directory of directories) {
        await this.client.createWorkspaceDirectory(directory);
      }
      await this.client.putWorkspaceFile(topologyPath, dump(topology));
      for (const file of stagedFiles) {
        await this.client.putWorkspaceFile(`${labName}/${file.path}`, file.content);
      }

      // deploy and poll until all containers report running state
      await this.client.deployLabByPath(labName, topologyPath);

      let running = false;
      for (let attempt = 0; attempt < pollMaxAttempts; attempt++) {
        const containers = await this.client.getLab(labName);
        if (
          containers.length > 0 &&
          containers.every((container) => container.state === "running")
        ) {
          running = true;
          break;
        }
        await this.sleep(pollIntervalMs);
      }
      if (!running) {
        throw new Error(
          `ContainerLabProvider: Lab ${labName} did not reach running state within the polling timeout.`,
        );
      }

      return await this.getServer(labName);
    } catch (err) {
      // do not leave a deployed or half-deployed lab behind
      try {
        await this.client.deleteLab(labName);
      } catch (cleanupErr) {
        console.log(
          "ContainerLabProvider: Failed to clean up lab " +
            labName +
            " after failed deploy: " +
            (cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr)),
        );
      }
      throw err;
    }
  }

  async getServer(instance: string): Promise<VMEndpoint> {
    let containers: ClabContainerInfo[];
    try {
      containers = await this.client.getLab(instance);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("status 404")) {
        // Instance not found
        throw new Error(InstanceNotFoundErrorMessage);
      }
      throw new Error(
        "ContainerLabProvider: Failed to get server instance. " + message,
      );
    }

    // Build managementAddresses mapping from returned container entries
    const managementAddresses: Record<string, string> = {};

    // pick first container for existing uptime/ip logic (keeps current behavior)
    const firstContainer = containers[0];

    // Parse uptime from Docker status string (of the first container)
    const upTime = (firstContainer?.status ?? "").split(" ");

    let difTime = 0;
    if (upTime.length === 3) {
      if (upTime[2] === "seconds") {
        difTime = parseInt(upTime[1]) * 1000;
      } else if (upTime[2] === "minutes") {
        difTime = parseInt(upTime[1]) * 60 * 1000;
      } else if (upTime[2] === "hours") {
        difTime = parseInt(upTime[1]) * 60 * 60 * 1000;
      } else if (upTime[2] === "days") {
        difTime = parseInt(upTime[1]) * 24 * 60 * 60 * 1000;
      } else {
        throw new Error("ContainerLabProvider: Cannot parse uptime string.");
      }
    } else if (upTime.length === 4) {
      if (upTime[3] === "second") {
        difTime = 1000;
      } else if (upTime[3] === "minute") {
        difTime = 60 * 1000;
      } else if (upTime[3] === "hour") {
        difTime = 60 * 60 * 1000;
      } else if (upTime[3] === "day") {
        difTime = 24 * 60 * 60 * 1000;
      } else {
        throw new Error("ContainerLabProvider: Cannot parse uptime string.");
      }
    } else {
      throw new Error(
        "ContainerLabProvider: Docker status string unexpected format.",
      );
    }

    const deadline = new Date(
      Date.now() + this.maxInstanceLifetimeMinutes * 60 * 1000 - difTime,
    );
    console.log(
      "ContainerLabProvider: Instance " +
        instance +
        " will be deleted at " +
        deadline.toISOString(),
    );

    // Collect management addresses from all containers (if available)
    for (const c of containers) {
      const nodeName = c?.name ?? c?.container_id ?? "";
      const ipRaw = c?.ipv4_address ?? "";
      const ip = ipRaw.split("/")[0] || "";
      if (nodeName && ip) {
        managementAddresses[nodeName] = `${ip}:${this.sshPort}`;
      }
    }

    // Resolve the jumphost container with the same exact/suffix resolution
    // DockerConsole uses: exact container-name match, else a unique name
    // ending in "-jumphost".
    const jumphostNodeName = "jumphost";
    let jumphostContainer = containers.find(
      (container) => container.name === jumphostNodeName,
    );
    if (jumphostContainer === undefined) {
      const suffixMatches = containers.filter(
        (container) =>
          typeof container.name === "string" &&
          container.name.endsWith(`-${jumphostNodeName}`),
      );
      jumphostContainer =
        suffixMatches.length === 1 ? suffixMatches[0] : undefined;
    }
    const jumphostIp =
      (jumphostContainer?.ipv4_address ?? "").split("/")[0] || "";

    // Default transport: direct container management IP (works only when the
    // backend can reach the clab host's Docker bridge).
    let ipAddress =
      jumphostIp || (firstContainer?.ipv4_address ?? "").split("/")[0] || "";
    let sshPort = this.sshPort;

    // Preferred transport: the clab-api-server node SSH proxy, so backends on
    // a different host can reach the node. Deployment must not fail when the
    // proxy is unavailable (DockerShell-only environments), so failures fall
    // back to the management address above.
    const jumphostContainerName = jumphostContainer?.name;
    if (jumphostContainerName) {
      try {
        const access = await this.client.createNodeSshAccess(
          instance,
          jumphostContainerName,
        );
        ipAddress = access.host;
        sshPort = access.port;
      } catch (err) {
        console.warn(
          "ContainerLabProvider: Node SSH access for " +
            jumphostContainerName +
            " failed, falling back to container management address: " +
            (err instanceof Error ? err.message : String(err)),
        );
      }
    }

    return {
      instance: instance,
      providerInstanceStatus:
        "Environment will be deleted at " + deadline.toISOString(),
      IPAddress: ipAddress,
      SSHPort: sshPort,
      LanguageServerPort: this.lsPort,
      managementAddresses: Object.keys(managementAddresses).length
        ? managementAddresses
        : undefined,
    };
  }

  async deleteServer(labName: string): Promise<void> {
    // destroy the lab; workspace files are kept
    await this.client.deleteLab(labName);
  }

  async pruneServerInstance(): Promise<void> {
    // Authentication is owned by the client
    await this.client.getToken();

    // Request a list of labs and containers
    const labs = await this.client.listLabs();

    // Maximum allowed age of instances and prefix of current application lab
    const maxAgeMs = this.maxInstanceLifetimeMinutes * 60_000;
    const labPrefix = process.env.CLAB_LAB_PREFIX ?? "";

    // Helper method to parse the uptime
    const parseUptimeMs = (status: string): number | undefined => {
      if (!status) return undefined;
      const s = status.trim();
      if (!s.startsWith("Up ")) return undefined;

      if (/Up About a minute/i.test(s)) return 60_000;
      if (/Up Less than a second/i.test(s)) return 1000;

      const m = s.match(
        /^Up\s+(\d+)\s+(second|minute|hour|day|week|month|year)s?\b/i,
      );
      if (!m) return undefined;

      const value = Number(m[1]);
      if (!Number.isFinite(value)) return undefined;

      switch (m[2].toLowerCase()) {
        case "second":
          return value * 1000;
        case "minute":
          return value * 60_000;
        case "hour":
          return value * 3_600_000;
        case "day":
          return value * 86_400_000;
        case "week":
          return value * 604_800_000;
        case "month":
          return value * 2_592_000_000;
        case "year":
          return value * 31_536_000_000;
        default:
          return undefined;
      }
    };

    for (const [labName, containers] of Object.entries(labs)) {
      if (!containers.length) continue;

      // Skip labs that are not created by the current application
      if (labPrefix && !labName.startsWith(labPrefix)) continue;

      // Compute max runtime across running containers
      let labAgeMs = 0;
      for (const c of containers) {
        if (c.state && c.state !== "running") continue;

        const uptime = parseUptimeMs(c.status ?? "");
        if (uptime !== undefined) labAgeMs = Math.max(labAgeMs, uptime);
      }

      // Check if uptimes could be parsed
      if (labAgeMs === 0) continue;

      if (labAgeMs > maxAgeMs) {
        try {
          // Delete lab if uptime too high
          await this.deleteServer(labName);
          console.log(`ContainerLabProvider: Pruned lab '${labName}' (age≈${Math.round(labAgeMs / 60_000)}m)`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.log(`ContainerLabProvider: Failed to prune lab '${labName}': ${msg}`);
        }
      }
    }


  }

  waitForServerAddresses(): Promise<string> {
    return new Promise<string>(() => {});
  }

  //waitForServerSSH(ip: string, port: number, timeout: number): Promise<void> {
  //
  //  return new Promise<void>(async () => {});
  //}

  sleep(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  async getTopology(url: string): Promise<object> {
    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers: {
          accept: "application/yaml",
        },
      });
    } catch (err) {
      throw new Error(
        `ContainerLabProvider: Failed to fetch topology from ${url}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }

    if (!response.ok) {
      throw new Error(
        `ContainerLabProvider: Failed to fetch topology from ${url} (${response.status})`,
      );
    }

    const data = await response.text();

    try {
      return load(data) as object;
    } catch (err) {
      throw new Error(
        `ContainerLabProvider: Failed to parse topology from ${url}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  changeTopologyName(topology: object, newName: string): object {
    const topo = topology as {[key: string]: string | object};
    topo["name"] = newName;
    return topo;
  }

  addJumphostToTopology(topology: object): object {
    const topo = topology as Record<string, unknown>;
    if (!topo["topology"] || typeof topo["topology"] !== "object") {
      topo["topology"] = {};
    }
    const topologyBlock = topo["topology"] as Record<string, unknown>;
    if (!topologyBlock["nodes"] || typeof topologyBlock["nodes"] !== "object") {
      topologyBlock["nodes"] = {};
    }
    const nodes = topologyBlock["nodes"] as Record<string, unknown>;
    nodes["jumphost"] = {
      kind: "linux",
      image: "alpine:latest",
      group: "hosts",
      exec: [
        "ip addr add 192.168.188.2/24 dev eth1",
        "apk add openrc openssh",
        "ssh-keygen -A",
        "mkdir -p /run/openrc",
        "touch /run/openrc/softlevel",
        "rc-update add sshd",
        "rc-service sshd start",
        "adduser -D p4",
        "ash -c 'echo p4:p4 | chpasswd'",
      ],
    };
    return topo;
  }
}
