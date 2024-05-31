import { InstanceProvider, VMEndpoint } from "./Provider";

const lsPort = 3005;

export default class LocalVMProvider implements InstanceProvider {
  private availableInstances: Map<string, VMEndpoint>;
  private availableInstancesList: string[];

  constructor() {
    this.availableInstances = new Map();
    this.availableInstancesList = [];

    let ipAddresses: string[] = [];
    let sshPorts: number[] = [];

    if (process.env.VBOX_IP_ADDRESSES !== undefined) {
      ipAddresses = process.env.VBOX_IP_ADDRESSES.split(",");
    } else {
      console.log(
        "LocalVMProvider: No VBOX_IP_ADDRESSES environment variable set. LocalVMProvider can not provide instances.",
      );
      return;
    }

    if (process.env.VBOX_SSH_PORTS !== undefined) {
      sshPorts = process.env.VBOX_SSH_PORTS.split(",").map((port) => {
        return parseInt(port, 10);
      });
    } else {
      console.log(
        "LocalVMProvider: No VBOX_SSH_PORTS environment variable set. LocalVMProvider uses Port 22 for all instances.",
      );
      // better use env var to allow configuration of port numbers?
      sshPorts = ipAddresses.map(() => {
        return 22;
      });
    }

    for (const [index, ipAddress] of ipAddresses.entries()) {
      console.log(
        `LocalVMProvider: Adding VM to LocalVMProvider pool: ${ipAddress} with SSH port: ${sshPorts[index]}`,
      );
      this.availableInstances.set(`vm-${index}`, {
        // vms can be reused for different environments, hence providerInstanceStatus will not contain expiration info etc.
        instance: `vm-${index}`,
        providerInstanceStatus: "",
        IPAddress: ipAddress,
        SSHPort: sshPorts[index],
        LanguageServerPort: lsPort,
      });
      this.availableInstancesList.push(`vm-${index}`);
    }
  }

  createServer(): Promise<VMEndpoint> {
    return new Promise((resolve, reject) => {
      const instanceName = this.availableInstancesList.pop();

      if (instanceName) {
        const endpoint = this.availableInstances.get(instanceName);

        if (endpoint) {
          resolve(endpoint);
          return;
        }
      }

      reject(
        new Error(
          "LocalVMProvider: Cannot create server. No VMs available or list of supplied one-time VM endpoints exhausted.",
        ),
      );
    });
  }

  getServer(instance: string): Promise<VMEndpoint> {
    return new Promise((resolve, reject) => {
      const endpoint = this.availableInstances.get(instance);

      if (endpoint) resolve(endpoint);
      else
        reject(new Error("LocalVMProvider: VMEndpoint not found: " + instance));
    });
  }

  deleteServer(instance: string): Promise<void> {
    console.log(
      "Ignoring to delete server " +
        instance +
        " as LocalVMProvider uses prebuild VMs that will not be deleted",
    );

    return Promise.resolve();
  }
}
