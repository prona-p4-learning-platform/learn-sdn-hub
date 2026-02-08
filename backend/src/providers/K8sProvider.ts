import { V1Pod } from "@kubernetes/client-node";
import { K8sClient } from "../utils/k8s-client";
import { InstanceProvider, VMEndpoint } from "./Provider";

export default class K8sProvider implements InstanceProvider {

  /**
   * Loads the Kubernetes configuration from the default location
   * and creates a Kubernetes API client for CoreV1 API operations.
   */

  async createServer(
    username: string,
    groupNumber: number,
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
    /*const namespace = 'learn-sdn-hub'; // Target Kubernetes namespace
    const podName = `${username}-${_groupNumber}-${_environment}`;
    const image = _options?.image || 'nginx:alpine';*/
    const namespace = "test"
    const podName = "cc-lab"
    const {coreV1Api} = new K8sClient(await K8sClient.getVClusterConfig(groupNumber))

    try {
      const podManifest: V1Pod = {
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
              image: "cc-container:latest",
              command: _options?.dockerCmd ? [_options.dockerCmd] : undefined,
              ports: [
                { containerPort: 22 }
              ],
              securityContext: {
                privileged: true,
              },
              imagePullPolicy: "Never"
            },
          ],
        },
      };

      await coreV1Api.createNamespace({
        body: {
          metadata: {
            name: namespace
          }
        }
      })

      await new Promise((resolve) => setTimeout(resolve, 2000));

      await coreV1Api.createNamespacedPod({
        namespace: namespace,
        body: podManifest,
      });

      await coreV1Api.createNamespacedService({
        namespace,
        body: {
          apiVersion: 'v1',
          kind: 'Service',
          metadata: {
            name: 'cc-container',
          },
          spec: {
            type: 'ClusterIP',
            selector: {
              app: 'learn-sdn-hub-assignment'
            },
            ports: [
              {
                protocol: 'TCP',
                port: 22,
                targetPort: 22
              }
            ]
          }
        }
      })

      let attempts = 0;
      while (attempts < 60) {
        const pod = await coreV1Api.readNamespacedPod({
          name: podName,
          namespace: namespace,
        });

        const phase = pod.status?.phase;
        const ip = pod.status?.podIP;

        if (phase === 'Running' && ip) {
          return {
            instance: "group-0-assingmtn-name",
            providerInstanceStatus: 'Running',
            IPAddress: "cc-container-x-test-x-vcluster-group-0.vcluster-group-0",
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
    //const namespace = 'learn-sdn-hub'; // Target Kubernetes namespace
    return {
          instance: instance,
          providerInstanceStatus: "l",
          IPAddress: "cc-container-x-test-x-vcluster-group-0.vcluster-group-0",
          SSHPort: 22,
          LanguageServerPort: 3000,
        };
    /*try {
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
    } catch (err) {
      if (err instanceof AxiosError) {
        if (err.status === 404) {
          throw new Error(`K8sProvider: Pod ${instance} not found.`);
        }
      } 
      console.error(`K8sProvider: Error getting pod ${instance}:`, err);
      throw err;
    }*/
  }

  async deleteServer(_instance: string): Promise<void> {
    const {coreV1Api} = new K8sClient(await K8sClient.getVClusterConfig(0))

    await coreV1Api.deleteNamespace({name: "test"})
  }
}
