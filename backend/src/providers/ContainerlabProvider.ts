import {
  InstanceProvider,
  VMEndpoint,
  InstanceNotFoundErrorMessage,
} from "./Provider";
//import { Client } from "ssh2";
import { ToadScheduler, SimpleIntervalJob, AsyncTask } from "toad-scheduler";
import { load } from "js-yaml";
//import Environment from "../Environment";

const schedulerIntervalSeconds = 5 * 60;

interface Token {
  token: string;
  issued_at: number; // ms since epoch
  expires_at: number; // ms since epoch
}

export default class ContainerLabProvider implements InstanceProvider {
  // ContainerLab config
  private clab_username: string;
  private clab_password: string;
  private clab_apiUrl: string;

  // the authentication token from keystone
  private clab_token?: Token;
  private clab_token_duration: number;

  // ContainerLab Provider config
  private maxInstanceLifetimeMinutes: number;

  // SSH and LanguageServer Port config
  private sshPort: number;
  private lsPort: number;

  //private axiosInstance: AxiosInstance;

  constructor() {

    // check for ContainerLab username
    const ENV_USERNAME = process.env.CLAB_USERNAME;
    if (ENV_USERNAME) this.clab_username = ENV_USERNAME;
    else {
      throw new Error(
        "ContainerLabProvider: No username provided (CONTAINERLAB_USERNAME).",
      );
    }

    // check for ContainerLab password
    const ENV_PASSWORD = process.env.CLAB_PASSWORD;
    if (ENV_PASSWORD) this.clab_password = ENV_PASSWORD;
    else {
      throw new Error(
        "ContainerLabProvider: No password provided (CONTAINERLAB_PASSWORD).",
      );
    }

    // check for ContainerLab auth url
    const ENV_URL = process.env.CLAB_APIURL;
    if (ENV_URL)
      this.clab_apiUrl = ENV_URL.endsWith("/") ? ENV_URL : ENV_URL + "/";
    else {
      throw new Error(
        "ContainerLabProvider: No API Url provided (CONTAINERLAB_AUTHURL).",
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
        "DockerProvider: No instance lifetime provided (CONTAINERLAB_MAX_INSTANCE_LIFETIME_MINUTES).",
      );
    }

    const ENV_TOKEN_DURATION = process.env.CLAB_TOKEN_DURATION_IN_MINUTES
    if(ENV_TOKEN_DURATION) {
      const TOKEN_DURATION = parseInt(ENV_TOKEN_DURATION);
      if(!isNaN(TOKEN_DURATION)) {
        this.clab_token_duration = TOKEN_DURATION*60*1000;
      }
      else {
        throw new Error(
          "ContainerLabProvider: Provided token duration cannot be parsed (CLAB_TOKEN_DURATION_IN_MINUTES).",
        );
      }
    }
    else {
      this.clab_token_duration = 60*60*1000; // default token duration 60 minutes
    }
    // better use env var to allow configuration of port numbers?
    this.sshPort = 22;
    this.lsPort = 3005;

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

    this.getToken().catch((err: unknown) => {
      console.log(
        "ContainerLabProvider: Initial authentication to ContainerLab failed: " +
          (err instanceof Error ? err.message : String(err)),
      );
    });
  }

  async getToken(): Promise<void> {
    const tokenExpires = this.clab_token?.expires_at ?? Date.now();
    const now = Date.now();

    console.log(
      "Token expires at: " +
        new Date(tokenExpires).toISOString() +
        " now: " +
        new Date(now).toISOString(),
    );

    // add 5 sec for the token to be valid for subsequent operations
    if (this.clab_token !== undefined && now <= tokenExpires + 5000) {
      return;
    }

    // authenticate to ContainerLab and get a token
    const data_auth = {
      username: this.clab_username,
      password: this.clab_password,
    };
    const response = await fetch(this.clab_apiUrl + "login", {
      signal: AbortSignal.timeout(10000), // 10 seconds timeout
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data_auth),
    });

    if (!response.ok || !response.body) {
      throw new Error(
        "ContainerLabProvider: Authentication failed: No token received",
      );
    }

    const data = (await response.json()) as { token?: string };

    if (!data.token) {
      throw new Error(
        "ContainerLabProvider: Authentication failed: No token received",
      );
    }

    const issued_at = Date.now();

    if (this.clab_token === undefined) {
      this.clab_token = {} as Token;
    }

    this.clab_token.token = data.token;
    this.clab_token.issued_at = issued_at - 10000; // workaround, set issued at to 10 sec in the past, because 10 sec timeout above
    this.clab_token.expires_at = issued_at + this.clab_token_duration; // token valid for configured duration
  }

  async createServer(): Promise<VMEndpoint> {

    return new Promise(() => {});
  }

  async getServer(instance: string): Promise<VMEndpoint> {

    // Local typed shape for container entries returned by the clab API
    type ClabContainerInfo = {
      name?: string;
      container_id?: string;
      image?: string;
      kind?: string;
      state?: string;
      status?: string;
      ipv4_address?: string;
      ipv6_address?: string;
      lab_name?: string;
      labPath?: string;
      absLabPath?: string;
      group?: string;
      owner?: string;
    };

    await this.getToken();

    const response = await fetch(this.clab_apiUrl + "api/v1/labs/" + instance, {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization: "Bearer " + this.clab_token?.token,
      },
    });

    if (response.status === 404) {
      // Instance not found
      throw new Error(InstanceNotFoundErrorMessage);
    }

    if (!response.ok) {
      throw new Error(
        "ContainerLabProvider: Failed to get server instance. Status: " +
          response.status,
      );
    }

    // Instance found
    const data = (await response.json()) as Record<string, ClabContainerInfo>;

    // Build managementAddresses mapping from returned container entries
    const managementAddresses: Record<string, string> = {};

    const containers: ClabContainerInfo[] = Object.values(data);

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

    // Choose a representative IPAddress (fallback to first container IP if present)
    const representativeIP =
      (firstContainer?.ipv4_address ?? "").split("/")[0] || "";

    return {
      instance: instance,
      providerInstanceStatus:
        "Environment will be deleted at " + deadline.toISOString(),
      IPAddress: representativeIP,
      SSHPort: this.sshPort,
      LanguageServerPort: this.lsPort,
      managementAddresses: Object.keys(managementAddresses).length
        ? managementAddresses
        : undefined,
    };
  }

  async deleteServer(_labName: string): Promise<void> {
    return new Promise(() => {});
  }

  async pruneServerInstance(): Promise<void> {
    // Clab API response types
    type ClabInspectOutput = Record<string, ClabContainerInfo[]>;

    type ClabContainerInfo = {
      name: string;
      container_id: string;
      image: string;
      kind: string;
      state: string;
      status: string;
      ipv4_address: string;
      ipv6_address: string;
      lab_name: string;
      labPath: string;
      absLabPath: string;
      group: string;
      owner: string;
    };

    // Authentication token
    await this.getToken();
    const token = this.clab_token?.token;
    if (!token) {
      throw new Error("ContainerLabProvider: Cannot prune instances: missing auth token!");
    }

    // Request a list of labs and containers
    const response = await fetch(`${this.clab_apiUrl}api/v1/labs`, {
      method: "GET",
      signal: AbortSignal.timeout(10_000),
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`ContainerLabProvider: Failed to list labs (${response.status}): ${body}`);
    }

    // Interpret response as clab output types
    const labs = (await response.json()) as ClabInspectOutput;

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

        const uptime = parseUptimeMs(c.status);
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
}
