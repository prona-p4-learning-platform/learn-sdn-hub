import * as k8s from '@kubernetes/client-node';

export class K8sClient {
  private kubeConfig: k8s.KubeConfig;
  private coreApi: k8s.CoreV1Api;
  private customApi: k8s.CustomObjectsApi;

  constructor() {
    this.kubeConfig = new k8s.KubeConfig();
    
    // 1. Aus KUBECONFIG Env Var 
    // 2. ~/.kube/config 
    // 3. In-Cluster ServiceAccount Token
    this.kubeConfig.loadFromDefault();

    // Core API für Standard-Ressourcen (Pods, Namespaces, etc.)
    this.coreApi = this.kubeConfig.makeApiClient(k8s.CoreV1Api);

    // Custom Objects API für CRDs (wie vClusters)
    this.customApi = this.kubeConfig.makeApiClient(k8s.CustomObjectsApi);
  }

  /**
   * Generische Funktion für Aufrufe an die Kubernetes API.
   * Mit @kubernetes/client-node wird dies seltener direkt benötigt, 
   * da typisierte Clients existieren. Hier als Wrapper um CustomObjectsApi oder raw Requests.
   */
  async callApi(path: string, method: string = 'GET', body?: any): Promise<any> {
    // TODO: Implementierung eines generischen Calls, falls die typisierten Clients nicht reichen.
    // Man könnte hier fetch/request Logik nutzen, die auf this.kubeConfig basiert.
    console.log(`[Placeholder] callApi: ${method} ${path}`);
    throw new Error("Method 'callApi' not implemented.");
  }

  /**
   * Erstellt einen neuen vCluster für eine Gruppe (CRD).
   * Nutzt intern voraussichtlich this.customApi.createNamespacedCustomObject(...)
   * @param groupNumber Die Nummer der Gruppe
   */
  async createVcluster(groupNumber: number): Promise<void> {
    // TODO: CRD "VirtualCluster" via customApi erstellen
    console.log(`[Placeholder] createVcluster for group ${groupNumber}`);
    throw new Error("Method 'createVcluster' not implemented.");
  }

  /**
   * Löscht einen vCluster (CRD).
   * Nutzt intern voraussichtlich this.customApi.deleteNamespacedCustomObject(...)
   * @param groupNumber Die Nummer der Gruppe
   */
  async deleteVcluster(groupNumber: number): Promise<void> {
    // TODO: CRD "VirtualCluster" via customApi löschen
    console.log(`[Placeholder] deleteVcluster for group ${groupNumber}`);
    throw new Error("Method 'deleteVcluster' not implemented.");
  }

  /**
   * Erstellt ein neues Assignment im vCluster der Gruppe.
   * ACHTUNG: Hierfür muss vermutlich erst die Kubeconfig des vClusters abgerufen werden,
   * um einen neuen Client zu instanziieren, der auf den vCluster zeigt.
   * @param groupNumber Die Nummer der Gruppe
   * @param assignmentName Name des Assignments
   */
  async createAssignment(groupNumber: number, assignmentName: string): Promise<void> {
    // TODO: 
    // 1. Kubeconfig des vClusters holen (z.B. aus Secret)
    // 2. Neuen k8s Client für diesen vCluster erstellen
    // 3. Ressourcen (Deployment/Pod) dort anlegen
    console.log(`[Placeholder] createAssignment '${assignmentName}' in vCluster of group ${groupNumber}`);
    throw new Error("Method 'createAssignment' not implemented.");
  }

  /**
   * Löscht ein Assignment im vCluster der Gruppe.
   * @param groupNumber Die Nummer der Gruppe
   * @param assignmentName Name des Assignments
   */
  async deleteAssignment(groupNumber: number, assignmentName: string): Promise<void> {
    // TODO: Ressourcen im vCluster löschen
    console.log(`[Placeholder] deleteAssignment '${assignmentName}' in vCluster of group ${groupNumber}`);
    throw new Error("Method 'deleteAssignment' not implemented.");
  }
}