import {
  InstanceProvider,
  VMEndpoint,
  InstanceNotFoundErrorMessage,
} from "./Provider";
import Firecrackerode from "firecrackerode";
import { ToadScheduler, SimpleIntervalJob, AsyncTask } from "toad-scheduler";
import { Client } from "ssh2";
import Environment from "../Environment";
import fs from "fs/promises";
import { Netmask } from "netmask";
import { exec } from "child_process";

const schedulerIntervalSeconds = 5 * 60;

type microVMId = string;

interface microVMInstance {
  vmEndpoint: VMEndpoint;
  firecrackerodeInstance: Firecrackerode;
  expirationDate: Date;
  tapInterfaceId: string;
  username: string;
  groupNumber: number;
  environment: string;
}

export default class FirecrackerProvider implements InstanceProvider {
  private firecrackers: Map<microVMId, microVMInstance>;

  // Firecracker config
  private socketPathPrefix: string;
  private kernelImage: string;
  private kernelBootARGs: string;
  private rootFSDrive: string;

  // currently IPv4 only ;) what a shame ;)
  private networkCIDR: Netmask;
  private availableIpAddresses: Array<string>;
  private bridgeInterface: string;

  // Firecracker Provider config
  private maxInstanceLifetimeMinutes: number;
  private microVMSSHTimeoutSeconds = 60;

  // SSH and LanguageServer Port config
  private sshPort: number;
  private lsPort: number;

  private providerInstance: FirecrackerProvider;

  constructor() {
    this.socketPathPrefix = process.env.FIRECRACKER_SOCKET_PATH_PREFIX;
    this.kernelImage = process.env.FIRECRACKER_KERNEL_IMAGE;
    this.kernelBootARGs = process.env.FIRECRACKER_KERNEL_BOOT_ARGS;
    this.rootFSDrive = process.env.FIRECRACKER_ROOTFS_DRIVE;
    this.networkCIDR = new Netmask(process.env.FIRECRACKER_NETWORK_CIDR);
    this.bridgeInterface = process.env.FIRECRACKER_BRIDGE_INTERFACE;
    const bridgeInterfaceRegExp = new RegExp(/^[a-z0-9]+$/i);
    if (bridgeInterfaceRegExp.test(this.bridgeInterface) === false) {
      throw new Error(
        "Invalid FIRECRACKER_BRIDGE_INTERFACE. Needs to be an alphanumeric string."
      );
    }
    this.availableIpAddresses = new Array<string>();
    this.networkCIDR.forEach((ip) => {
      // reserve the first IP address for the host
      if (ip !== this.networkCIDR.first) this.availableIpAddresses.push(ip);
    });

    this.maxInstanceLifetimeMinutes = parseInt(
      process.env.FIRECRACKER_MAX_INSTANCE_LIFETIME_MINUTES
    );

    this.providerInstance = this;

    this.firecrackers = new Map<microVMId, microVMInstance>();

    // better use env var to allow configuration of port numbers?
    this.sshPort = 22;
    this.lsPort = 3005;

    const scheduler = new ToadScheduler();

    const task = new AsyncTask(
      "FirecrackerProvider Instance Pruning Task",
      () => {
        return this.pruneMicroVMInstance().then(() => {
          //console.log("FirecrackerProvider: Pruning finished...");
        });
      },
      (err: Error) => {
        console.log(
          "FirecrackerProvider: Could not prune stale microVM instances..." +
            err
        );
      }
    );
    const job = new SimpleIntervalJob(
      { seconds: schedulerIntervalSeconds, runImmediately: true },
      task
    );

    scheduler.addSimpleIntervalJob(job);
  }

