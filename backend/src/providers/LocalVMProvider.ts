import { InstanceProvider, VMEndpoint } from "./Provider";
export default class OpenStackProvider implements InstanceProvider {
  private ipAddress: string;
  private availableInstances: Map<string, VMEndpoint> = new Map();
  private availableInstancesList: string[] = [];
  constructor() {
    this.ipAddress = process.env.VBOX_IP_ADDRESS;
    console.log(
      `VirtualBoxProvider VBOX_IP_ADDRESS from env: ${this.ipAddress}`
    );
    this.availableInstances.set("vbox", {
      IPAddress: this.ipAddress,
      SSHPort: 22,
      LanguageServerPort: 3005,
      identifier: "vbox",
    });
    this.availableInstances.set("vbox2", {
      IPAddress: "192.168.178.108",
      SSHPort: 22,
      LanguageServerPort: 3005,
      identifier: "vbox2",
    });
    this.availableInstancesList = ["vbox", "vbox2"];
  }

  async getServer(identifier: string): Promise<VMEndpoint> {
    return this.availableInstances.get(identifier);
  }

  async createServer(): Promise<VMEndpoint> {
    if (this.availableInstancesList.length > 0) {
      console.log(this.availableInstancesList);
      return this.availableInstances.get(this.availableInstancesList.pop());
    }
    throw new Error("Cannot create server.");
  }
}
