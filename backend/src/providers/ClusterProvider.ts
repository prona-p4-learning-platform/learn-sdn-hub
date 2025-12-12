// Pseudo ClusterProvider for pseudo k8s-client.ts because:

// InterfaceProvider only accepts createServer, deleteServer, getServer 
// --> we need to change InterfaceProvider and probably a lot more or create a new InterfaceProvider called ClusterProvider and a new Api.ts
// -> new problem: api/environment in api.ts depends a lot on InterfaceProvider

export interface ClusterProvider {
  createVcluster(group: number, username: string): Promise<void>;
  deleteVcluster(group: number): Promise<void>;

  createAssignment(group: number, assignment: string): Promise<AssignmentInfo>;
  deleteAssignment(group: number, assignment: string): Promise<void>;
}

export interface AssignmentInfo {
  group: number;
  assignment: string;
  status: "Pending" | "Running" | "Failed" | "Succeeded";
  endpoints?: {
    webUrl?: string;        
    portForward?: {          
      localPort: number;
      podName: string;
      containerPort: number;
    }[];
  };
}