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
import { ChildProcess, exec, execSync, spawn } from "child_process";

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

interface microVMInstance {
  vmEndpoint: VMEndpoint;
  expirationDate: Date;
  tapInterfaceId: string;
  username: string;
  groupNumber: number;
  environment: string;
  process: void | ChildProcess;
  microVM: microVM;
}

class microVM {
  binPath: string;
  socketPath: string;
  axiosInstance: AxiosInstance;
  baseURL: string;
  microVMInstance: Partial<microVMInstance>;

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

    this.microVMInstance = {};
  }

  spawn(): Promise<ChildProcess> {
    return new Promise((resolve, reject) => {
      try {
        this.microVMInstance.process = spawn(
          this.binPath,
          ["--api-sock", this.socketPath],
          {
            detached: true,
          },
        );
      } catch (err) {
        reject(
          new Error("FirecrackerProvider: Could not spawn firecracker process"),
        );
        return;
      }

      this.microVMInstance.process.on("exit", () => {
        fs.unlink(this.socketPath).catch((err: {code: string, message: string}) => {
          // if ENOENT, file does not exist as intended
          if ("ENOENT" !== err.code) {
            return reject(
              new Error(
                "FirecrackerProvider: Could not cleanup socketPath " + err.message,
              ),
            );
          }
        });
      });

      this.microVMInstance.process.on("close", () => {
        fs.unlink(this.socketPath).catch((err: {code: string, message: string}) => {
          // if ENOENT, file does not exist as intended
          if ("ENOENT" !== err.code) {
            return reject(
              new Error(
                "FirecrackerProvider: Could not cleanup socketPath " + err.message,
              ),
            );
          }
        });
      });

      this.microVMInstance.process.on("error", () => {
        fs.unlink(this.socketPath).catch((err: {code: string, message: string}) => {
          // if ENOENT, file does not exist as intended
          if ("ENOENT" !== err.code) {
            return reject(
              new Error(
                "FirecrackerProvider: Could not cleanup socketPath " + err.message,
              ),
            );
          }
        });
      });

      resolve(this.microVMInstance.process);
    });
  }

  kill(): boolean {
    return this.microVMInstance.process?.kill() ?? true;
  }

  setLogger(data: FirecrackerLogger): Promise<FirecrackerLogger> {
    return new Promise((resolve, reject) => {
      this.axiosInstance
        .put(this.baseURL + "/logger", data)
        .then((response: {data: FirecrackerLogger}) => {
          resolve(response.data);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  setMachineConfig(
    data: FirecrackerMachineConfig,
  ): Promise<FirecrackerMachineConfig> {
    return new Promise((resolve, reject) => {
      this.axiosInstance
        .put(this.baseURL + "/machine-config", data)
        .then((response: {data: FirecrackerMachineConfig}) => {
          resolve(response.data);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  setBalloonMemory(
    data: FirecrackerBalloonMemory,
  ): Promise<FirecrackerBalloonMemory> {
    return new Promise((resolve, reject) => {
      this.axiosInstance
        .put(this.baseURL + "/balloon", data)
        .then((response: {data: FirecrackerBalloonMemory}) => {
          resolve(response.data);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  setBootSource(
    data: FirecrackerBootSource,
  ): Promise<FirecrackerBootSource> {
    return new Promise((resolve, reject) => {
      this.axiosInstance
        .put(this.baseURL + "/boot-source", data)
        .then((response: {data: FirecrackerBootSource}) => {
          resolve(response.data);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  addDrive(
    driveId: string,
    data: FirecrackerDrive,
  ): Promise<FirecrackerDrive> {
    return new Promise((resolve, reject) => {
      this.axiosInstance
        .put(this.baseURL + "/drives/" + driveId, data)
        .then((response: {data: FirecrackerDrive}) => {
          resolve(response.data);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  addNetworkInterface(
    ifId: string,
    data: FirecrackerNetworkInterface,
  ): Promise<FirecrackerNetworkInterface> {
    return new Promise((resolve, reject) => {
      this.axiosInstance
        .put(this.baseURL + "/network-interfaces/" + ifId, data)
        .then((response: {data: FirecrackerNetworkInterface}) => {
          resolve(response.data);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  invokeAction(actionType: string): Promise<FirecrackerActionState> {
    return new Promise((resolve, reject) => {
      this.axiosInstance
        .put(this.baseURL + "/actions", { action_type: actionType })
        .then((response: {data: FirecrackerActionState}) => {
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
  private microVMSSHTimeoutSeconds = 30;

  // SSH and LanguageServer Port config
  private sshPort: number;
  private lsPort: number;

  private providerInstance: FirecrackerProvider;

  constructor() {
    this.binPath = process.env.FIRECRACKER_BIN_PATH ?? "/usr/bin/firecracker";
    this.vcpuCount = parseInt(process.env.FIRECRACKER_VCPU_COUNT ?? "2");
    this.memSizeMiB = parseInt(process.env.FIRECRACKER_MEM_SIZE_MIB ?? "2048");
    this.memBalloonSizeMiB = parseInt(
      process.env.FIRECRACKER_MEM_BALLOON_SIZE_MIB ??
        new Number(this.memSizeMiB - 512).toString(),
    );

    // check for socket path
    const ENV_SOCKET_PATH = process.env.FIRECRACKER_SOCKET_PATH_PREFIX;
    if (ENV_SOCKET_PATH) this.socketPathPrefix = ENV_SOCKET_PATH;
    else {
      throw new Error(
        "FirecrackerProvider: No socket path prefix provided (FIRECRACKER_SOCKET_PATH_PREFIX).",
      );
    }

    // check for kernel image
    const ENV_KERNEL_IMAGE = process.env.FIRECRACKER_KERNEL_IMAGE;
    if (ENV_KERNEL_IMAGE) this.kernelImage = ENV_KERNEL_IMAGE;
    else {
      throw new Error(
        "FirecrackerProvider: No kernel image provided (FIRECRACKER_KERNEL_IMAGE).",
      );
    }

    // check for kernel args
    const ENV_KERNEL_ARGS = process.env.FIRECRACKER_KERNEL_BOOT_ARGS;
    if (ENV_KERNEL_ARGS) this.kernelBootARGs = ENV_KERNEL_ARGS;
    else {
      throw new Error(
        "FirecrackerProvider: No kernel boot args provided (FIRECRACKER_KERNEL_BOOT_ARGS).",
      );
    }

    // check for root fs drive
    const ENV_ROOT_DRIVE = process.env.FIRECRACKER_ROOTFS_DRIVE;
    if (ENV_ROOT_DRIVE) this.rootFSDrive = ENV_ROOT_DRIVE;
    else {
      throw new Error(
        "FirecrackerProvider: No root fs drive provided (FIRECRACKER_ROOTFS_DRIVE).",
      );
    }

    // check for bridge interface
    const ENV_BRIDGE_INTERFACE = process.env.FIRECRACKER_BRIDGE_INTERFACE;
    if (ENV_BRIDGE_INTERFACE) {
      this.bridgeInterface = ENV_BRIDGE_INTERFACE;

      const bridgeInterfaceRegExp = new RegExp(/^[a-z0-9]+$/i);
      if (!bridgeInterfaceRegExp.test(this.bridgeInterface)) {
        throw new Error(
          "Invalid FIRECRACKER_BRIDGE_INTERFACE. Needs to be an alphanumeric string.",
        );
      }
    } else {
      throw new Error(
        "FirecrackerProvider: No bridge interface provided (FIRECRACKER_BRIDGE_INTERFACE).",
      );
    }

    // check for network cidr
    const ENV_CIDR = process.env.FIRECRACKER_NETWORK_CIDR;
    if (ENV_CIDR) {
      try {
        this.networkCIDR = new Netmask(ENV_CIDR);
      } catch (error) {
        const originalMessage =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(
          "FirecrackerProvider: Network cidr address invalid (FIRECRACKER_NETWORK_CIDR).\n" +
            originalMessage,
        );
      }
    } else {
      throw new Error(
        "FirecrackerProvider: No network cidr provided (FIRECRACKER_NETWORK_CIDR).",
      );
    }

    this.availableIpAddresses = new Array<string>();
    this.networkCIDR.forEach((ip) => {
      // reserve the first and last IP address for the host
      if (ip !== this.networkCIDR.first && ip !== this.networkCIDR.last)
        this.availableIpAddresses.push(ip);
    });

    // check for max instance lifetime
    const ENV_LIFETIME = process.env.FIRECRACKER_MAX_INSTANCE_LIFETIME_MINUTES;
    if (ENV_LIFETIME) {
      const parsedLifetime = parseInt(ENV_LIFETIME);

      if (!isNaN(parsedLifetime))
        this.maxInstanceLifetimeMinutes = parsedLifetime;
      else {
        console.log(
          "FirecrackerProvider: Provided instance lifetime cannot be parsed (FIRECRACKER_MAX_INSTANCE_LIFETIME_MINUTES).",
        );
        process.exit(1);
      }
    } else {
      console.log(
        "FirecrackerProvider: No instance lifetime provided (FIRECRACKER_MAX_INSTANCE_LIFETIME_MINUTES).",
      );
      process.exit(1);
    }

    this.providerInstance = this;

    this.firecrackers = new Map<microVMId, microVMInstance>();

    // better use env var to allow configuration of port numbers?
    this.sshPort = 22;
    this.lsPort = 3005;

    const scheduler = new ToadScheduler();

    const task = new AsyncTask(
      "FirecrackerProvider Instance Pruning Task",
      () => {
        return this.pruneMicroVMInstance();
      },
      (err: Error) => {
        console.log(
          "FirecrackerProvider: Could not prune stale microVM instances..." +
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
    kernelImage?: string,
    rootFSDrive?: string,
  ): Promise<VMEndpoint> {
    const providerInstance = this.providerInstance;
    const socketPath =
      this.socketPathPrefix + "_" + username + "-" + environment;

      await fs.unlink(socketPath).catch((err: {code: string, message: string}) => {
        if ("ENOENT" !== err.code) {
          throw(
            new Error(
              "FirecrackerProvider: Could not cleanup socketPath " + err.message,
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

      await fs.unlink(socketPath).catch((err: {code: string, message: string}) => {
        if ("ENOENT" !== err.code) {
          throw(
            new Error("FirecrackerProvider: Could not cleanup logFile " + err.message)
          );
        }
        // if ENOENT, file does not exist as intended
      });
      await fs
        .utimes(logFileName, logFileTime, logFileTime)
        .catch(async (err: {code: string, message: string}) => {
          if ("ENOENT" !== err.code) {
            throw(
              new Error("FirecrackerProvider: Could not touch logfile " + err.message)
            );
          }
          // if ENOENT, file does not exist as intended, open and close it to update access time
          const fh = await fs.open(logFileName, "a");
          await fh.close();
        });

      // jailer is recommended for production
      const mv = new microVM(this.binPath, socketPath);
      const process = await mv.spawn().catch((err: Error) => {
        throw(
          new Error(
            "FirecrackerProvider: Could not spawn new Firecracker process: " +
              err.message
          )
        );
      });
      console.log("Started new firecracker process " + process?.pid);

      // setting up logging for firecracker microVM
      await mv.setLogger({
        log_path:
          "/tmp/firecracker.log" + "_" + username + "-" + environment,
        level: "debug",
        show_level: true,
        show_log_origin: true,
      }).catch((err: Error) => {
        throw(
          new Error(
            "FirecrackerProvider: Could not set Logger: " +
              err.message,
          )
        );
      });

      // setting machine config of firecracker microVM
      await mv.setMachineConfig({
        vcpu_count: this.vcpuCount,
        mem_size_mib: this.memSizeMiB,
      }).catch((err: Error) => {
        throw(
          new Error(
            "FirecrackerProvider: Could not set MachineConfig: " +
              err.message,
          )
        );
      });

      // setting balloon memory of firecracker microVM
      await mv.setBalloonMemory({
        amount_mib: this.memBalloonSizeMiB,
        deflate_on_oom: true,
        stats_polling_interval_s: 1,
      }).catch((err: Error) => {
        throw(
          new Error(
            "FirecrackerProvider: Could not set BalloonMemory: " +
              err.message,
          )
        );
      });

      // setting boot source of firecracker microVM
      await mv.setBootSource({
        kernel_image_path: microVMKernelImage,
        boot_args: microVMKernelBootARGs,
      }).catch((err: Error) => {
        throw(
          new Error(
            "FirecrackerProvider: Could not set BootSource: " +
              err.message,
          )
        );
      });

      // adding rootfs drive of firecracker microVM
      await mv.addDrive("rootfs", {
        drive_id: "rootfs",
        path_on_host: microVMRootFSDrive,
        is_root_device: true,
        is_read_only: false,
      }).catch((err: Error) => {
        throw(
          new Error(
            "FirecrackerProvider: Could not add Drive: " +
              err.message,
          )
        );
      });

      // create tap dev on host
      const microVMIPID =
        this.availableIpAddresses.length;
      const microVMIPAddress =
        this.availableIpAddresses.pop();

      if (!microVMIPAddress)
        throw(
          new Error(
            "FirecrackerProvider: No ip address available.",
          )
        )

      const hexStringIP = microVMIPAddress
        .split(".")
        .map((value) =>
          Number(value).toString(16).padStart(2, "0"),
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
          microVMMACAddress,
      );

      // create tap interface and attach it to the bridge
      try {
        execSync(
          "sudo ip tuntap add " +
            tap_id +
            " mode tap && sudo ip link set " +
            tap_id +
            " up && sudo brctl addif " +
            this.bridgeInterface +
            " " +
            tap_id
        )
      } catch (error) {
        mv.kill();
        throw(
          new Error(
            "FirecrackerProvider: Unable to create TAP device."
          )
        );
      }
      // wait for tap dev to be setup
      await providerInstance.sleep(1000);

      // need to setup tap devices etc. on the host in advance
      // fcnet-setup.sh or similar can be used in rootfs
      //   expects mac with prefix f6:, rest of the address is used as
      //   mask and ipv4 address in hex
      await mv.addNetworkInterface(iface_id, {
          iface_id: iface_id,
          guest_mac: microVMMACAddress,
          host_dev_name: tap_id,
      })

      // possibly wait for all previous changes (async?)
      // see getting_started doc for firecracker
      await mv.invokeAction("InstanceStart")
      console.log(
        "FirecrackerProvider: microVM started",
      );
      // wait for ssh
      const expirationDate = new Date(
        Date.now() +
          providerInstance.maxInstanceLifetimeMinutes *
            60 *
            1000,
      );
      await providerInstance
        .waitForMicroVMSSH(
          microVMIPAddress,
          providerInstance.sshPort,
          providerInstance.microVMSSHTimeoutSeconds,
        )
        console.log(
          "FirecrackerProvider: microVM SSH ready",
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
            microVM: mv,
            process: process,
            expirationDate: expirationDate,
            tapInterfaceId: tap_id,
            username: username,
            groupNumber: groupNumber,
            environment: environment,
          },
        );

        return vmEndpoint;
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
    const providerInstance = this.providerInstance;
    const fc = this.firecrackers.get(instance);
    const fi = fc?.process;
    const vmEndpoint = this.firecrackers.get(instance)?.vmEndpoint;

    if (vmEndpoint !== undefined && fc !== undefined && fi !== undefined) {
      // wait for stop tasks to end
      await providerInstance.sleep(1000);
      // https://github.com/firecracker-microvm/firecracker/blob/main/docs/api_requests/actions.md#send-ctrlaltdel
      await fc.microVM.invokeAction("SendCtrlAltDel").catch((err) => {
        throw(new Error("FirecrackerProvider: Could not invoke Action to stop microVM: " + err));
      })

      console.log("FirecrackerProvider: microVM stopped");
      // wait for stop tasks to end, is this still necessary after SendCtrlAltDel?
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
              throw(
                new Error(
                  "FirecrackerProvider: Unable to remove TAP device." +
                    stderr +
                    " " +
                    stdout,
                )
              );
            }
          },
        );
        this.availableIpAddresses.push(vmEndpoint.IPAddress);
        this.firecrackers.delete(instance);

        return
      } else {
        throw(
          new Error(
            "FirecrackerProvider: Could not delete instance: " + instance,
          )
        );
      }
    } else {
      throw(new Error(InstanceNotFoundErrorMessage));
    }
  }

  /**
  * Deletes all expired microVMs.
  */
  private async pruneMicroVMInstance(): Promise<void> {
    const deadline = new Date(Date.now());

    console.log(
      "FirecrackerProvider: Pruning microVM instances older than " +
        deadline.toISOString(),
    );

    for(const [microVMId, microVM] of this.firecrackers.entries()) {
      if (microVM.expirationDate < deadline) {        
        //await this.deleteServer(microVMId).catch((reason) => {
        //  const originalMessage =
        //  reason instanceof Error ? reason.message : "Unknown error";
        //  throw(new Error(
        //      `FirecrackerProvider: Could not delete expired microVM (${microVMId}) during pruning.\n` +
        //        originalMessage,
        //  ));
        //})
        await Environment.deleteInstanceEnvironments(microVMId).catch((reason) => {
          const originalMessage =
          reason instanceof Error ? reason.message : "Unknown error";
          throw new Error(
              `FirecrackerProvider: Could not delete instance for expired microVM (${microVMId}) during pruning.\n` +
                originalMessage,
          );
        })
        console.log(
           "FirecrackerProvider: deleted expired microVM: " +
             microVMId +
             " expiration date: " +
             microVM.expirationDate.toISOString(),
         );
        return;
      }
    }
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
  private async waitForMicroVMSSH(
    ip: string,
    port: number,
    timeout: number,
  ): Promise<void> {
    // simple connection test function
    const testConnection = () => {
      return new Promise<boolean>((resolve, reject) => {
        const sshConnection = new Client();

        sshConnection
          .on("ready", () => {
            sshConnection.end();
            resolve(true);
          })
          .on("error", (err) => {
            sshConnection.end();
            reject(err);
          })
          .connect({
            host: ip,
            port: port,
            username: process.env.SSH_USERNAME,
            password: process.env.SSH_PASSWORD,
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
          "DockerProvider: SSH connection failed - retrying...\n" +
            originalMessage,
        );

        return false;
      });

      if (connected) return;

      usedTime = Math.floor((Date.now() - startTime) / 1000);
      await this.sleep(1000);
    }

    throw new Error("DockerProvider: Timed out waiting for SSH connection.");
  }

  sleep(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
