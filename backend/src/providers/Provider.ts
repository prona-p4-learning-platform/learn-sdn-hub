export interface VMEndpoint {
  identifier: string;
  IPAddress: string;
  SSHPort: number;
  LanguageServerPort: number;
}
export interface InstanceProvider {
  getServer(identifier: string): Promise<VMEndpoint>;
  createServer(identifier: string): Promise<VMEndpoint>;
}
