import {
  InstanceNotFoundErrorMessage,
  InstanceProvider,
  VMEndpoint,
} from "./Provider";
import { ToadScheduler, SimpleIntervalJob, AsyncTask } from "toad-scheduler";
import { Client } from "ssh2";
import Environment from "../Environment";
import proxmoxApi, { Proxmox, ProxmoxEngineOptions } from "proxmox-api";
import fs from "fs";
import { Netmask } from "netmask";

const schedulerIntervalSeconds = 5 * 60;

// certificate handling, if no valid certificates are used, NODE_EXTRA_CA_CERTS or
// NODE_TLS_REJECT_UNAUTHORIZED can be set to allow self-signed certificates
if (
  process.env.NODE_EXTRA_CA_CERTS === undefined &&
  process.env.NODE_TLS_REJECT_UNAUTHORIZED === undefined
) {
  console.warn(
    "\nWARNING: NODE_EXTRA_CA_CERTS is not set. \n" +
      "Please set NODE_EXTRA_CA_CERTS environment variable to provide the CA " +
      "certificate of your cluster, if you do not use a globally trusted " +
      "certificate. You can also set NODE_TLS_REJECT_UNAUTHORIZED=0 to allow " +
      "self-signed certificates, though this is risky. You can find the " +
      "'Proxmox Virtual Environment PVE Cluster Manager CA' in the node system" +
      "settings under Certificates.\n",
  );
}

//TODO: make timeouts configurable

//TODO: possibly also support qemu instead of lxc
enum proxmoxInstanceType {
  lxc,
  qemu,
  reservation,
}

interface proxmoxVMInstance {
  type: proxmoxInstanceType;
  vmid: number;
  name: string;
  deleteTimestamp: number;
}

export default class ProxmoxProvider implements InstanceProvider {
  // Proxmox API
  private auth: ProxmoxEngineOptions;

  private proxmox: Proxmox.Api;

  // Proxmox Provider config
  private maxInstanceLifetimeMinutes: number;
  private vmSSHTimeoutSeconds = 120;

  private proxmoxTemplateTag: string;
  private proxmoxTargetHost: string;

  // currently IPv4 only ;) what a shame ;)
  private networkCIDR: Netmask;
  private gatewayIP: string;

  // SSH and LanguageServer Port config
  private sshPort: number;
  private lsPort: number;
  private sshJumpHostIPAddress: string;
  private sshJumpHostPort: number;
  private sshJumpHostUser: string;
  private sshJumpHostPassword: string | undefined;
  private sshJumpHostPrivateKey: string | undefined;

  private static proxmoxVMInstances: Map<string, proxmoxVMInstance | undefined>;

  private providerInstance: ProxmoxProvider;

  private static semaphoreNextIPAddress = 0;
  private static semaphoreNextID = 0;

