import { InstanceProvider, VMEndpoint } from "./Provider";

export default class K8sProvider implements InstanceProvider {
  createServer(username: string, groupNumber: number, environment: string, options?: { image?: string; dockerCmd?: string; dockerSupplementalPorts?: string[]; kernelImage?: string; kernelBootARGs?: string; rootDrive?: string; proxmoxTemplateTag?: string; mountKubeconfig?: boolean; sshTunnelingPorts?: string[]; }): Promise<VMEndpoint> {
    throw new Error("Method not implemented.");
  }
  getServer(instance: string): Promise<VMEndpoint> {
    throw new Error("Method not implemented.");
  }
  deleteServer(instance: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
  
}