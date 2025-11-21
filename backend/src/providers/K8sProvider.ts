import { InstanceProvider, VMEndpoint } from "./Provider";

export default class K8sProvider implements InstanceProvider {
  createServer(_username: string, _groupNumber: number, _environment: string, _options?: { image?: string; dockerCmd?: string; dockerSupplementalPorts?: string[]; kernelImage?: string; kernelBootARGs?: string; rootDrive?: string; proxmoxTemplateTag?: string; mountKubeconfig?: boolean; sshTunnelingPorts?: string[]; }): Promise<VMEndpoint> {
    throw new Error("Method not implemented.");
  }
  getServer(_instance: string): Promise<VMEndpoint> {
    throw new Error("Method not implemented.");
  }
  deleteServer(_instance: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
  
}