  constructor() {
    this.auth = {
      host: process.env.PROXMOX_HOST ?? "localhost",
      tokenID: process.env.PROXMOX_TOKENID ?? "",
      tokenSecret: process.env.PROXMOX_TOKENSECRET ?? "",
    };

    this.proxmox = proxmoxApi(this.auth);

    this.proxmoxTemplateTag = process.env.PROXMOX_TEMPLATE_TAG ?? "";

    this.proxmoxTargetHost = process.env.PROXMOX_TARGET_HOST ?? "";
    this.sshJumpHostIPAddress = process.env.PROXMOX_SSH_JUMP_HOST ?? "";
    this.sshJumpHostPort = parseInt(
      process.env.PROXMOX_SSH_JUMP_HOST_PORT ?? "22",
    );
    this.sshJumpHostUser = process.env.PROXMOX_SSH_JUMP_HOST_USER ?? "";
    this.sshJumpHostPassword = process.env.PROXMOX_SSH_JUMP_HOST_PASSWORD ?? "";
    this.sshJumpHostPrivateKey =
      process.env.PROXMOX_SSH_JUMP_HOST_KEY ?? undefined;

    // get all existing learn-sdn-hub VMs
    this.proxmox.nodes
      .$get()
      .then(async (nodes) => {
        for (const node of nodes) {
          await this.proxmox.nodes
            .$(node.node)
            .lxc.$get()
            .then(async (vms) => {
              for (const vm of vms) {
                await this.proxmox.nodes
                  .$(node.node)
                  .lxc.$(vm.vmid)
                  .status.current.$get()
                  .then(async (current) => {
                    // check if instance has a tag "learn-sdn-hub" and hence was created by this provider
                    if (
                      current.tags
                        ?.split(";")
                        .find((tag) => tag === "learn-sdn-hub")
                    ) {
                      // only stopped or running instances are valid instances
                      if (
                        current.status === "stopped" ||
                        current.status === "running"
                      ) {
                        await this.proxmox.nodes
                          .$(node.node)
                          .lxc.$(vm.vmid)
                          .config.$get()
                          .then((config) => {
                            const net0 = config.net0;
                            if (net0?.match(/,ip=(.*),/)) {
                              const ip = net0?.match(/,ip=(.*),/) ?? "";
                              const ipAddress = ip[1].split("/")[0];
                              ProxmoxProvider.proxmoxVMInstances.set(
                                ipAddress,
                                {
                                  type: proxmoxInstanceType.lxc,
                                  vmid: vm.vmid,
                                  name: vm.name ?? "",
                                  deleteTimestamp: 0,
                                },
                              );
                            }
                          });
                      } else {
                        throw new Error(
                          "ProxmoxProvider: found an existing VM: " +
                            vm.vmid +
                            " with an unknown status: " +
                            current.status,
                        );
                      }
                    }
                  })
                  .catch((error) => {
                    const originalMessage =
                      error instanceof Error ? error.message : "Unknown error";
                    // do not throw an error if node is temporarily unavailable, simply ignore shutdown nodes
                    if (
                      originalMessage.match(/595 No route to host/) ||
                      originalMessage.match(/595 Connection timed out/)
                    ) {
                      // ignore unreachable nodes, might be updating or temporarily shutdown, no need to look for VMs on them
                    } else {
                      throw new Error(
                        "ProxmoxProvider: unable to get current status of existing VM to prepopulate running instances: " +
                          vm.vmid +
                          " on " +
                          node.node +
                          "\n" +
                          originalMessage,
                      );
                    }
                  });
              }
            })
            .catch((error) => {
              const originalMessage =
                error instanceof Error ? error.message : "Unknown error";
              // do not throw an error if node is temporarily unavailable, simply ignore shutdown nodes
              if (
                originalMessage.match(/595 No route to host/) ||
                originalMessage.match(/595 Connection timed out/)
              ) {
                // ignore unreachable nodes, might be updating or temporarily shutdown, no need to look for VMs on them
              } else {
                throw new Error(
                  "ProxmoxProvider: unable to get current status of VMs on: " +
                    node.node +
                    "\n" +
                    originalMessage,
                );
              }
            });
        }
      })
      .catch((error) => {
        const originalMessage =
          error instanceof Error ? error.message : "Unknown error";
        // do not throw an error if node is temporarily unavailable, simply ignore shutdown nodes
        if (
          originalMessage.match(/595 No route to host/) ||
          originalMessage.match(/595 Connection timed out/)
        ) {
          // ignore unreachable nodes, might be updating or temporarily shutdown, no need to look for VMs on them
          console.log(
            "ProxmoxProvider: Node is temporarily unavailable, ignoring for now while getting all VMs.",
          );
        } else {
          throw new Error(
            "ProxmoxProvider: unable to get all existing VMs:\n" +
              originalMessage,
          );
        }
      });

    // check for network cidr
    const ENV_CIDR = process.env.PROXMOX_NETWORK_CIDR;
    if (ENV_CIDR) {
      try {
        this.networkCIDR = new Netmask(ENV_CIDR);
      } catch (error) {
        const originalMessage =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(
          "ProxmoxProvider: Network cidr address invalid (PROXMOX_NETWORK_CIDR).\n" +
            originalMessage,
        );
      }
    } else {
      throw new Error(
        "ProxmoxProvider: No network cidr provided (PROXMOX_NETWORK_CIDR).",
      );
    }

    const ENV_GATEWAYIP = process.env.PROXMOX_NETWORK_GATEWAY_IP;
    if (ENV_GATEWAYIP) {
      this.gatewayIP = ENV_GATEWAYIP;
    } else {
      throw new Error(
        "ProxmoxProvider: No network gateway provided (PROXMOX_NETWORK_GATEWAY_IP).",
      );
    }

    ProxmoxProvider.proxmoxVMInstances = new Map<string, proxmoxVMInstance>();
    this.networkCIDR.forEach((ip) => {
      // reserve the first and last IP address for the host
      if (ip !== this.gatewayIP)
        if (!ProxmoxProvider.proxmoxVMInstances.has(ip)) {
          ProxmoxProvider.proxmoxVMInstances.set(ip, undefined);
        }
    });

    // check for max instance lifetime
    const ENV_LIFETIME = process.env.PROXMOX_MAX_INSTANCE_LIFETIME_MINUTES;
    if (ENV_LIFETIME) {
      const parsedLifetime = parseInt(ENV_LIFETIME);

      if (!isNaN(parsedLifetime))
        this.maxInstanceLifetimeMinutes = parsedLifetime;
      else {
        console.error(
          "ProxmoxProvider: Provided instance lifetime cannot be parsed (PROXMOX_MAX_INSTANCE_LIFETIME_MINUTES).",
        );
        process.exit(1);
      }
    } else {
      console.error(
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
        console.error(
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

  getNextAvailableIPAddress(): string | undefined {
    for (const [key, value] of ProxmoxProvider.proxmoxVMInstances.entries()) {
      if (value === undefined) {
        // IP address was not used yet, it is available and can be used
        const reserved: proxmoxVMInstance = {
          type: proxmoxInstanceType.lxc,
          vmid: 0,
          name: "reserved",
          deleteTimestamp: 0,
        };
        ProxmoxProvider.proxmoxVMInstances.set(key, reserved);
        return key;
      } else {
        // typical ARP and NDP timeout is 60 seconds, wait at least 60 seconds before reusing the IP address
        if (
          value.deleteTimestamp > 0 &&
          value.deleteTimestamp + 60 * 1000 < Date.now()
        ) {
          //console.debug("Found IP address " + key + " from expired instance " + value.vmid + " at " + (new Date(value.deleteTimestamp)).toLocaleTimeString() + " now: " + new Date().toLocaleTimeString());
          // IP address was used but the instance is expired and can be reused
          const reserved: proxmoxVMInstance = {
            type: proxmoxInstanceType.lxc,
            vmid: 0,
            name: "reserved",
            deleteTimestamp: 0,
          };
          ProxmoxProvider.proxmoxVMInstances.set(key, reserved);
          return key;
        }
      }
    }
    return undefined;
  }

  async createServer(
    username: string,
    groupNumber: number,
    environment: string,
    options: {
      proxmoxTemplateTag?: string;
    },
  ): Promise<VMEndpoint> {
    let proxmoxTemplateTag = options.proxmoxTemplateTag;

    const providerInstance = this.providerInstance;
    const nodes = await this.proxmox.nodes.$get().catch((reason) => {
      const originalMessage =
        reason instanceof Error ? reason.message : "Unknown error";
      throw new Error(
        `ProxmoxProvider: Could not get nodes.\n` + originalMessage,
      );
    });

    let targetNode = undefined;
    if (this.proxmoxTargetHost !== "") {
      // find target node
      const foundNode = nodes.find(
        (node) => node.node === this.proxmoxTargetHost,
      );
      if (!foundNode) {
        throw new Error(
          "ProxmoxProvider: Could not find target host PROXMOX_TARGET_HOST " +
            this.proxmoxTargetHost +
            ".",
        );
      } else {
        targetNode = foundNode;
      }
    } else {
      // if target host is not already defined in env var, find node with least load
      let targetNode = nodes[0];
      for (const node of nodes) {
        if ((node.cpu ?? 0) < (targetNode.cpu ?? 0)) {
          // possible alternative: mem / maxmem < leastLoadNode
          targetNode = node;
        }
      }
    }
    if (targetNode === undefined) {
      throw new Error(
        "ProxmoxProvider: Could not find a suitable target node.",
      );
    }

    // if no template tag was provided in assignment config, use template tag from env var
    if (!proxmoxTemplateTag) {
      if (this.proxmoxTemplateTag !== "") {
        proxmoxTemplateTag = this.proxmoxTemplateTag;
      } else {
        throw new Error(
          "ProxmoxProvider: No template tag provided. Neither in assignment nor env var PROXMOX_TEMPLATE_TAG.",
        );
      }
    }

    // find the template
    let templateID: number | undefined = undefined;
    await this.proxmox.nodes
      .$(targetNode.node)
      .lxc.$get()
      .then(async (lxcs) => {
        for (const lxc of lxcs) {
          // check if the lxc has the desired tag
          if (lxc.tags?.split(";").find((tag) => tag === proxmoxTemplateTag)) {
            // check if the lxc is a template
            await this.proxmox.nodes
              .$(targetNode.node)
              .lxc.$(lxc.vmid)
              .config.$get()
              .then((config) => {
                if (config.template) {
                  templateID = lxc.vmid;
                }
              });
            // template found, no need to search further
            if (templateID !== undefined) {
              break;
            }
          }
        }
      })
      .catch(() => {
        // ignore the case that the template is not found on this node and continue with the next node
      });
    if (templateID === undefined) {
      throw new Error(
        `ProxmoxProvider: Could not find a template with tag (${proxmoxTemplateTag} on node ${targetNode.node}`,
      );
    }

    const vmName = `${username}-${groupNumber}-${environment}`;
    const vmHostname = vmName.replace(/[^a-zA-Z0-9-]/g, "");
    // get next available VM ID

    // ensure a unique ID even if multiple instances are created at the same time by using a semaphore
    while (ProxmoxProvider.semaphoreNextID > 0) {
      // wait for semaphore to be released
      await this.sleep(100);
    }
    ProxmoxProvider.semaphoreNextID++;
    // make sure that we get a number that was not already taken
    await this.sleep(100);
    const vmID = await this.proxmox.cluster.nextid.$get();
    // clones are linked clones by default, however, if storage backend does not support that full clones are used by proxmox
    // leading to longer delay for lxc creation, maybe introduce a config option for that
    let cloneFinished = false;
    let cloneTimeout = 300;
    while (!cloneFinished && cloneTimeout > 0) {
      await this.proxmox.nodes
        .$(targetNode.node)
        .lxc.$(parseInt(templateID))
        .clone.$post({
          newid: vmID,
          hostname: vmHostname,
          pool: "learn-sdn-hub",
          target: targetNode.node,
          full: false,
        })
        .then(async () => {
          await this.sleep(100);
          ProxmoxProvider.semaphoreNextID--;
          cloneFinished = true;
        })
        .catch(async (reason) => {
          await this.sleep(100);
          ProxmoxProvider.semaphoreNextID--;
          const originalMessage =
            reason instanceof Error ? reason.message : "Unknown error";
          if (
            originalMessage.match(/500 CT is locked/) ||
            originalMessage.match(
              /500 Linked clone feature for (.*) is not available/,
            )
          ) {
            // template is currently locked, wait a bit and try again
            await this.sleep(1000);
            cloneTimeout--;
            if (cloneTimeout === 0) {
              throw new Error(
                `ProxmoxProvider: Timeout waiting for template (${templateID}) to be unlocked for cloning.\n` +
                  originalMessage,
              );
            }
          } else {
            throw new Error(
              `ProxmoxProvider: Could not clone template (${templateID}) to new VM (${vmID}).\n` +
                originalMessage,
            );
          }
        });
    }

    // waiting for create lock to be released
    let vmIsLocked = true;
    // depending on the size of the template, this can take a while and we need to ensure the lock is released
    // before we can set the IP address
    let lockTimeout = 300;
    while (lockTimeout > 0 && vmIsLocked) {
      const current = await this.proxmox.nodes
        .$(targetNode.node)
        .lxc.$(vmID)
        .status.current.$get()
        .catch((reason) => {
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
        if (lockTimeout === 0) {
          throw new Error(
            "ProxmoxProvider: Timeout waiting for create lock of new VM: " +
              vmID,
          );
        }
      } else {
        vmIsLocked = false;
        break;
      }
    }

    // set IP address for the VM
    // ensure a unique ID even if multiple instances are created at the same time by using a semaphore
    while (ProxmoxProvider.semaphoreNextIPAddress > 0) {
      // wait for semaphore to be released
      await this.sleep(100);
    }
    ProxmoxProvider.semaphoreNextIPAddress++;
    const vmIPAddress = this.getNextAvailableIPAddress();
    await this.sleep(100);
    ProxmoxProvider.semaphoreNextIPAddress--;
    if (!vmIPAddress)
      throw new Error("ProxmoxProvider: No IP address available.");

    const config = await this.proxmox.nodes
      .$(targetNode.node)
      .lxc.$(vmID)
      .config.$get()
      .catch((reason) => {
        const originalMessage =
          reason instanceof Error ? reason.message : "Unknown error";
        throw new Error(
          `ProxmoxProvider: Could not get config of new VM (${vmID}).\n` +
            originalMessage,
        );
      });

    let new_net0 = config.net0;
    if (new_net0?.match(/ip=(?:[0-9]{1,3}\.){3}[0-9]{1,3}\/[0-9]*/)) {
      new_net0 = new_net0?.replace(
        /ip=(?:[0-9]{1,3}\.){3}[0-9]{1,3}\/[0-9]*/,
        "ip=" + vmIPAddress + "/" + this.networkCIDR.bitmask,
      );
    } else if (new_net0?.match(/ip=dhcp/)) {
      new_net0 = new_net0?.replace(
        /ip=dhcp/,
        "ip=" + vmIPAddress + "/" + this.networkCIDR.bitmask,
      );
    } else {
      new_net0 =
        new_net0 + ",ip=" + vmIPAddress + "/" + this.networkCIDR.bitmask;
    }
    if (new_net0?.match(/gw=(?:[0-9]{1,3}\.){3}[0-9]{1,3}/)) {
      new_net0 = new_net0?.replace(
        /gw=(?:[0-9]{1,3}\.){3}[0-9]{1,3}/,
        "gw=" + this.gatewayIP,
      );
    } else {
      new_net0 = new_net0 + ",gw=" + this.gatewayIP;
    }
    //console.debug("Changing net0 config from " + config.net0 + " to " + new_net0);

    await this.proxmox.nodes
      .$(targetNode.node)
      .lxc.$(vmID)
      .config.$put({ net0: new_net0 })
      .catch((reason) => {
        const originalMessage =
          reason instanceof Error ? reason.message : "Unknown error";
        throw new Error(
          `ProxmoxProvider: Could not set IP address of new VM (${vmID}).\n` +
            originalMessage,
        );
      });

    // add tag "learn-sdn-hub" to the VM
    await this.proxmox.nodes
      .$(targetNode.node)
      .lxc.$(vmID)
      .config.$put({ tags: "learn-sdn-hub" })
      .catch((reason) => {
        const originalMessage =
          reason instanceof Error ? reason.message : "Unknown error";
        throw new Error(
          `ProxmoxProvider: Could not add tag to new VM (${vmID}).\n` +
            originalMessage,
        );
      });

    // start VM
    await this.proxmox.nodes
      .$(targetNode.node)
      .lxc.$(vmID)
      .status.start.$post()
      .catch((reason) => {
        const originalMessage =
          reason instanceof Error ? reason.message : "Unknown error";
        throw new Error(
          `ProxmoxProvider: Could not start new VM (${vmID}).\n` +
            originalMessage,
        );
      });

    // wait for ssh
    const expirationDate = new Date(
      Date.now() + providerInstance.maxInstanceLifetimeMinutes * 60 * 1000,
    );
    console.info(
      "ProxmoxProvider: Waiting for SSH to get ready on VM: " +
        vmID +
        " " +
        vmIPAddress,
    );
    await providerInstance
      .waitForVMSSH(
        vmIPAddress,
        providerInstance.sshPort,
        providerInstance.vmSSHTimeoutSeconds,
      )
      .catch((reason) => {
        const originalMessage =
          reason instanceof Error ? reason.message : "Unknown error";
        return Promise.reject(
          new Error(
            `ProxmoxProvider: Could not wait for SSH connection to new VM (${vmID}).\n` +
              originalMessage,
          ),
        );
      });

    console.info("ProxmoxProvider: VM SSH ready");

    ProxmoxProvider.proxmoxVMInstances.set(vmIPAddress, {
      type: proxmoxInstanceType.lxc,
      vmid: vmID,
      name: vmName ?? "",
      deleteTimestamp: 0,
    });
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

  async getServer(instance: string): Promise<VMEndpoint> {
    const providerInstance = this.providerInstance;
    //console.debug("ProxmoxProvider: Searching for VM: " + instance);

    // search for instance
    const nodes = await this.proxmox.nodes.$get().catch((reason) => {
      const originalMessage =
        reason instanceof Error ? reason.message : "Unknown error";
      throw new Error(
        `ProxmoxProvider: Could not get nodes.\n` + originalMessage,
      );
    });
    // find node containing the vm
    let vmHostname = "";
    let vmIPAddress = "";
    let vmUptime = 0;
    for (const node of nodes) {
      await this.proxmox.nodes
        .$(node.node)
        .lxc.$(parseInt(instance))
        .config.$get()
        .then(async (vmConfig) => {
          if (
            vmConfig.tags?.split(";").find((tag) => tag === "learn-sdn-hub")
          ) {
            await this.proxmox.nodes
              .$(node.node)
              .lxc.$(parseInt(instance))
              .status.current.$get()
              .then((current) => {
                if (current.status === "running") {
                  vmHostname = vmConfig.hostname ?? "";
                  vmUptime = current.uptime ?? 0;
                  const ipAddress = vmConfig.net0?.match(/,ip=(.*)\/(.*),/);
                  if (ipAddress) {
                    vmIPAddress = ipAddress[1];
                  }
                }
              });
          }
        })
        .catch(() => {
          // ignore the case that the vm is not found on this node and continue with the next node
        });
      if (vmHostname !== "") break;
    }
    if (vmHostname === "" || vmIPAddress === "") {
      throw new Error(InstanceNotFoundErrorMessage);
    }

    console.info(
      "ProxmoxProvider: VM found, hostname: " +
        vmHostname +
        " IP: " +
        vmIPAddress,
    );

    const expirationDate = new Date(
      Date.now() +
        providerInstance.maxInstanceLifetimeMinutes * 60 * 1000 -
        vmUptime * 1000,
    );
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
    console.info("ProxmoxProvider: Deleting VM: " + instance);

    // search for instance
    const nodes = await this.proxmox.nodes.$get().catch((reason) => {
      const originalMessage =
        reason instanceof Error ? reason.message : "Unknown error";
      throw new Error(
        `ProxmoxProvider: Could not get nodes.\n` + originalMessage,
      );
    });
    // find node containing the vm
    let vmHostname = "";
    let vmNode = "";
    let vmIPAddress = "";
    for (const node of nodes) {
      await this.proxmox.nodes
        .$(node.node)
        .lxc.$(parseInt(instance))
        .config.$get()
        .then(async (vmConfig) => {
          const ipAddress = vmConfig.net0?.match(/,ip=(.*)\/(.*),/);
          if (ipAddress) {
            vmIPAddress = ipAddress[1];
          }
          if (
            vmConfig.tags?.split(";").find((tag) => tag === "learn-sdn-hub")
          ) {
            await this.proxmox.nodes
              .$(node.node)
              .lxc.$(parseInt(instance))
              .status.current.$get()
              .then(async (current) => {
                if (current.status === "running") {
                  await this.proxmox.nodes
                    .$(node.node)
                    .lxc.$(parseInt(instance))
                    .status.stop.$post()
                    .then(async () => {
                      // wait for stop
                      let stopTimeout = 10;
                      while (stopTimeout > 0) {
                        const current = await this.proxmox.nodes
                          .$(node.node)
                          .lxc.$(parseInt(instance))
                          .status.current.$get();
                        if (current.status === "stopped") {
                          vmHostname = vmConfig.hostname ?? "";
                          vmNode = node.node;
                          break;
                        }
                        await this.sleep(1000);
                        stopTimeout--;
                      }
                      if (stopTimeout === 0) {
                        throw new Error(
                          "ProxmoxProvider: Could not stop VM: " + instance,
                        );
                      }
                    })
                    .catch((reason) => {
                      const originalMessage =
                        reason instanceof Error
                          ? reason.message
                          : "Unknown error";
                      throw new Error(
                        `ProxmoxProvider: Could not stop VM (${instance}) during deletion.\n` +
                          originalMessage,
                      );
                    })
                    .catch((reason) => {
                      const originalMessage =
                        reason instanceof Error
                          ? reason.message
                          : "Unknown error" + reason;
                      // do not throw error here, as node can be unavailable
                      console.error(
                        `ProxmoxProvider: Could not access VM (${instance}) on node (${node.node}) during deletion.\n` +
                          originalMessage,
                      );
                    });
                } else if (current.status === "stopped") {
                  // instance found
                  vmHostname = vmConfig.hostname ?? "";
                  vmNode = node.node;
                } else {
                  throw new Error(
                    "ProxMox provider found VM " +
                      instance +
                      " to delete but state is neither running nor stopped.",
                  );
                }
              });
          }
        })
        .catch((error: Error) => {
          if (
            error.message.match(/500 Configuration file (.*) does not exist/)
          ) {
            // ignore the case that the instance is not found on this node and continue with the next node
            //console.debug("Instance " + instance + " not found on node " + node.node);
          } else if (
            error.message.match(/595 No route to host/) ||
            error.message.match(/595 Connection timed out/)
          ) {
            // ignore unreachable nodes, might be updating or temporarily shutdown, no need to look for VMs on them
          } else {
            throw new Error(
              "ProxMox provider was unable to delete VM " +
                instance +
                ". " +
                error.message,
            );
          }
        });
      // if instance was found, break
      if (vmHostname !== "") break;
    }
    if (vmHostname === "" || vmNode === "") {
      throw new Error(InstanceNotFoundErrorMessage);
    }

    //console.debug("Deleting VM: " + instance);

    await this.proxmox.nodes
      .$(vmNode)
      .lxc.$(parseInt(instance))
      .$delete()
      .catch((reason) => {
        const originalMessage =
          reason instanceof Error ? reason.message : "Unknown error";
        throw new Error(
          `ProxmoxProvider: Could not delete VM (${parseInt(instance)}) during deletion.\n` +
            originalMessage,
        );
      });

    // wait for delete to finish
    let deleteTimeout = 300;
    let vmDeleted = false;
    while (deleteTimeout > 0 && !vmDeleted) {
      await this.proxmox.nodes
        .$(vmNode)
        .lxc.$(parseInt(instance))
        .$get()
        .catch((reason) => {
          const originalMessage =
            reason instanceof Error ? reason.message : "Unknown error";

          if (
            originalMessage.match(/500 Configuration file (.*) does not exist/)
          ) {
            vmDeleted = true;
          }
        });
      if (!vmDeleted) {
        await this.sleep(1000);
        deleteTimeout--;
      }
    }
    if (deleteTimeout === 0) {
      throw new Error("ProxmoxProvider: Could not delete VM: " + instance);
    }

    const proxmoxVMInstance =
      ProxmoxProvider.proxmoxVMInstances.get(vmIPAddress);
    if (proxmoxVMInstance) {
      proxmoxVMInstance.deleteTimestamp = Date.now();
    }
    ProxmoxProvider.proxmoxVMInstances.set(vmIPAddress, proxmoxVMInstance);

    //console.debug("Deleted VM: " + instance);

    return Promise.resolve();
  }

  /**
   * Deletes all expired instances.
   */
  private async pruneVMInstance(): Promise<void> {
    const deadline = new Date(
      Date.now() - this.maxInstanceLifetimeMinutes * 60 * 1000,
    );

    console.log(
      "ProxmoxProvider: Pruning VM instances older than " +
        deadline.toISOString(),
    );

    // get all VMs with tag learn-sdn-hub on all nodes
    await this.proxmox.nodes
      .$get()
      .then(async (nodes) => {
        for (const node of nodes) {
          await this.proxmox.nodes
            .$(node.node)
            .lxc.$get()
            .then(async (vms) => {
              for (const vm of vms) {
                await this.proxmox.nodes
                  .$(node.node)
                  .lxc.$(vm.vmid)
                  .status.current.$get()
                  .then(async (current) => {
                    if (
                      current.tags
                        ?.split(";")
                        .find((tag) => tag === "learn-sdn-hub")
                    ) {
                      if (
                        current.status === "stopped" ||
                        (current.status === "running" &&
                          (current.uptime ?? 0) >
                            this.maxInstanceLifetimeMinutes * 60)
                      ) {
                        // delete expired VM
                        //console.log("ProxmoxProvider: Deleting expired VM: " + vm.vmid);
                        const instanceEnvironmentFound =
                          await Environment.deleteInstanceEnvironments(
                            vm.vmid.toString(),
                          ).catch((reason) => {
                            const originalMessage =
                              reason instanceof Error
                                ? reason.message
                                : "Unknown error";
                            throw new Error(
                              `ProxmoxProvider: Could not delete instance for expired VM (${vm.vmid}) during pruning.\n` +
                                originalMessage,
                            );
                          });
                        if (!instanceEnvironmentFound) {
                          // no environment found for instance, ensuring instance is deleted
                          await this.deleteServer(vm.vmid.toString());
                        }
                        console.log(
                          "ProxmoxProvider: deleted expired VM: " + vm.vmid,
                        );
                      }
                    }
                  })
                  .catch((reason) => {
                    const originalMessage =
                      reason instanceof Error
                        ? reason.message
                        : "Unknown error";
                    throw new Error(
                      `ProxmoxProvider: Could not get current status of VM (${vm.vmid}) during pruning.\n` +
                        originalMessage,
                    );
                  });
              }
            })
            .catch((reason) => {
              const originalMessage =
                reason instanceof Error ? reason.message : "Unknown error";
              // do not throw error here, as nodes can be temporarily unavailable
              if (
                originalMessage.match(/595 No route to host/) ||
                originalMessage.match(/595 Connection timed out/)
              ) {
                // ignore unreachable nodes, might be updating or temporarily shutdown, no need to look for VMs on them
              } else {
                console.log(
                  `ProxmoxProvider: Could not get VMs during pruning.\n` +
                    originalMessage,
                );
              }
            });
        }
      })
      .catch((reason) => {
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
   * Tries to connect via SSH to the given VM.
   *
   * @param ip The ip address of the VM.
   * @param port The SSH port of the VM.
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

        sshJumpHostConnection
          .on("ready", () => {
            //console.log(
            //  "ProxmoxProvider: SSH jump host connection ready. Trying to forward and connect to instance.",
            //);

            sshJumpHostConnection.exec(
              "nc -w 1 " + ip + " " + port,
              (err, stream) => {
                if (err) {
                  console.error(
                    "ProxmoxProvider: SSH connection forward failed. " +
                      err.message,
                  );
                  stream.end();
                  sshConnection.end();
                  sshJumpHostConnection.end();
                  reject(err);
                } else {
                  sshConnection
                    .on("ready", () => {
                      //console.debug(
                      //  "ProxmoxProvider: SSH instance connection ready.",
                      //);
                      stream.end();
                      sshConnection.end();
                      sshJumpHostConnection.end();
                      resolve(true);
                    })
                    .on("close", () => {
                      //console.debug(
                      //  "ProxmoxProvider: SSH instance connection closed. Had error: " +
                      //    hadError,
                      //);
                      stream.end();
                      sshConnection.end();
                      sshJumpHostConnection.end();
                    })
                    .on("error", (err) => {
                      console.error(
                        "ProxmoxProvider: SSH instance connection error. " +
                          err.message,
                      );
                      stream.end();
                      sshConnection.end();
                      sshJumpHostConnection.end();
                      reject(err);
                    })
                    .connect({
                      sock: stream,
                      username: process.env.SSH_USERNAME,
                      password: process.env.SSH_PASSWORD,
                      privateKey: process.env.SSH_PRIVATE_KEY_PATH
                        ? fs.readFileSync(process.env.SSH_PRIVATE_KEY_PATH)
                        : undefined,
                      readyTimeout: 1000,
                      //debug: (debug) => {
                      //  console.log(debug)
                      //},
                    });
                }
              },
            );
          })
          .on("error", (err) => {
            console.error(
              "ProxmoxProvider: SSH jump host connection error. " + err.message,
            );
            sshConnection.end();
            sshJumpHostConnection.end();
            reject(err);
          })
          .connect({
            host: this.sshJumpHostIPAddress,
            port: this.sshJumpHostPort,
            username: this.sshJumpHostUser,
            password: this.sshJumpHostPassword,
            privateKey: this.sshJumpHostPrivateKey
              ? fs.readFileSync(this.sshJumpHostPrivateKey)
              : undefined,
            readyTimeout: 1000,
            //debug: (debug) => {
            //  console.debug(debug)
            //},
          });
      });
    };

    const startTime = Date.now();
    let usedTime = 0;

    while (usedTime < timeout) {
      const connected = await testConnection().catch(() => {
        //const originalMessage =
        //  reason instanceof Error ? reason.message : "Unknown error";

        //console.debug(
        //  "ProxmoxProvider: SSH connection failed - retrying...\n" +
        //    originalMessage,
        //);

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
