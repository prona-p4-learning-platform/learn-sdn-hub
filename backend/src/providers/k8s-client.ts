
// pseudo k8s-client for KubernetesApplication



import * as k8s from "@kubernetes/client-node";
import { AssignmentInfo } from "./ClusterProvider";

export class K8sClient {
  private kc: k8s.KubeConfig;
  private coreV1: k8s.CoreV1Api;
  private appsV1: k8s.AppsV1Api;

  constructor(kubeconfigPath?: string) {
    this.kc = new k8s.KubeConfig();

    if (kubeconfigPath) {
      this.kc.loadFromFile(kubeconfigPath);
    } else {
      this.kc.loadFromDefault();
    }

    this.coreV1 = this.kc.makeApiClient(k8s.CoreV1Api);
    this.appsV1 = this.kc.makeApiClient(k8s.AppsV1Api);
  }

  async createVcluster(groupNumber: number, username: string): Promise<void> {
    console.log(`[k8s-client] createVcluster: group=${groupNumber}, user=${username}`);
    await new Promise(r => setTimeout(r, 100));
  }

  async deleteVcluster(groupNumber: number): Promise<void> {
    console.log(`[k8s-client] deleteVcluster: group=${groupNumber}`);
    await new Promise(r => setTimeout(r, 100));
  }

  async createAssignment(groupNumber: number, assignmentName: string): Promise<AssignmentInfo> {
    console.log(`[k8s-client] createAssignment: group=${groupNumber}, assignment=${assignmentName}`);
    await new Promise(r => setTimeout(r, 100));
    return {
      group: 1,
      assignment: "1",
      status: "Succeeded",
      endpoints: {
        webUrl: "",
        portForward: [
          {
            localPort: 6060,
            podName: "Pod1",
            containerPort: 6061
          }
        ]
      }
    }
  }

  async deleteAssignment(groupNumber: number, assignmentName: string): Promise<void> {
    console.log(`[k8s-client] deleteAssignment: group=${groupNumber}, assignment=${assignmentName}`);
    await new Promise(r => setTimeout(r, 100));
  }

  async getAssignmentServiceInfo(
    groupNumber: number,
    assignmentName: string
  ): Promise<{
    ip: string;
    sshPort: number;
    languageServerPort: number;
    remoteDesktopPort: number | undefined;
    status: string;
  }> {
    console.log(`[k8s-client] getAssignmentServiceInfo: group=${groupNumber}, assignment=${assignmentName}`);

    return {
      ip: `10.0.${groupNumber}.15`,
      sshPort: 2222,
      languageServerPort: 3001,
      remoteDesktopPort: 3002,
      status: "Running"
    };
  }
}
