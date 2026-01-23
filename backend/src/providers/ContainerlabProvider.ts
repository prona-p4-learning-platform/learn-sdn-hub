/* eslint-disable @typescript-eslint/prefer-promise-reject-errors */
/* eslint-disable no-async-promise-executor */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// TODO: fix eslint instead of disabling rules
// currently in developement, as the ContainerLab provider is not actively used in our envs

import {
  InstanceProvider,
  VMEndpoint,
  InstanceNotFoundErrorMessage,
} from "./Provider";
//import { Client } from "ssh2";
import { ToadScheduler, SimpleIntervalJob, AsyncTask } from "toad-scheduler";
import { execSync } from "child_process";
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

  private providerInstance: ContainerLabProvider;

  // Minimal default topology (from user)
  private readonly defaultTopology = {
    name: "srl01",
    topology: {
      kinds: {
        nokia_srlinux: {
          type: "ixrd3",
          image: "ghcr.io/nokia/srllinux",
        },
      },
      nodes: {
        srl1: { kind: "nokia_srlinux" },
        srl2: { kind: "nokia_srlinux" },
      },
      links: [{ endpoints: ["srl1:e1-1", "srl2:e1-1"] }],
    },
  };

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
    if (ENV_URL) {
      // normalize to always end with single slash
      this.clab_apiUrl = ENV_URL.endsWith("/") ? ENV_URL : ENV_URL + "/";
    }
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
    this.providerInstance = this;

    // defaultTopology is used below as the payload for topologyContent

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

    this.getToken().catch((err) => {
      console.log(
        "ContainerLabProvider: Initial authentication to ContainerLab failed: " +
          err.message,
      );
    });
  }

  async getToken(): Promise<void> {
    const providerInstance = this.providerInstance;

    const now = Date.now();
    const tokenExpires = providerInstance.clab_token?.expires_at ?? 0;
    console.log(
      "Token expires at: " +
        (tokenExpires ? new Date(tokenExpires).toISOString() : "none") +
        " now: " +
        new Date(now).toISOString(),
    );

    // if token exists and still valid for at least 5s, return
    if (providerInstance.clab_token && now <= tokenExpires - 5000) {
      return;
    }

    // authenticate to ContainerLab and get a token
    const data_auth = {
      username: this.clab_username,
      password: this.clab_password,
    };

    const url = `${providerInstance.clab_apiUrl}login`;
    try {
      console.log(`ContainerLabProvider: authenticating to ${url}`);
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data_auth),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`status=${response.status} body=${body}`);
      }

      const data: any = await response.json();
      if (!data?.token) throw new Error("no token in response");

      const issued_at = Date.now();
      if (!providerInstance.clab_token) providerInstance.clab_token = {} as Token;
      providerInstance.clab_token.token = String(data.token);
      providerInstance.clab_token.issued_at = issued_at - 10000; // small safety margin
      providerInstance.clab_token.expires_at = issued_at + this.clab_token_duration;
      console.log("ContainerLabProvider: authentication succeeded");
      return;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error("ContainerLabProvider: Authentication failed: " + msg);
    }
  }

  async createServer(
    username: string,
    groupNumber: number,
    environment: string,
    options?: {
      image?: string;
      dockerCmd?: string;
      dockerSupplementalPorts?: string[];
      kernelImage?: string;
      kernelBootARGs?: string;
      rootDrive?: string;
      proxmoxTemplateTag?: string;
      mountKubeconfig?: boolean;
      sshTunnelingPorts?: string[];
    },
  ): Promise<VMEndpoint> {
    // Authenticate first
    await this.getToken();
    const token = this.clab_token?.token;
    if (!token) throw new Error("ContainerLabProvider: missing auth token");

    // quiet TS warning about unused optional parameter
    void options;

     // Build a lab name that will be unique-ish and sanitize it for clab-api
     const rawLabName = `${username}-${groupNumber}-${environment}-${Date.now()}`;
     // clab API rejects many chars — allow only a-z0-9, dot, underscore and hyphen.
     // replace runs of invalid chars with a single '-', trim edges, limit length.
     const labName = rawLabName
       .toLowerCase()
       .replace(/[^a-z0-9._-]+/g, "-")
       .replace(/^-+|-+$/g, "")
       .slice(0, 63);
     const createUrl = `${this.clab_apiUrl}api/v1/labs`;
     console.log("ContainerLabProvider: creating lab at " + createUrl);

    // Build payload - send topologyContent as JSON object (clab-api expects a map)
    const payload: any = {
      name: labName,
      owner: username,
      topologyContent: this.defaultTopology,
    };

    const res = await fetch(createUrl, {
      method: "POST",
      signal: AbortSignal.timeout(30_000),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    // DEBUG: log create response status/body for troubleshooting
    const createText = await res.text().catch(() => "");
    console.log("ContainerLabProvider: create response status=", res.status, "body=", createText);
    let created: any = {};
    try { created = JSON.parse(createText || "{}"); } catch { created = {}; }

    if (!res.ok) {
      throw new Error(`ContainerLabProvider: Failed to create lab (${res.status}): ${createText}`);
    }
    const createdName: string = created?.labName ?? created?.name ?? labName;
    console.log("ContainerLabProvider: created lab: " + createdName);

    // Wait for an address to appear (poll)
    const ip = await this.waitForServerAddresses(createdName);

    return {
      instance: createdName,
      providerInstanceStatus: "running",
      IPAddress: ip,
      SSHPort: this.sshPort,
      LanguageServerPort: this.lsPort,
    };
  }

  async getServer(instance: string): Promise<VMEndpoint> {
    const providerInstance = this.providerInstance;

    return new Promise((resolve, reject) => {
      providerInstance
        .getToken()
        .then(() => {
          // Token received

          // ensure consistent concatenation (clab_apiUrl already ends with '/')
          const getUrl = `${providerInstance.clab_apiUrl}api/v1/labs/${instance}`;
          console.log("ContainerLabProvider: fetching " + getUrl);
          fetch(getUrl, {
             method: 'GET',
             headers: {
               'accept': 'application/json',
               'Authorization': 'Bearer ' + providerInstance.clab_token?.token,
             }
           })
          .then(response => {
            if (response.ok) {
              // Instance found
              return response.json().then(data => {

                const upTime: string[] = ((data as any)?.["0"]?.status as string | undefined)?.split(" ") || [];

                // Get Docker status uptime
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
                    return reject("ContainerLabProvider: Cannot parse uptime string.");
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
                    return reject("ContainerLabProvider: Cannot parse uptime string.");
                  }
                } else {
                  return reject("ContainerLabProvider: Docker status string unexpected format.");
                }
                const deadline = new Date(Date.now() + providerInstance.maxInstanceLifetimeMinutes * 60 * 1000 - difTime);
                console.log("ContainerLabProvider: Instance " + instance + " will be deleted at " + deadline.toISOString());

                return resolve({
                  instance: instance,
                  providerInstanceStatus: "Environment will be deleted at "+ deadline.toISOString(),
                  IPAddress: ((data as any)?.["0"]?.["ipv4_address"] as string | undefined)?.split("/")[0] || "",
                  SSHPort: providerInstance.sshPort,
                  LanguageServerPort: providerInstance.lsPort,
                });

              })


            } else if (response.status === 404) {
              // Instance not found
              return reject(new Error(InstanceNotFoundErrorMessage));
            }
          })
          .catch((err) => {
            return reject("ContainerlabProvider: Failed to get server instance. " + err);
          });
        })
        .catch((err) => {
          // No token could be recieved
          return reject(err);
        });
    });
  }

  async deleteServer(instance: string): Promise<void> {
    // ensure we're authenticated
    await this.getToken();
    const token = this.clab_token?.token;
    if (!token) {
      throw new Error("ContainerLabProvider: missing auth token for delete");
    }

    const delUrl = `${this.clab_apiUrl}api/v1/labs/${encodeURIComponent(instance)}`;
    console.log("ContainerLabProvider: deleting lab", delUrl);

    try {
      const res = await fetch(delUrl, {
        method: "DELETE",
        signal: AbortSignal.timeout(10_000),
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        console.log("ContainerLabProvider: delete succeeded for", instance);
        return;
      }

      const body = await res.text().catch(() => "");
      // If server complains about missing topology file, try local forced cleanup
      if (res.status === 500 && body.includes("topology file") && body.includes("does not exist")) {
        console.warn(
          `ContainerLabProvider: server reported missing topology for ${instance}, attempting forced cleanup...`,
        );

        // fetch list of labs to obtain container ids and topology path
        const listUrl = `${this.clab_apiUrl}api/v1/labs`;
        const listRes = await fetch(listUrl, {
          method: "GET",
          signal: AbortSignal.timeout(10_000),
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!listRes.ok) {
          const listBody = await listRes.text().catch(() => "");
          throw new Error(
            `ContainerLabProvider: Failed to fetch labs for forced cleanup (${listRes.status}): ${listBody}`,
          );
        }

        const labsJson: any = await listRes.json().catch(() => ({}));
        const containers: any[] = labsJson?.[instance] ?? [];

        // collect container ids and topology path (if present)
        const ids = containers.map((c) => c?.container_id).filter(Boolean);
        const absLabPath =
          containers.find((c) => c?.absLabPath)?.absLabPath ||
          containers.find((c) => c?.labPath)?.labPath ||
          "";

        if (ids.length) {
          try {
            console.log("ContainerLabProvider: removing containers locally:", ids.join(", "));
            execSync(`docker rm -f ${ids.join(" ")}`, { stdio: "inherit" });
          } catch (e: unknown) {
            console.warn("ContainerLabProvider: docker rm failed (continuing):", (e as Error).message ?? e);
          }
        } else {
          console.log("ContainerLabProvider: no container ids found for forced cleanup");
        }

        if (absLabPath) {
          try {
            console.log("ContainerLabProvider: removing topology file:", absLabPath);
            execSync(`rm -f ${absLabPath}`, { stdio: "inherit" });
          } catch (e: unknown) {
            console.warn("ContainerLabProvider: removing topology file failed (continuing):", (e as Error).message ?? e);
          }
        }

        // retry delete
        const retryRes = await fetch(delUrl, {
          method: "DELETE",
          signal: AbortSignal.timeout(10_000),
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!retryRes.ok) {
          const retryBody = await retryRes.text().catch(() => "");
          throw new Error(`ContainerLabProvider: Forced delete failed (${retryRes.status}): ${retryBody}`);
        }

        console.log("ContainerLabProvider: forced delete succeeded for", instance);
        return;
      }

      throw new Error(`ContainerLabProvider: Failed to delete lab (${res.status}): ${body}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error("ContainerLabProvider: delete failed: " + msg);
    }
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
    const listUrl = `${this.clab_apiUrl}api/v1/labs`;
    console.log("ContainerLabProvider: listing labs from " + listUrl);
    const response = await fetch(listUrl, {
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

  waitForServerAddresses(labNameOrId: string): Promise<string> {
    const provider = this.providerInstance;
    const maxWaitMs = 120_000; // 2 minutes
    const pollInterval = 2000;

    return new Promise(async (resolve, reject) => {
      try {
        await provider.getToken();
      } catch (e) {
        return reject(new Error("ContainerLabProvider: missing token for polling"));
      }
      const token = provider.clab_token?.token;
      if (!token) return reject(new Error("ContainerLabProvider: missing auth token"));

      const start = Date.now();

      const check = async () => {
        const statusUrl = `${provider.clab_apiUrl}api/v1/labs/${encodeURIComponent(labNameOrId)}`;
        try {
          const r = await fetch(statusUrl, {
            method: "GET",
            signal: AbortSignal.timeout(10_000),
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          });

          if (r.ok) {
            const data: any = await r.json().catch(() => ({}));
            // Iterate values and find first ipv4_address
            for (const val of Object.values(data || {})) {
              const entry = Array.isArray(val) ? val[0] : val;
              const ipv4 = entry?.ipv4_address;
              if (typeof ipv4 === "string" && ipv4.length) {
                return resolve(ipv4.split("/")[0]);
              }
            }
          } else if (r.status === 404) {
            return reject(new Error("ContainerLabProvider: lab not found"));
          }
        } catch (err) {
          // ignore transient errors and retry until timeout
        }

        if (Date.now() - start > maxWaitMs) {
          return reject(new Error("ContainerLabProvider: timeout waiting for IP addresses"));
        }
        setTimeout(check, pollInterval);
      };

      check();
    });
  }

  //waitForServerSSH(ip: string, port: number, timeout: number): Promise<void> {
  //
  //  return new Promise<void>(async () => {});
  //}

  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}