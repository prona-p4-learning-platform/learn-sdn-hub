export interface VMEndpoint {
  instance: string;
  providerInstanceStatus: string;
  IPAddress: string;
  SSHPort: number;
  LanguageServerPort: number;
}
export interface InstanceProvider {
  createServer(
    username: string,
    groupNumber: number,
    environment: string
  ): Promise<VMEndpoint>;
  getServer(instance: string): Promise<VMEndpoint>;
  deleteServer(instance: string): Promise<void>;
}
