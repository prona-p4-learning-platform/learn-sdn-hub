import { InstanceProvider, VMEndpoint } from "./Provider";
import { K8sClient } from "../utils/k8s-client";

export default class K8sProvider implements InstanceProvider {

  /**
   * Loads the Kubernetes configuration from the default location
   * and creates a Kubernetes API client for CoreV1 API operations.
   */
  constructor() {
  }

  async createServer(
    username: string,
    groupNumber: number,
    _environment: string,
    options?: {
      image?: string;
      dockerCmd?: string;
      dockerSupplementalPorts?: string[];
      kernelImage?: string;
      kernelBootARGs?: string;
      rootDrive?: string;
      proxmoxTemplateTag?: string;
      mountKubeconfig?: boolean;
      sshTunnelingPorts?: string[];
    },
  ): Promise<VMEndpoint> {
    try {
      const assignmentName = "test"
      const parentClient = new K8sClient(K8sClient.getConfig())
      const client = new K8sClient(await parentClient.getVClusterConfig(groupNumber))

      await client.createAssignment({ username, assignmentName, ...options })

      await new Promise((resolve) => setTimeout(resolve, 5000));

      return {
        instance: "group-0",
        providerInstanceStatus: 'Running',
        IPAddress: `${assignmentName}-x-${assignmentName}-x-vcluster-group-${groupNumber}.vcluster-group-${groupNumber}`,
        SSHPort: 22,
        LanguageServerPort: 3000,
      };

    } catch (err) {
      console.error('K8sProvider: Error creating/waiting for pod:', err);
      throw err;
    }
  }


  async getServer(instance: string): Promise<VMEndpoint> {
    // get group number
    const groupNumber = Number(instance.split("-")[1])
    const assignmentName = "test"

    return {
        instance,
        providerInstanceStatus: 'Running',
        IPAddress: `${assignmentName}-x-${assignmentName}-x-vcluster-group-${groupNumber}.vcluster-group-${groupNumber}`,
        SSHPort: 22,
        LanguageServerPort: 3000,
      };
  }

  async deleteServer(instance: string): Promise<void> {
    const groupNumber = Number(instance.split("-")[1])
    const parentClient = new K8sClient(K8sClient.getConfig())
    const client = new K8sClient(await parentClient.getVClusterConfig(groupNumber))
    const assignmentName = "test"

    try {
      await client.deleteAssignment({assignmentName})
    } catch (err) {
      console.error(`K8sProvider: Error deleting pod ${instance}:`, err);
      throw err;
    }
  }
}
