import { InstanceProvider, VMEndpoint } from "./Provider";
import * as k8s from '@kubernetes/client-node';

export default class K8sProvider implements InstanceProvider {
  private k8sApi: k8s.CoreV1Api;

  /**
   * Loads the Kubernetes configuration from the default location
   * and creates a Kubernetes API client for CoreV1 API operations.
   */
  constructor() {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();
    this.k8sApi = kc.makeApiClient(k8s.CoreV1Api);
  }

  async createServer(
    username: string,
    _groupNumber: number,
    _environment: string,
    _options?: {
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
    const namespace = 'learn-sdn-hub'; // Target Kubernetes namespace
    const podName = `${username}-${_groupNumber}-${_environment}`;
    const image = _options?.image || 'nginx:alpine';

    try {
      const podManifest: k8s.V1Pod = {
        metadata: {
          name: podName,
          labels: {
            app: 'learn-sdn-hub-assignment',
            user: username,
          },
        },
        spec: {
          containers: [
            {
              name: 'main',
              image: image,
              command: _options?.dockerCmd ? [_options.dockerCmd] : undefined,
              ports: [
                { containerPort: 22 }
              ],
              securityContext: {
                privileged: true,
              },
            },
          ],
        },
      };

      await this.k8sApi.createNamespacedPod({
        namespace: namespace,
        body: podManifest,
      });

      let attempts = 0;
      while (attempts < 60) {
        const pod = await this.k8sApi.readNamespacedPod({
          name: podName,
          namespace: namespace,
        });

        const phase = pod.status?.phase;
        const ip = pod.status?.podIP;

        if (phase === 'Running' && ip) {
          return {
            instance: podName,
            providerInstanceStatus: 'Running',
            IPAddress: ip,
            SSHPort: 22,
            LanguageServerPort: 3000,
          };
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
        attempts++;
      }

      throw new Error('Timeout waiting for Pod to become ready');

    } catch (err) {
      console.error('K8sProvider: Error creating/waiting for pod:', err);
      throw err;
    }
  }


  async getServer(instance: string): Promise<VMEndpoint> {
    const namespace = 'learn-sdn-hub'; // Target Kubernetes namespace
    try {
      const pod = await this.k8sApi.readNamespacedPod({
        name: instance,
        namespace: namespace,
      });

      const phase = pod.status?.phase;
      const ip = pod.status?.podIP;

      if (phase && ip) {
        return {
          instance: instance,
          providerInstanceStatus: phase,
          IPAddress: ip,
          SSHPort: 22,
          LanguageServerPort: 3000,
        };
      } else {
        throw new Error(`K8sProvider: Pod ${instance} found but missing phase or IP.`);
      }
    } catch (err: any) { 
      if (err.statusCode === 404) {
        throw new Error(`K8sProvider: Pod ${instance} not found.`);
      }
      console.error(`K8sProvider: Error getting pod ${instance}:`, err);
      throw err;
    }
  }

  async deleteServer(instance: string): Promise<void> {
    const namespace = 'learn-sdn-hub'; // Target Kubernetes namespace
    try {
      await this.k8sApi.deleteNamespacedPod({
        name: instance,
        namespace: namespace,
      });
    } catch (err: any) {
      
      if (err.statusCode === 404) {
        return;
      }
      console.error(`K8sProvider: Error deleting pod ${instance}:`, err);
      throw err;
    }
  }
}