  async createServer(
    username: string,
    groupNumber: number,
    environment: string,
    kernelImage?: string,
    rootFSDrive?: string
  ): Promise<VMEndpoint> {
    const providerInstance = this.providerInstance;
    const socketPath =
      this.socketPathPrefix + "_" + username + "-" + environment;

    return new Promise(async (resolve, reject) => {
      await fs.unlink(socketPath).catch(async (err) => {
        if ("ENOENT" !== err.code) {
          return reject(
            new Error(
              "FirecrackerProvider: Could not cleanup socketPath " + err
            )
          );
        }
        // if ENOENT, file does not exist as intended
      });
      const fi = new Firecrackerode({
        socketPath: socketPath,
      });

      const microVMKernelImage = kernelImage ?? providerInstance.kernelImage;
      const microVMKernelBootARGs =
        kernelImage ?? providerInstance.kernelBootARGs;
      const microVMRootFSDrive = rootFSDrive ?? providerInstance.rootFSDrive;

      const logFileName =
        "/tmp/firecracker.log" + "_" + username + "-" + environment;
      const logFileTime = new Date();

      await fs.unlink(socketPath).catch(async (err) => {
        if ("ENOENT" !== err.code) {
          return reject(
            new Error("FirecrackerProvider: Could not cleanup logFile " + err)
          );
        }
        // if ENOENT, file does not exist as intended
      });
      await fs
        .utimes(logFileName, logFileTime, logFileTime)
        .catch(async (err) => {
          if ("ENOENT" !== err.code) {
            return reject(
              new Error("FirecrackerProvider: Could not touch logfile " + err)
            );
          }
          // if ENOENT, file does not exist as intended, open and close it to update access time
          const fh = await fs.open(logFileName, "a");
          await fh.close();
        });

      // jailer is recommended for production
      await fi.spawn("/usr/bin/firecracker").then(async (process) => {
        console.log("Started new firecracker process " + process.pid);

        await fi
          .logger({
            log_path:
              "/tmp/firecracker.log" + "_" + username + "-" + environment,
            level: "debug",
            show_level: true,
            show_log_origin: true,
          })
          .then(async () => {
            await fi
              .machineConfig()
              .update({
                vcpu_count: 2,
                mem_size_mib: 2048,
              })
              .then(async () => {
                await fi
                  .bootSource({
                    kernel_image_path: microVMKernelImage,
                    boot_args: microVMKernelBootARGs,
                  })
                  .then(async () => {
                    const drive = fi.drive("rootfs");
                    await drive.updatePreboot({
                      drive_id: "rootfs",
                      path_on_host: microVMRootFSDrive,
                      is_root_device: true,
                      is_read_only: false,
                    });
                    // create tap dev on host
                    const microVMIPID = this.availableIpAddresses.length;
                    const microVMIPAddress = this.availableIpAddresses.pop();
                    const hexStringIP = microVMIPAddress
                      .split(".")
                      .map((value) =>
                        Number(value).toString(16).padStart(2, "0")
                      )
                      .join(":");
                    const microVMMACAddress =
                      "f6:" +
                      this.networkCIDR.bitmask.toString(16) +
                      ":" +
                      hexStringIP;
                    const iface_id = "net1";
                    const tap_id = "fctap" + microVMIPID;

                    // create tap interface and attach it to the bridge
                    exec(
                      "sudo ip tuntap add " +
                        tap_id +
                        " mode tap && sudo ip link set " +
                        tap_id +
                        " up && sudo brctl addif " +
                        this.bridgeInterface +
                        " " +
                        tap_id,
                      (error, stdout, stderr) => {
                        if (error) {
                          fi.kill();
                          return reject(
                            new Error(
                              "FirecrackerProvider: Unable to create TAP device." +
                                stderr +
                                " " +
                                stdout
                            )
                          );
                        }
                      }
                    );
                    // wait for tap dev to be setup
                    await providerInstance.sleep(1000);

                    const iface = fi.interface(iface_id);
                    // need to setup tap devices etc. on the host in advance
                    // fcnet-setup.sh or similar can be used in rootfs
                    //   expects mac with prefix f6:, rest of the address is used as
                    //   mask and ipv4 address in hex
                    await iface.create({
                      iface_id: iface_id,
                      guest_mac: microVMMACAddress,
                      host_dev_name: tap_id,
                    });
                    await fi.action("InstanceStart");
                    console.log("FirecrackerProvider: microVM started");
                    // wait for ssh
                    const expirationDate = new Date(
                      Date.now() +
                        providerInstance.maxInstanceLifetimeMinutes * 60 * 1000
                    );
                    providerInstance
                      .waitForServerSSH(
                        microVMIPAddress,
                        providerInstance.sshPort,
                        providerInstance.microVMSSHTimeoutSeconds
                      )
                      .then(() => {
                        console.log("FirecrackerProvider: microVM SSH ready");
                        const vmEndpoint = {
                          instance: microVMIPAddress,
                          providerInstanceStatus:
                            "Environment will be deleted at " +
                            expirationDate.toLocaleString(),
                          IPAddress: microVMIPAddress,
                          SSHPort: providerInstance.sshPort,
                          LanguageServerPort: providerInstance.lsPort,
                        };
                        this.firecrackers.set(microVMIPAddress, {
                          vmEndpoint: vmEndpoint,
                          firecrackerodeInstance: fi,
                          expirationDate: expirationDate,
                          tapInterfaceId: tap_id,
                          username: username,
                          groupNumber: groupNumber,
                          environment: environment,
                        });

                        return resolve(vmEndpoint);
                      })
                      .catch((err) => {
                        return reject(
                          new Error(
                            "FirecrackerProvider: Could not connect to microVM using SSH " +
                              err
                          )
                        );
                      });
                  })
                  .catch((err) => {
                    return reject(
                      new Error(
                        "FirecrackerProvider: Could not create interface: " +
                          err
                      )
                    );
                  })
                  .catch((err) => {
                    return reject(
                      new Error(
                        "FirecrackerProvider: Could not update preboot: " + err
                      )
                    );
                  })
                  .catch((err) => {
                    return reject(
                      new Error(
                        "FirecrackerProvider: Could not create bootSource: " +
                          err
                      )
                    );
                  });
              });
          });
      });
    });
  }

