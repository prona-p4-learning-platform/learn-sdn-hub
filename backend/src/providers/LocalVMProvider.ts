import { InstanceProvider, VMEndpoint } from "./Provider";
export default class OpenStackProvider implements InstanceProvider {
  private ipAddress: string;
  constructor() {
    this.ipAddress = process.env.VBOX_IP_ADDRESS;
    console.log(
      `VirtualBoxProvider VBOX_IP_ADDRESS from env: ${this.ipAddress}`
    );
  }

  async getServer(): Promise<VMEndpoint> {
    return {
      IPAddress: this.ipAddress,
      SSHPort: 22,
      identifier: "vbox",
    };
  }

  async createServer(): Promise<VMEndpoint> {
    return this.getServer();
  }
}
