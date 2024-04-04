import {
  InstanceNotFoundErrorMessage,
  InstanceProvider,
  VMEndpoint,
} from "./Provider";
import { ToadScheduler, SimpleIntervalJob, AsyncTask } from "toad-scheduler";
import { Client } from "ssh2";
import Environment from "../Environment";
import proxmoxApi, { Proxmox, ProxmoxEngineOptions } from "proxmox-api";
import dns from "dns";
import fs from "fs";

const schedulerIntervalSeconds = 5 * 60;

// allow self signed cert
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

//TODO: possibly also support qemu instead of lxc

export default class ProxmoxProvider implements InstanceProvider {
  // Proxmox API
  private auth: ProxmoxEngineOptions;

  private proxmox: Proxmox.Api;

  // Proxmox Provider config
  private maxInstanceLifetimeMinutes: number;
  private vmSSHTimeoutSeconds = 30;

  private proxmoxTemplate: string;
  private proxmoxTargetHost: string;

  // SSH and LanguageServer Port config
  private sshPort: number;
  private lsPort: number;
  private sshJumpHostIPAddress: string;
  private sshJumpHostPort: number;
  private sshJumpHostDomain: string;
  private sshJumpHostUser: string;
  private sshJumpHostPassword: string | undefined;
  private sshJumpHostPrivateKey: string | undefined;

  private providerInstance: ProxmoxProvider;

  constructor() {
    this.auth = {
        host: process.env.PROXMOX_HOST ?? "localhost",
        tokenID: process.env.PROXMOX_TOKENID ?? "",
        tokenSecret: process.env.PROXMOX_TOKENSECRET ?? "",
    };

    this.proxmox = proxmoxApi(this.auth);

    this.proxmoxTemplate = process.env.PROXMOX_TEMPLATE ?? "";
    this.proxmoxTargetHost = process.env.PROXMOX_TARGET_HOST ?? "";
    this.sshJumpHostIPAddress = process.env.PROXMOX_SSH_JUMP_HOST ?? "";
    this.sshJumpHostPort = parseInt(process.env.PROXMOX_SSH_JUMP_HOST_PORT ?? "22");
    this.sshJumpHostUser = process.env.PROXMOX_SSH_JUMP_HOST_USER ?? "";
    this.sshJumpHostPassword = process.env.PROXMOX_SSH_JUMP_HOST_PASSWORD ?? "";
    this.sshJumpHostPrivateKey = process.env.PROXMOX_SSH_JUMP_HOST_KEY ?? undefined;
    this.sshJumpHostDomain = process.env.PROXMOX_SSH_JUMP_HOST_DOMAIN ?? "";

    // check for max instance lifetime
    const ENV_LIFETIME = process.env.PROXMOX_MAX_INSTANCE_LIFETIME_MINUTES;
    if (ENV_LIFETIME) {
      const parsedLifetime = parseInt(ENV_LIFETIME);

      if (!isNaN(parsedLifetime))
        this.maxInstanceLifetimeMinutes = parsedLifetime;
      else {
        console.log(
          "ProxmoxProvider: Provided instance lifetime cannot be parsed (PROXMOX_MAX_INSTANCE_LIFETIME_MINUTES).",
        );
        process.exit(1);
      }
    } else {
      console.log(
        "ProxmoxProvider: No instance lifetime provided (PROXMOX_MAX_INSTANCE_LIFETIME_MINUTES).",
      );
      process.exit(1);
    }

    this.providerInstance = this;

    // better use env var to allow configuration of port numbers?
    this.sshPort = 22;
    this.lsPort = 3005;

    const scheduler = new ToadScheduler();

    const task = new AsyncTask(
      "ProxmoxProvider Instance Pruning Task",
      () => {
        return this.pruneVMInstance();
      },
      (err: Error) => {
        console.log(
          "ProxmoxProvider: Could not prune stale VM instances..." +
            err.message,
        );
      },
    );
    const job = new SimpleIntervalJob(
      { seconds: schedulerIntervalSeconds, runImmediately: true },
      task,
    );

    scheduler.addSimpleIntervalJob(job);
  }

