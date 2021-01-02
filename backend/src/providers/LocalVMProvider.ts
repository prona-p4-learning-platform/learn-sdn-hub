import { InstanceProvider, VMEndpoint } from "./Provider";
export default class OpenStackProvider implements InstanceProvider {
  private ipAddress = "127.0.0.1";
  private sshPort = 22;
  constructor() {
    if (process.env.VBOX_IP_ADDRESS != undefined) {
      this.ipAddress = process.env.VBOX_IP_ADDRESS;
    }
    if (process.env.VBOX_SSH_PORT != undefined) {
      this.sshPort = parseInt(process.env.VBOX_SSH_PORT);
    }
    console.log(
      `Using LocalVMProvider with ipAddress: ${this.ipAddress} (env var: VBOX_IP_ADDRESS) and sshPort: ${this.sshPort} (env var: VBOX_SSH_PORT)`
    );
  }

  async getServer(): Promise<VMEndpoint> {
    return {
      IPAddress: this.ipAddress,
      SSHPort: this.sshPort,
      LanguageServerPort: 3005,
      identifier: "vbox",
    };
  }

  async createServer(): Promise<VMEndpoint> {
    return this.getServer();
  }
}
