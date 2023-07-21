import {
  InstanceProvider,
  VMEndpoint,
  InstanceNotFoundErrorMessage,
} from "./Provider";
import Firecrackerode from "firecrackerode";
import { ToadScheduler, SimpleIntervalJob, AsyncTask } from "toad-scheduler";
import { Client } from "ssh2";
import Environment from "../Environment";

const schedulerIntervalSeconds = 5 * 60;

type microVMId = string;

interface microVMInstance {
  vmEndpoint: VMEndpoint;
  firecrackerodeInstance: Firecrackerode;
  expirationDate: Date;
}

export default class FirecrackerProvider implements InstanceProvider {
  private firecrackers: Map<microVMId, microVMInstance>;

  // Firecracker config
  private socketPathPrefix: string;
  private kernelImage: string;
  private kernelBootARGs: string;
  private rootFSDrive: string;

  private networkCIDR: string;

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
    this.networkCIDR = process.env.FIRECRACKER_NETWORK_CIDR;

    this.maxInstanceLifetimeMinutes = parseInt(
      process.env.FIRECRACKER_MAX_INSTANCE_LIFETIME_MINUTES
    );

    this.providerInstance = this;

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
    const fi = new Firecrackerode({
      socketPath: this.socketPathPrefix + "_" + username + "-" + environment,
    });

    return new Promise(async (resolve, reject) => {
      const microVMKernelImage = kernelImage ?? providerInstance.kernelImage;
      const microVMKernelBootARGs =
        kernelImage ?? providerInstance.kernelBootARGs;
      const microVMRootFSDrive = rootFSDrive ?? providerInstance.rootFSDrive;
      // jailer is recommended for production
      await fi.spawn("/usr/bin/firecracker").then(async (process) => {
        console.log("Started new firecracker process " + process.pid)
        await fi.bootSource({
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
            // hard-coded addresses for now
            // create tap dev on host
            // test, needs to be dynamically created
            const microVMIPAddress = "172.16.0.2";
            const iface_id = "net1";
            const iface = fi.interface(iface_id);
            // guest_mac seams to be optional?
            // need to setup tap devices etc. on the host in advance
            // fcnet-setup.sh can be used in rootfs
            //   expects mac with prefix fc:, rest of the address is used as
            //   mask and ipv4 address in hex
            //   move to: f2: prefix to respect generated address bit
            await iface.create({
              iface_id: iface_id,
              guest_mac: "fc:18:ac:10:00:02",
              host_dev_name: "tap0",
            });
            await fi.action("InstanceStart");
            console.log("FirecrackerProvider: microVM started");
            // wait for ssh
            const expirationDate = new Date(
              Date.now() + providerInstance.maxInstanceLifetimeMinutes * 60 * 1000
            );
            providerInstance
              .waitForServerSSH(
                microVMIPAddress,
                providerInstance.sshPort,
                providerInstance.microVMSSHTimeoutSeconds
              )
              .then(() => {
                const vmEndpoint = {
                  instance: microVMIPAddress,
                  providerInstanceStatus:
                    "Environment will be deleted at " +
                    expirationDate.toLocaleString(),
                  IPAddress: microVMIPAddress,
                  SSHPort: providerInstance.sshPort,
                  LanguageServerPort: providerInstance.lsPort,
                };
                this.firecrackers.set(
                  username + "-" + groupNumber + "-" + environment,
                  {
                    vmEndpoint: vmEndpoint,
                    firecrackerodeInstance: fi,
                    expirationDate: expirationDate,
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
              new Error("FirecrackerProvider: Could not create interface: " + err)
            );
          })
          .catch((err) => {
            return reject(
              new Error("FirecrackerProvider: Could not update preboot: " + err)
            );
          })
          .catch((err) => {
            return reject(
              new Error(
                "FirecrackerProvider: Could not create bootSource: " + err
              )
            );
          });  
      })
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
    return new Promise((resolve, reject) => {
      const fi = this.firecrackers.get(instance)?.firecrackerodeInstance;
      const vmEndpoint = this.firecrackers.get(instance)?.vmEndpoint;
      if (vmEndpoint !== undefined && fi !== undefined) {
        if (fi.kill()) {
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
            return resolve();
          })
          .on("error", (err) => {
            console.log(
              "FirecrackerProvider: SSH connection failed - retrying..." + err
            );
          })
          .connect({
            host: ip,
            port: port,
            username: process.env.SSH_USERNAME,
            password: process.env.SSH_PASSWORD,
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
