import { InstanceProvider, VMEndpoint } from "./Provider";
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
        "No VBOX_IP_ADDRESSES environment variable set. LocalVMProvider can not provide instances."
      );
      return;
    }
    if (process.env.VBOX_SSH_PORTS != undefined) {
      sshPorts = process.env.VBOX_SSH_PORTS.split(",").map((port) =>
        Number.parseInt(port)
      );
    } else {
      console.log(
        "No VBOX_SSH_PORTS environment variable set. LocalVMProvider uses Port 22 for all instances."
      );
      sshPorts = ipAddresses.map(() => 22);
    }
    ipAddresses.forEach((ipAddress, index) => {
      console.log(
        `Adding VM to LocalVMProvider pool: ${ipAddress} with SSH port: ${sshPorts[index]}`
      );
      this.availableInstances.set(`vm-${index}`, {
        IPAddress: ipAddress,
        SSHPort: sshPorts[index],
        LanguageServerPort: 3005,
        identifier: `vm-${index}`,
      });
      this.availableInstancesList.push(`vm-${index}`);
    });
  }

  async getServer(identifier: string): Promise<VMEndpoint> {
    return this.availableInstances.get(identifier);
  }

  async createServer(identifier: string): Promise<VMEndpoint> {
    if (this.availableInstancesList.length > 0) {
      return this.availableInstances.get(this.availableInstancesList.pop());
    }
    throw new Error("Cannot create server.");
  }
}
