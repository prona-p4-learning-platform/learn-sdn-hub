export interface VMEndpoint {
  instance: string;
  providerInstanceStatus: string;
  IPAddress: string;
  SSHPort: number;
  LanguageServerPort: number;
}

// evaluate possiblity to use multiple providers in the same backend, e.g.,
// configuring individual providers to be used for different assignments,
// e.g., by using an option like "proivderType" in Configuration.ts

export interface InstanceProvider {
  createServer(
    username: string,
    groupNumber: number,
    environment: string,
    image?: string,
    dockerCmd?: string,
    dockerSupplementalPorts?: string[]
  ): Promise<VMEndpoint>;
  getServer(instance: string): Promise<VMEndpoint>;
  deleteServer(instance: string): Promise<void>;
}

export const InstanceNotFoundErrorMessage =
  "Provider: Cannot get server. Instance not found.";
