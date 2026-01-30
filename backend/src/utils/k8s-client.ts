import * as k8s from '@kubernetes/client-node';
import * as fs from 'node:fs';

// Interface for constructor parameters
export interface K8sClientConfig {
  apiUrl: string;
  token: string;
  ca: string;
}

interface VClusterHelmRelease {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace: string;
  };
  spec: {
    interval: string;
    releaseName: string;
    chart: {
      spec: {
        chart: string;
        version: string;
        sourceRef: {
          kind: string;
          name: string;
          namespace: string;
        };
      };
    };
    targetNamespace: string;
    install: {
      createNamespace: boolean;
    };
    upgrade: {
      remediation: {
        remediateLastFailure: boolean;
      };
    };
    values: {
      telemetry: {
        enabled: boolean;
      };
      deploy: {
        ingressNginx: {
          enabled: boolean;
        };
      };
    };
  };
}

export class K8sClient {
  private readonly kubeConfig: k8s.KubeConfig;
  public coreV1Api: k8s.CoreV1Api;
  public appsV1Api: k8s.AppsV1Api;
  public customObjectsApi: k8s.CustomObjectsApi;

  private readonly fluxGroup = 'helm.toolkit.fluxcd.io';
  private readonly fluxVersion = 'v2';
  private readonly fluxNamespace = 'flux-system';
  private readonly fluxPlural = 'helmreleases';

  /**
   * Creates a new API client for the specified cluster.
   * Uses the provided parameters (Host, Token, CA) for the connection.
   */
  constructor(config: K8sClientConfig) {
    this.kubeConfig = new k8s.KubeConfig();

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
    this.customObjectsApi = this.kubeConfig.makeApiClient(k8s.CustomObjectsApi);
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

  /**
   * Generates the HelmRelease object for a vcluster based on the group number.
   * @param groupNumber The group number (e.g., "02")
   */
  private getVClusterHelmReleaseObject(groupNumber: string): VClusterHelmRelease {
    const clusterName = `vcluster-${groupNumber}`;
    const targetNamespace = `cluster-${groupNumber}`;

    return {
      apiVersion: `${this.fluxGroup}/${this.fluxVersion}`,
      kind: 'HelmRelease',
      metadata: {
        name: clusterName,
        namespace: this.fluxNamespace,
      },
      spec: {
        interval: '10m',
        releaseName: clusterName,
        chart: {
          spec: {
            chart: 'vcluster',
            version: '0.30.3',
            sourceRef: {
              kind: 'HelmRepository',
              name: 'loft',
              namespace: this.fluxNamespace,
            },
          },
        },
        targetNamespace: targetNamespace,
        install: {
          createNamespace: true,
        },
        upgrade: {
          remediation: {
            remediateLastFailure: true,
          },
        },
        values: {
          telemetry: {
            enabled: false,
          },
          deploy: {
            ingressNginx: {
              enabled: false,
            },
          },
        },
      },
    };
  }

  /**
   * Creates a vcluster HelmRelease for the specified group.
   * Assumes the 'loft' HelmRepository already exists.
   * @param groupNumber The group number (e.g. "02")
   */
  public async createVCluster(groupNumber: string): Promise<void> {
    // Generate HelmRelease object
    const helmReleaseBody = this.getVClusterHelmReleaseObject(groupNumber);

    // Create resource in cluster
    try {
      // Using object-based signature for request
      await this.customObjectsApi.createNamespacedCustomObject({
        group: this.fluxGroup,
        version: this.fluxVersion,
        namespace: this.fluxNamespace,
        plural: this.fluxPlural,
        body: helmReleaseBody,
      });
      console.log(`Successfully created vcluster HelmRelease for group ${groupNumber}`);
    } catch (error: any) {
      // Handle case where it might already exist or other errors
      if (error.response?.statusCode === 409) {
        console.warn(`vcluster HelmRelease for group ${groupNumber} already exists.`);
      } else {
        console.error(`Failed to create vcluster HelmRelease for group ${groupNumber}:`, error);
        throw error;
      }
    }
  }

  /**
   * Deletes a vcluster HelmRelease by name.
   * @param vClusterName The name of the vcluster to delete (e.g., "vcluster-02")
   */
  public async deleteVCluster(vClusterName: string): Promise<void> {
    try {
      await this.customObjectsApi.deleteNamespacedCustomObject({
        group: this.fluxGroup,
        version: this.fluxVersion,
        namespace: this.fluxNamespace,
        plural: this.fluxPlural,
        name: vClusterName,
      });
      console.log(`Successfully deleted vcluster HelmRelease: ${vClusterName}`);
    } catch (error: any) {
      if (error.response?.statusCode === 404) {
        console.warn(`vcluster HelmRelease ${vClusterName} not found.`);
      } else {
        console.error(`Failed to delete vcluster HelmRelease ${vClusterName}:`, error);
        throw new error;
      }
    }
  }
}