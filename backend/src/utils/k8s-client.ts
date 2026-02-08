import * as k8s from '@kubernetes/client-node';
import * as fs from 'fs';
import z from 'zod';

// Interface for constructor parameters
export interface K8sClientConfig {
  apiUrl: string
  token?: string
  ca: string
  clientCert?: string
  clientKey?: string
}

export class K8sClient {
  private kubeConfig: k8s.KubeConfig;
  public coreV1Api: k8s.CoreV1Api;
  public appsV1Api: k8s.AppsV1Api;

  private static vClusterConficSchema = z.object({
    metadata: z.object({
      name: z.string()
    }),
    data: z.object({
      "certificate-authority": z.string(),
      "client-certificate": z.string(),
      "client-key": z.string()
    })
  }).transform((data) => {
    return {
      ca: data.data["certificate-authority"],
      clientCert: data.data["client-certificate"],
      clientKey: data.data["client-key"]
    }
  })

  /**
   * Creates a new API client for the specified cluster.
   * Uses the provided parameters (Host, Token, CA) for the connection.
   */
  constructor(config: K8sClientConfig) {
    this.kubeConfig = new k8s.KubeConfig();

    // Configure the cluster based on parameters
    if(config.token) {
      this.kubeConfig.loadFromOptions({
        clusters: [
          {
            name: 'current-cluster',
            server: config.apiUrl,
            caData: config.ca,
            skipTLSVerify: false,
          },
        ],
        users: [
          {
            name: 'current-user',
            token: config.token,
          },
        ],
        contexts: [
          {
            name: 'current-context',
            user: 'current-user',
            cluster: 'current-cluster',
          },
        ],
        currentContext: 'current-context',
      });
    } else if(config.clientCert && config.clientKey && !config.token) {
      this.kubeConfig.loadFromOptions({
        clusters: [
          {
            name: 'current-cluster',
            server: config.apiUrl,
            caData: config.ca,
            skipTLSVerify: false,
          },
        ],
        users: [
          {
            name: 'current-user',
            certData: config.clientCert,
            keyData: config.clientKey
          },
        ],
        contexts: [
          {
            name: 'current-context',
            user: 'current-user',
            cluster: 'current-cluster',
          },
        ],
        currentContext: 'current-context',
      });
    }

    // Create API instances
    this.coreV1Api = this.kubeConfig.makeApiClient(k8s.CoreV1Api);
    this.appsV1Api = this.kubeConfig.makeApiClient(k8s.AppsV1Api);
  }

  /**
   * Helper function: Reads configuration from standard K8s environment variables and secrets.
   * This is used to generate parameters for the constructor when running inside a pod.
   */
  public static getInClusterConfig(): K8sClientConfig {
    const host = process.env.KUBERNETES_SERVICE_HOST;
    const port = process.env.KUBERNETES_SERVICE_PORT;
    const serviceAccountPath = '/var/run/secrets/kubernetes.io/serviceaccount';

    if (!host || !port) {
      throw new Error('KUBERNETES_SERVICE_HOST or PORT not defined.');
    }

    const token = fs.readFileSync(`${serviceAccountPath}/token`, 'utf8');
    const ca = fs.readFileSync(`${serviceAccountPath}/ca.crt`, 'base64'); // Read as Base64 for loadFromOptions

    return {
      apiUrl: `https://${host}:${port}`,
      token: token,
      ca: ca,
    };
  }

  public static getConfig():K8sClientConfig {
    if(process.env.KUBERNETES_SERVICE_HOST && process.env.KUBERNETES_SERVICE_PORT) {
      return this.getInClusterConfig()
    } else {
      const tokenPath = '../dev-stack/k8s/cluster-config/token'; 
      const caPath = '../dev-stack/k8s/cluster-config/ca.crt';
      const apiUrl = 'https://127.0.0.1:7428';
      const token = fs.readFileSync(tokenPath, 'utf8').trim();
      const caBuffer = fs.readFileSync(caPath);
      const caBase64 = caBuffer.toString('base64');

      return {
        apiUrl: apiUrl,
        token: token,
        ca: caBase64
      };
    }
  }

  public static async getVClusterConfig(groupId:number):Promise<K8sClientConfig> {
    const {coreV1Api} = new K8sClient(this.getConfig())
    const res = await coreV1Api.readNamespacedSecret({name: `vc-vcluster-group-${groupId}`, namespace: `vcluster-group-${groupId}`})
    const config = this.vClusterConficSchema.parse(res)

    return {
      apiUrl: `https://vcluster-group-${groupId}.vcluster-group-${groupId}`,
      ...config
    }
  }
}