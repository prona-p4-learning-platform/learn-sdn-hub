import {
  InstanceProvider,
  VMEndpoint,
  InstanceNotFoundErrorMessage,
} from "./Provider";
import axios, { AxiosInstance } from "axios";
import { ToadScheduler, SimpleIntervalJob, AsyncTask } from "toad-scheduler";
import { Client } from "ssh2";
import Environment from "../Environment";
import fs from "fs/promises";
import { Netmask } from "netmask";
import { ChildProcess, exec, spawn } from "child_process";

const defaultAxiosTimeout = 30000;
const schedulerIntervalSeconds = 5 * 60;

type microVMId = string;

interface FirecrackerLogger {
  log_path: string;
  level?: string;
  show_level?: boolean;
  show_log_origin?: boolean;
}

interface FirecrackerMachineConfig {
  vcpu_count: number;
  mem_size_mib: number;
  ht_enabled?: boolean;
  track_dirty_pages?: boolean;
  smt?: boolean;
  cpu_template?: "T2" | "T2S" | "T2CL" | "T2A" | "V1N1" | "None";
}

interface FirecrackerBalloonMemory {
  amount_mib: number;
  deflate_on_oom: boolean;
  stats_polling_interval_s: number;
}

interface FirecrackerBootSource {
  kernel_image_path: string;
  boot_args: string;
}

interface FirecrackerDrive {
  drive_id: string;
  path_on_host: string;
  is_root_device: boolean;
  is_read_only: boolean;
}

interface FirecrackerNetworkInterface {
  iface_id: string;
  host_dev_name: string;
  guest_mac?: string;
  //rx_rate_limiter?: RateLimiter
  //tx_rate_limiter?: RateLimiter;
}

interface FirecrackerActionState {
  state: string;
}

class microVMInstance {
  vmEndpoint: VMEndpoint;
  expirationDate: Date;
  tapInterfaceId: string;
  username: string;
  groupNumber: number;
  environment: string;
  process: ChildProcess;
}

class microVM {
  binPath: string;
  socketPath: string;
  axiosInstance: AxiosInstance;
  baseURL: string;
  microVMInstance: microVMInstance;

  constructor(binPath: string, socketPath: string) {
    this.binPath = binPath;
    this.socketPath = socketPath;

    this.axiosInstance = axios.create({
      timeout: defaultAxiosTimeout,
      socketPath: socketPath,
    });
    this.axiosInstance.defaults.headers.common["Accept"] = "application/json";
    this.axiosInstance.defaults.headers.common["Content-Type"] =
      "application/json";
    this.baseURL = "http://localhost";

    this.microVMInstance = new microVMInstance();
  }

  spawn(): Promise<ChildProcess> {
    return new Promise((resolve, reject) => {
      try {
        this.microVMInstance.process = spawn(
          this.binPath,
          ["--api-sock", this.socketPath],
          {
            detached: true,
          }
        );
      } catch (err) {
        return reject(
          new Error("FirecrackerProvider: Could not spawn firecracker process")
        );
      }

      this.microVMInstance.process.on("exit", async function () {
        await fs.unlink(this.socketPath).catch(async (err) => {
          // if ENOENT, file does not exist as intended
          if ("ENOENT" !== err.code) {
            return reject(
              new Error(
                "FirecrackerProvider: Could not cleanup socketPath " + err
              )
            );
          }
        });
      });

      this.microVMInstance.process.on("close", async function () {
        await fs.unlink(this.socketPath).catch(async (err) => {
          // if ENOENT, file does not exist as intended
          if ("ENOENT" !== err.code) {
            return reject(
              new Error(
                "FirecrackerProvider: Could not cleanup socketPath " + err
              )
            );
          }
        });
      });

      this.microVMInstance.process.on("error", async function () {
        await fs.unlink(this.socketPath).catch(async (err) => {
          if ("ENOENT" !== err.code) {
            return reject(
              new Error(
                "FirecrackerProvider: Could not cleanup socketPath " + err
              )
            );
          }
          // if ENOENT, file does not exist as intended
        });
      });

      resolve(this.microVMInstance.process);
    });
  }

  kill(): boolean {
    return this.microVMInstance.process.kill();
  }

