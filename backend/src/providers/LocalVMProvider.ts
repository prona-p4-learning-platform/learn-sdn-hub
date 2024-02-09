import { InstanceProvider, VMEndpoint } from "./Provider";

const lsPort = 3005;

export default class LocalVMProvider implements InstanceProvider {
  private availableInstances: Map<string, VMEndpoint> = new Map();
  private availableInstancesList: string[] = [];
  constructor() {
    let ipAddresses: string[] = [];
    let sshPorts: number[] = [];
    if (process.env.VBOX_IP_ADDRESSES != undefined) {
      ipAddresses = process.env.VBOX_IP_ADDRESSES.split(",");
    } else {
      console.log(
        "LocalVMProvider: No VBOX_IP_ADDRESSES environment variable set. LocalVMProvider can not provide instances.",
      );
      return;
    }
    if (process.env.VBOX_SSH_PORTS != undefined) {
      sshPorts = process.env.VBOX_SSH_PORTS.split(",").map((port) =>
        Number.parseInt(port),
      );
    } else {
      console.log(
        "LocalVMProvider: No VBOX_SSH_PORTS environment variable set. LocalVMProvider uses Port 22 for all instances.",
      );
      // better use env var to allow configuration of port numbers?
      sshPorts = ipAddresses.map(() => 22);
    }
    ipAddresses.forEach((ipAddress, index) => {
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
    });
  }

  async createServer(): Promise<VMEndpoint> {
    if (this.availableInstancesList.length > 0) {
      return this.availableInstances.get(this.availableInstancesList.pop());
    }
    throw new Error(
      "LocalVMProvider: Cannot create server. No VMs available or list of supplied one-time VM endpoints exhausted.",
    );
  }

  async getServer(instance: string): Promise<VMEndpoint> {
    return this.availableInstances.get(instance);
  }

  async deleteServer(instance: string): Promise<void> {
    console.log(
      "Ignoring to delete server " +
        instance +
        " as LocalVMProvider uses prebuild VMs that will not be deleted",
    );
    return Promise.resolve();
  }
}