  async createServer(
    username: string,
    groupNumber: number,
    environment: string,
    proxmoxTemplate: string,
  ): Promise<VMEndpoint> {
    const providerInstance = this.providerInstance;
    const nodes = await this.proxmox.nodes.$get().catch((reason) => {
      const originalMessage =
        reason instanceof Error ? reason.message : "Unknown error";
      throw new Error(
        `ProxmoxProvider: Could not get nodes.\n` +
          originalMessage,
      );
    });

    // find node with least load
    let targetNode = nodes[0];
    if (this.proxmoxTargetHost !== "") {
      // find target node
      const foundNode = nodes.find((node) => node.node === this.proxmoxTargetHost);
      if (!foundNode) {
        throw new Error("Could not find target host.");
      } else {
        targetNode = foundNode;
      }
    } else {
      let targetNode = nodes[0];
      for (const node of nodes) {
          if ((node.cpu ?? 0) < (targetNode.cpu ?? 0)) {
              // possible alternative: mem / maxmem < leastLoadNode
              targetNode = node;
          }
      } 
    }

    // find node containing the template
    let templateNode = "";
    // if no template is provided, use default template
    if (!proxmoxTemplate) {
      proxmoxTemplate = this.proxmoxTemplate;
    }
    for (const node of nodes) {
        await this.proxmox.nodes.$(node.node).lxc.$(parseInt(proxmoxTemplate)).status.current.$get().then((current) => {
          if (current.tags?.split(";").find((tag) => tag === "learn-sdn-hub-template")) {
            templateNode = node.node;
          }
        }).catch(() => {
          // ignore the case that the template is not found on this node and continue with the next node
        });
        if (templateNode !== "") break;
    }
    if (templateNode === "") {
      throw new Error("Could not find template node.");
    }

    // create VM by cloning template
    const templateID = proxmoxTemplate ?? this.proxmoxTemplate;
    if (!templateID) {
      console.log("ProxmoxProvider: No template provided.");
      throw new Error("No template provided.");
    }
    const vmName = `${username}-${groupNumber}-${environment}`;
    // get next available VM ID
    const vmID = await this.proxmox.cluster.nextid.$get();
    await this.proxmox.nodes.$(templateNode).lxc.$(parseInt(templateID)).clone.$post({newid: vmID, hostname: vmName, pool: "learn-sdn-hub", target: targetNode.node}).catch((reason) => {
      const originalMessage =
        reason instanceof Error ? reason.message : "Unknown error";
      throw new Error(
        `ProxmoxProvider: Could not clone template (${templateID}) to new VM (${vmID}).\n` +
          originalMessage,
      );
    });

    // waiting for create lock to be released
    let vmIsLocked = true;
    let lockTimeout = 10;
    while (lockTimeout > 0 && vmIsLocked) {
      const current = await this.proxmox.nodes.$(targetNode.node).lxc.$(vmID).status.current.$get().catch((reason) => {
        const originalMessage =
          reason instanceof Error ? reason.message : "Unknown error";
        throw new Error(
          `ProxmoxProvider: Could not get current status of new VM (${vmID}).\n` +
            originalMessage,
        );
      });
      if (current.lock === "create") {
        await this.sleep(1000);
        lockTimeout--;
      } else {
        vmIsLocked = false;
        break;
      }
    }
  
    // add tag "learn-sdn-hub" to the VM
    await this.proxmox.nodes.$(targetNode.node).lxc.$(vmID).config.$put({tags: "learn-sdn-hub"}).catch((reason) => {
      const originalMessage =
        reason instanceof Error ? reason.message : "Unknown error";
      throw new Error(
        `ProxmoxProvider: Could not add tag to new VM (${vmID}).\n` +
          originalMessage,
      );
    });

    // start VM
    await this.proxmox.nodes.$(targetNode.node).lxc.$(vmID).status.start.$post().catch((reason) => {
      const originalMessage =
        reason instanceof Error ? reason.message : "Unknown error";
      throw new Error(
        `ProxmoxProvider: Could not start new VM (${vmID}).\n` +
          originalMessage,
      );
    });

    // get IP address
    const vmIPAddress = await this.resolveVMIPAddress(vmName);

    // wait for ssh
    const expirationDate = new Date(
      Date.now() + providerInstance.maxInstanceLifetimeMinutes * 60 * 1000,
    );
    console.log("ProxmoxProvider: Waiting for SSH to get ready on VM: " + vmID + " " + vmIPAddress);
    await providerInstance.waitForVMSSH(
      vmIPAddress,
      providerInstance.sshPort,
      providerInstance.vmSSHTimeoutSeconds,
    ).catch((reason) => {
      const originalMessage =
        reason instanceof Error ? reason.message : "Unknown error";
      return Promise.reject(
        new Error(
          `ProxmoxProvider: Could not wait for SSH connection to new VM (${vmID}).\n` +
            originalMessage,
        )
      );
    });

    console.log("ProxmoxProvider: VM SSH ready");
    const vmEndpoint = {
      instance: vmID.toString(),
      providerInstanceStatus:
        "Environment will be deleted at " + expirationDate.toLocaleString(),
      IPAddress: vmIPAddress,
      SSHPort: providerInstance.sshPort,
      SSHJumpHost: {
        ipaddress: this.sshJumpHostIPAddress,
        port: this.sshJumpHostPort,
        username: this.sshJumpHostUser,
        password: this.sshJumpHostPassword,
        privateKey: this.sshJumpHostPrivateKey,
      },
      LanguageServerPort: providerInstance.lsPort,
    };

    return vmEndpoint;  
  }