  async setLogger(data: FirecrackerLogger): Promise<FirecrackerLogger> {
    return new Promise((resolve, reject) => {
      this.axiosInstance
        .put(this.baseURL + "/logger", data)
        .then((response) => {
          resolve(response.data);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  async setMachineConfig(
    data: FirecrackerMachineConfig
  ): Promise<FirecrackerMachineConfig> {
    return new Promise((resolve, reject) => {
      this.axiosInstance
        .put(this.baseURL + "/machine-config", data)
        .then((response) => {
          resolve(response.data);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  async setBalloonMemory(
    data: FirecrackerBalloonMemory
  ): Promise<FirecrackerBalloonMemory> {
    return new Promise((resolve, reject) => {
      this.axiosInstance
        .put(this.baseURL + "/balloon", data)
        .then((response) => {
          resolve(response.data);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  async setBootSource(
    data: FirecrackerBootSource
  ): Promise<FirecrackerBootSource> {
    return new Promise((resolve, reject) => {
      this.axiosInstance
        .put(this.baseURL + "/boot-source", data)
        .then((response) => {
          resolve(response.data);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  async addDrive(
    driveId: string,
    data: FirecrackerDrive
  ): Promise<FirecrackerDrive> {
    return new Promise((resolve, reject) => {
      this.axiosInstance
        .put(this.baseURL + "/drives/" + driveId, data)
        .then((response) => {
          resolve(response.data);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  async addNetworkInterface(
    ifId: string,
    data: FirecrackerNetworkInterface
  ): Promise<FirecrackerNetworkInterface> {
    return new Promise((resolve, reject) => {
      this.axiosInstance
        .put(this.baseURL + "/network-interfaces/" + ifId, data)
        .then((response) => {
          resolve(response.data);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  async invokeAction(actionType: string): Promise<FirecrackerActionState> {
    return new Promise((resolve, reject) => {
      this.axiosInstance
        .put(this.baseURL + "/actions", { action_type: actionType })
        .then((response) => {
          resolve(response.data);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }
}

export default class FirecrackerProvider implements InstanceProvider {
  private firecrackers: Map<microVMId, microVMInstance>;

  // Firecracker config
  private binPath: string;
  private socketPathPrefix: string;
  private kernelImage: string;
  private kernelBootARGs: string;
  private rootFSDrive: string;
  private vcpuCount: number;
  private memSizeMiB: number;
  private memBalloonSizeMiB: number;

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
    this.binPath = process.env.FIRECRACKER_BIN_PATH ?? "/usr/bin/firecracker";
    this.socketPathPrefix = process.env.FIRECRACKER_SOCKET_PATH_PREFIX;
    this.kernelImage = process.env.FIRECRACKER_KERNEL_IMAGE;
    this.kernelBootARGs = process.env.FIRECRACKER_KERNEL_BOOT_ARGS;
    this.rootFSDrive = process.env.FIRECRACKER_ROOTFS_DRIVE;
    this.networkCIDR = new Netmask(process.env.FIRECRACKER_NETWORK_CIDR);
    this.bridgeInterface = process.env.FIRECRACKER_BRIDGE_INTERFACE;
    this.vcpuCount = parseInt(process.env.FIRECRACKER_VCPU_COUNT ?? "2");
    this.memSizeMiB = parseInt(process.env.FIRECRACKER_MEM_SIZE_MIB ?? "2048");
    this.memBalloonSizeMiB = parseInt(
      process.env.FIRECRACKER_MEM_BALLOON_SIZE_MIB ??
        new Number(this.memSizeMiB - 512).toString()
    );

    const bridgeInterfaceRegExp = new RegExp(/^[a-z0-9]+$/i);
    if (bridgeInterfaceRegExp.test(this.bridgeInterface) === false) {
      throw new Error(
        "Invalid FIRECRACKER_BRIDGE_INTERFACE. Needs to be an alphanumeric string."
      );
    }
    this.availableIpAddresses = new Array<string>();
    this.networkCIDR.forEach((ip) => {
      // reserve the first and last IP address for the host
      if (ip !== this.networkCIDR.first && ip !== this.networkCIDR.last)
        this.availableIpAddresses.push(ip);
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
      const mv = new microVM(this.binPath, socketPath);
      await mv.spawn().then(async (process) => {
        console.log("Started new firecracker process " + process.pid);

        await mv
          .setLogger({
            log_path:
              "/tmp/firecracker.log" + "_" + username + "-" + environment,
            level: "debug",
            show_level: true,
            show_log_origin: true,
          })
          .then(async () => {
            await mv
              .setMachineConfig({
                vcpu_count: this.vcpuCount,
                mem_size_mib: this.memSizeMiB,
              })
              .then(async () => {
                await mv
                  .setBalloonMemory({
                    amount_mib: this.memBalloonSizeMiB,
                    deflate_on_oom: true,
                    stats_polling_interval_s: 1,
                  })
                  .then(async () => {
                    await mv
                      .setBootSource({
                        kernel_image_path: microVMKernelImage,
                        boot_args: microVMKernelBootARGs,
                      })
                      .then(async () => {
                        await mv
                          .addDrive("rootfs", {
                            drive_id: "rootfs",
                            path_on_host: microVMRootFSDrive,
                            is_root_device: true,
                            is_read_only: false,
                          })
                          .then(async () => {
                            // create tap dev on host
                            const microVMIPID =
                              this.availableIpAddresses.length;
                            const microVMIPAddress =
                              this.availableIpAddresses.pop();
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
                            console.log(
                              "FirecrackerProvider: creating tap device: " +
                                tap_id +
                                " with IP: " +
                                microVMIPAddress +
                                " and MAC: " +
                                microVMMACAddress
                            );

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
                                  mv.kill();
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

                            // need to setup tap devices etc. on the host in advance
                            // fcnet-setup.sh or similar can be used in rootfs
                            //   expects mac with prefix f6:, rest of the address is used as
                            //   mask and ipv4 address in hex
                            await mv
                              .addNetworkInterface(iface_id, {
                                iface_id: iface_id,
                                guest_mac: microVMMACAddress,
                                host_dev_name: tap_id,
                              })
                              .then(async () => {
                                // possibly wait for all previous changes (async)
                                // see getting_started doc for firecracker
                                await mv
                                  .invokeAction("InstanceStart")
                                  .then(() => {
                                    console.log(
                                      "FirecrackerProvider: microVM started"
                                    );
                                    // wait for ssh
                                    const expirationDate = new Date(
                                      Date.now() +
                                        providerInstance.maxInstanceLifetimeMinutes *
                                          60 *
                                          1000
                                    );
                                    providerInstance
                                      .waitForServerSSH(
                                        microVMIPAddress,
                                        providerInstance.sshPort,
                                        providerInstance.microVMSSHTimeoutSeconds
                                      )
                                      .then(() => {
                                        console.log(
                                          "FirecrackerProvider: microVM SSH ready"
                                        );
                                        const vmEndpoint = {
                                          instance: microVMIPAddress,
                                          providerInstanceStatus:
                                            "Environment will be deleted at " +
                                            expirationDate.toLocaleString(),
                                          IPAddress: microVMIPAddress,
                                          SSHPort: providerInstance.sshPort,
                                          LanguageServerPort:
                                            providerInstance.lsPort,
                                        };
                                        this.firecrackers.set(
                                          microVMIPAddress,
                                          {
                                            vmEndpoint: vmEndpoint,
                                            process: process,
                                            expirationDate: expirationDate,
                                            tapInterfaceId: tap_id,
                                            username: username,
                                            groupNumber: groupNumber,
                                            environment: environment,
                                          }
                                        );

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
                                        "FirecrackerProvider: Could not invoke Action to start microVM: " +
                                          err.response.data.fault_message
                                      )
                                    );
                                  });
                              })
                              .catch((err) => {
                                return reject(
                                  new Error(
                                    "FirecrackerProvider: Could not add NetworkInterface: " +
                                      err.response.data.fault_message
                                  )
                                );
                              });
                          })
                          .catch((err) => {
                            return reject(
                              new Error(
                                "FirecrackerProvider: Could not add Drive: " +
                                  err.response.data.fault_message.fault_message
                              )
                            );
                          });
                      })
                      .catch((err) => {
                        return reject(
                          new Error(
                            "FirecrackerProvider: Could not set BootSource: " +
                              err.response.data.fault_message
                          )
                        );
                      });
                  })
                  .catch((err) => {
                    return reject(
                      new Error(
                        "FirecrackerProvider: Could not set BalloonMemory: " +
                          err.response.data.fault_message
                      )
                    );
                  });
              })
              .catch((err) => {
                return reject(
                  new Error(
                    "FirecrackerProvider: Could not set MachineConfig: " +
                      err.response.data.fault_message
                  )
                );
              });
          })
          .catch((err) => {
            return reject(
              new Error(
                "FirecrackerProvider: Could not create Logger: " +
                  err.response.data.fault_message
              )
            );
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
      const fi = fc?.process;
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