  async getServer(instance: string): Promise<VMEndpoint> {
    return new Promise((resolve, reject) => {
      const vmEndpoint = this.firecrackers.get(instance)?.vmEndpoint;
      if (vmEndpoint !== undefined) {
        return resolve(vmEndpoint);
      } else {
        return reject(new Error(InstanceNotFoundErrorMessage));
      }
    });
  }

  async deleteServer(instance: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const providerInstance = this.providerInstance;
      const fc = this.firecrackers.get(instance);
      const fi = fc?.firecrackerodeInstance;
      const vmEndpoint = this.firecrackers.get(instance)?.vmEndpoint;
      if (vmEndpoint !== undefined && fc !== undefined && fi !== undefined) {
        // wait for stop tasks to end
        await providerInstance.sleep(1000);
        if (fi.kill()) {
          // wait for process to be killed properly before deleting the tap dev
          await providerInstance.sleep(1000);

          // delete tap interface
          exec(
            "sudo brctl delif " +
              this.bridgeInterface +
              " " +
              fc.tapInterfaceId +
              " && sudo ip tuntap del " +
              fc.tapInterfaceId +
              " mode tap",
            (error, stdout, stderr) => {
              if (error) {
                return reject(
                  new Error(
                    "FirecrackerProvider: Unable to remove TAP device." +
                      stderr +
                      " " +
                      stdout
                  )
                );
              }
            }
          );
          this.availableIpAddresses.push(vmEndpoint.IPAddress);
          this.firecrackers.delete(instance);

          return resolve();
        } else {
          return reject(
            new Error(
              "FirecrackerProvider: Could not delete instance: " + instance
            )
          );
        }
      } else {
        return reject(new Error(InstanceNotFoundErrorMessage));
      }
    });
  }

  async pruneMicroVMInstance(): Promise<void> {
    console.log("FirecrackerProvider: Pruning stale microVM instances...");

    return new Promise((resolve, reject) => {
      // get microVMs older than timestamp
      const deadline = new Date(Date.now());
      console.log(
        "FirecrackerProvider: Pruning microVM instances older than " +
          deadline.toISOString()
      );
      this.firecrackers?.forEach((microVM, microVMId) => {
        if (microVM.expirationDate < deadline) {
          this.deleteServer(microVMId)
            .then(() => {
              console.log(
                "FirecrackerProvider: deleted expired microVM: " +
                  microVMId +
                  " expiration date: " +
                  microVM.expirationDate
              );
              Environment.deleteInstanceEnvironments(microVMId);
            })
            .catch((err) => {
              return reject(
                new Error(
                  "FirecrackerProvider: Could not delete expired instance during pruning: " +
                    microVMId +
                    " " +
                    err
                )
              );
            });
        }
      });
      return resolve();
    });
  }

  waitForServerSSH(ip: string, port: number, timeout: number): Promise<void> {
    const providerInstance = this.providerInstance;

    return new Promise<void>(async (resolve, reject) => {
      let resolved = false;
      // check ssh connection
      while (timeout > 0 && resolved === false) {
        const sshConn = new Client();
        sshConn
          .on("ready", () => {
            resolved = true;
            sshConn.end();
            return resolve();
          })
          .on("error", (err) => {
            sshConn.end();
            console.log(
              "FirecrackerProvider: SSH connection failed - retrying... " + err
            );
          })
          .connect({
            host: ip,
            port: port,
            username: process.env.SSH_USERNAME,
            password: process.env.SSH_PASSWORD,
            readyTimeout: 1000,
          });
        await providerInstance.sleep(1000);
        timeout -= 1;
      }
      if (!resolved)
        return reject(
          "FirecrackerProvider: Timed out waiting for SSH connection."
        );
    });
  }

  sleep(ms: number): Promise<unknown> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