  private async resolveVMIPAddress(vmName: string) {
    let ipTimeout = 10;
    let vmIPAddress = "";
    while (ipTimeout > 0 && vmIPAddress === "") {
      dns.setServers([this.sshJumpHostIPAddress]);
      dns.resolve4(vmName + "." + this.sshJumpHostDomain, (err: NodeJS.ErrnoException | null, addresses: string[]) => {
        if (err) {
          // if not found, try again
          if (err.code !== "ENOTFOUND") {
            throw new Error("Could not get IP address of started VM. " + err.code + " " + err.message);
          }
        } else {
          if (addresses.length > 0) {
            vmIPAddress = addresses[0];
          }
        }
      });
      console.log("Could not get IP address of started VM, retrying...");
      await this.sleep(1000);
      ipTimeout--;
    }
    if (vmIPAddress === "") {
      throw new Error("Unable to get IP address of the started VM within timeout.");
    }
    return vmIPAddress;
  }

  async getServer(instance: string): Promise<VMEndpoint> {
    const providerInstance = this.providerInstance;
    console.log("ProxmoxProvider: Searching for VM: " + instance);

    // search for instance
    const nodes = await this.proxmox.nodes.$get().catch((reason) => {
      const originalMessage =
        reason instanceof Error ? reason.message : "Unknown error";
      throw new Error(
        `ProxmoxProvider: Could not get nodes.\n` +
          originalMessage,
      );
    });
    // find node containing the vm
    let vmHostname = "";
    for (const node of nodes) {
      await this.proxmox.nodes.$(node.node).lxc.$(parseInt(instance)).config.$get().then(async (vmConfig) => {
        if (vmConfig.tags?.split(";").find((tag) => tag === "learn-sdn-hub")) {
          await this.proxmox.nodes.$(node.node).lxc.$(parseInt(instance)).status.current.$get().then((current) => {
            if (current.status === "running") {
              vmHostname = vmConfig.hostname ?? "";
            }
          });
        }
      }).catch(() => {
        // ignore the case that the template is not found on this node and continue with the next node
      });
      if (vmHostname !== "") break;
    }
    if (vmHostname === "") {
      throw new Error(InstanceNotFoundErrorMessage);
    }

    console.log("ProxmoxProvider: VM found, hostname: " + vmHostname + " resolving IP address...");
    const vmIPAddress = await this.resolveVMIPAddress(vmHostname);
   
    // wait for ssh
    const expirationDate = new Date(
      Date.now() + providerInstance.maxInstanceLifetimeMinutes * 60 * 1000,
    );
    await providerInstance.waitForVMSSH(
      vmIPAddress,
      providerInstance.sshPort,
      providerInstance.vmSSHTimeoutSeconds,
    );
    console.log("ProxmoxProvider: VM SSH ready");
    const vmEndpoint: VMEndpoint = {
      instance: instance,
      providerInstanceStatus:
        "Environment will be deleted at " + expirationDate.toLocaleString(),
      IPAddress: vmIPAddress,
      SSHPort: providerInstance.sshPort,
      SSHJumpHost: {
        ipaddress: providerInstance.sshJumpHostIPAddress,
        port: providerInstance.sshJumpHostPort,
        username: providerInstance.sshJumpHostUser,
        password: providerInstance.sshJumpHostPassword,
        privateKey: providerInstance.sshJumpHostPrivateKey,
      },
      LanguageServerPort: providerInstance.lsPort,
    };

    return vmEndpoint;
  }

