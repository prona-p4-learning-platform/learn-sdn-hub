import * as k8s from '@kubernetes/client-node';
import * as fs from 'fs';

// Interface for constructor parameters
export interface K8sClientConfig {
  apiUrl: string;
  token: string;
  ca: string;
}

export class K8sClient {
  private kubeConfig: k8s.KubeConfig;
  public coreV1Api: k8s.CoreV1Api;
  public appsV1Api: k8s.AppsV1Api;

  /**
   * Creates a new API client for the specified cluster.
   * Uses the provided parameters (Host, Token, CA) for the connection.
   */
  constructor(config: K8sClientConfig) {
    this.kubeConfig = new k8s.KubeConfig();

    // Configure the cluster based on parameters
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
}