  async deleteServer(instance: string): Promise<void> {
    //const providerInstance = this.providerInstance;
    console.log("ProxmoxProvider: Deleting VM: " + instance);

    // search for instance
    const nodes = await this.proxmox.nodes.$get().catch((reason) => {
      const originalMessage =
        reason instanceof Error ? reason.message : "Unknown error";
      throw new Error(
        `ProxmoxProvider: Could not get nodes.\n` +
          originalMessage,
      );
    });
    // find node containing the vm
    let vmHostname = "";
    for (const node of nodes) {
        await this.proxmox.nodes.$(node.node).lxc.$(parseInt(instance)).config.$get().then(async (vmConfig) => {
          if (vmConfig.tags?.split(";").find((tag) => tag === "learn-sdn-hub")) {
            await this.proxmox.nodes.$(node.node).lxc.$(parseInt(instance)).status.current.$get().then(async (current) => {
              if (current.status === "running") {
                await this.proxmox.nodes.$(node.node).lxc.$(parseInt(instance)).status.stop.$post().then(async () => {
                  // wait for stop
                  let stopTimeout = 10;
                  while (stopTimeout > 0) {
                    const current = await this.proxmox.nodes.$(node.node).lxc.$(parseInt(instance)).status.current.$get();
                    if (current.status === "stopped") {
                      break;
                    }
                    await this.sleep(1000);
                    stopTimeout--;
                  }
                  if (stopTimeout === 0) {
                    throw new Error("Could not stop VM: " + instance);
                  }
                }).catch((reason) => {
                  const originalMessage =
                    reason instanceof Error ? reason.message : "Unknown error";
                  throw new Error(
                    `ProxmoxProvider: Could not stop VM (${instance}) during deletion.\n` +
                      originalMessage,
                  );
                });        

                // instance found
                vmHostname = vmConfig.hostname ?? "";

                console.log("Deleting VM: " + instance);

                await this.proxmox.nodes.$(node.node).lxc.$(parseInt(instance)).$delete().catch((reason) => {
                  const originalMessage =
                    reason instanceof Error ? reason.message : "Unknown error";
                  throw new Error(
                    `ProxmoxProvider: Could not delete VM (${parseInt(instance)}) during deletion.\n` +
                      originalMessage,
                  );
                });
              }
            });
          }
        }).catch(() => {
          // ignore the case that the template is not found on this node and continue with the next node
        });
        if (vmHostname !== "") break;
    }
    if (vmHostname === "") {
      throw new Error(InstanceNotFoundErrorMessage);
    }

    return Promise.resolve();
  }

  /**
   * Deletes all expired microVMs.
   */
  private async pruneVMInstance(): Promise<void> {
    const deadline = new Date(Date.now() - (this.maxInstanceLifetimeMinutes * 60 * 1000));

    console.log(
      "ProxmoxProvider: Pruning VM instances older than " +
        deadline.toISOString(),
    );

    // get all VMs with tag learn-sdn-hub on all nodes
    await this.proxmox.nodes.$get().then(async (nodes) => {
      for (const node of nodes) {
        await this.proxmox.nodes.$(node.node).lxc.$get().then(async (vms) => {
          for (const vm of vms) {
            await this.proxmox.nodes.$(node.node).lxc.$(vm.vmid).status.current.$get().then(async (current) => {
              if (current.tags?.split(";").find((tag) => tag === "learn-sdn-hub")) {
                if (((current.uptime ?? 0) > (this.maxInstanceLifetimeMinutes * 60))) {
                  // delete expired VM
                  console.log("Deleting expired VM: " + vm.vmid + " " + current.tags + " " + current.uptime);
                  // if (current.status === "running") {
                  //   await this.proxmox.nodes.$(node.node).lxc.$(vm.vmid).status.stop.$post().then(async () => {
                  //     // wait for stop
                  //     let stopTimeout = 10;
                  //     while (stopTimeout > 0) {
                  //       const current = await this.proxmox.nodes.$(node.node).lxc.$(vm.vmid).status.current.$get();
                  //       if (current.status === "stopped") {
                  //         break;
                  //       }
                  //       await this.sleep(1000);
                  //       stopTimeout--;
                  //     }
                  //     if (stopTimeout === 0) {
                  //       throw new Error("Could not stop VM: " + vm.vmid);
                  //     }
                  //     // TODO: deleteEnvironment
                  //   }).catch((reason) => {
                  //     const originalMessage =
                  //       reason instanceof Error ? reason.message : "Unknown error";
                  //     throw new Error(
                  //       `ProxmoxProvider: Could not stop expired VM (${vm.vmid}) during pruning.\n` +
                  //         originalMessage,
                  //     );
                  //   });
                  // }
                  // await this.proxmox.nodes.$(node.node).lxc.$(vm.vmid).$delete().catch((reason) => {
                  //   const originalMessage =
                  //     reason instanceof Error ? reason.message : "Unknown error";
                  //   throw new Error(
                  //     `ProxmoxProvider: Could not delete expired VM (${vm.vmid}) during pruning.\n` +
                  //       originalMessage,
                  //   );
                  // });
                  await Environment.deleteInstanceEnvironments(vm.vmid.toString()).catch(
                    (reason) => {
                      const originalMessage =
                        reason instanceof Error ? reason.message : "Unknown error";
                      throw new Error(
                        `ProxmoxProvider: Could not delete instance for expired microVM (${vm.vmid}) during pruning.\n` +
                          originalMessage,
                      );
                    },
                  );
                  console.log(
                    "ProxmoxProvider: deleted expired VM: " + vm.vmid
                  );
                  return;          
                };
              }
            }).catch((reason) => {
              const originalMessage =
                reason instanceof Error ? reason.message : "Unknown error";
              throw new Error(
                `ProxmoxProvider: Could not get current status of VM (${vm.vmid}) during pruning.\n` +
                  originalMessage,
              );
            });
          }
        }).catch((reason) => {
          const originalMessage =
            reason instanceof Error ? reason.message : "Unknown error";
          throw new Error(
            `ProxmoxProvider: Could not get VMs during pruning.\n` +
              originalMessage,
          );
        });
      }
    }).catch((reason) => {
      const originalMessage =
        reason instanceof Error ? reason.message : "Unknown error";
      throw new Error(
        `ProxmoxProvider: Could not get nodes during pruning.\n` +
          originalMessage,
      );
    });
   
    return Promise.resolve();
  }

  /**
   * Tries to connect via SSH to the given microVM.
   *
   * @param ip The ip address of the microVM.
   * @param port The SSH port of the microVM.
   * @param timeout The timeout for the SSH connection.
   * @returns A void promise.
   */
  private async waitForVMSSH(
    ip: string,
    port: number,
    timeout: number,
  ): Promise<void> {
    // simple connection test function
    const testConnection = () => {
      return new Promise<boolean>((resolve, reject) => {
        const sshJumpHostConnection = new Client();
        const sshConnection = new Client();

        sshJumpHostConnection.on("ready", () => {
          const wait = sshJumpHostConnection.forwardOut("127.0.0.1", 0, ip, port, (err, stream) => {
            if (err) {
              sshConnection.end();
              sshJumpHostConnection.end();
              reject(err);
            } else {
              sshConnection
              .on("ready", () => {
                sshConnection.end();
                sshJumpHostConnection.end();
                resolve(true);
              })
              .on("error", (err) => {
                sshConnection.end();
                sshJumpHostConnection.end();
                reject(err);
              }).connect({
                sock: stream,
                username: process.env.SSH_USERNAME,
                password: process.env.SSH_PASSWORD,
                readyTimeout: 1000,
              });
            }
            console.log("Forwarded connection: wait?: " + wait);
          });
        }).on("error", (err) => {
          sshConnection.end();
          sshJumpHostConnection.end();
          reject(err);
        }).connect({
          host: this.sshJumpHostIPAddress,
          port: this.sshJumpHostPort,
          username: this.sshJumpHostUser,
          password: this.sshJumpHostPassword,
          privateKey: this.sshJumpHostPrivateKey
            ? fs.readFileSync(this.sshJumpHostPrivateKey)
            : undefined,
          //debug: (debug) => {
          //  console.log(debug)
          //},
          readyTimeout: 1000,
        });
      });
    };

    const startTime = Date.now();
    let usedTime = 0;

    while (usedTime < timeout) {
      const connected = await testConnection().catch((reason) => {
        const originalMessage =
          reason instanceof Error ? reason.message : "Unknown error";

        console.log(
          "ProxmoxProvider: SSH connection failed - retrying...\n" +
            originalMessage,
        );

        return false;
      });

      if (connected) return;

      usedTime = Math.floor((Date.now() - startTime) / 1000);
      await this.sleep(1000);
    }

    throw new Error("ProxmoxProvider: Timed out waiting for SSH connection.");
  }

  sleep(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
