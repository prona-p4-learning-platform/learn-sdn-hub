import { Client } from "ssh2";
import fs from "fs";

export interface KubernetesCert {
  key: string;
  crt: string;
}

export default class KubernetesManager {
  /**
   * This function creates a new user in the Kubernetes cluster and returns the user's certificate.
   * @param username - The username of the user to be created.
   * @returns A promise that resolves with the user's certificate.
   */
  createUserCert(username: string): Promise<KubernetesCert> {
    return new Promise((resolve, reject) => {
      const certData: string[] = [];
      const mgmtSSHConnection = new Client();

      mgmtSSHConnection
        .on("ready", () => {
          mgmtSSHConnection.exec(
            `./create_user_cert.sh ${username}`,
            (err, stream) => {
              if (err) {
                console.log(
                  "KubernetesManager: Could not create user certificate.\n" +
                    err.message,
                );
                reject(new Error("Could not create user certificate."));
              }

              stream.on("data", (data: string) => {
                certData.push(data);
                console.log(`KubernetesManager: ${data}`);
              });
              stream.stderr.on("data", (data: undefined) => {
                console.log(`KubernetesManager: ${data}`);
                reject(new Error(data));
              });
              stream.on("close", () => {
                console.log(
                  `KubernetesManager: User certificate created for ${username}.`,
                );

                // check if cert was created
                if (certData.length < 3) {
                  reject(
                    new Error(
                      "KubernetesManager: Certificate was already created. Try to download it instead.",
                    ),
                  );
                }

                try {
                  const k8sCert = this.parseCert(certData);
                  resolve(k8sCert);
                } catch (err: unknown) {
                  console.log(
                    "KubernetesManager: Could not parse certificate data.\n" +
                      (err as Error).message,
                  );
                  reject(new Error("Could not parse certificate data."));
                }
              });
            },
          );
        })
        .on("error", (err) => {
          console.log(
            "KubernetesManager: Could not connect to Kubernetes management node.\n" +
              err.message,
          );
          reject(err);
        })
        .connect({
          host: process.env.K8S_MGMT_SVC_IP,
          port: 22,
          username: "root",
          password: process.env.K8S_MGMT_PASSWORD,
        });
    });
  }

  /**
   * Parses the certificate data and returns a KubernetesCert object.
   * @param certData - The certificate data to be parsed.
   * @returns A KubernetesCert object.
   */
  parseCert(certData: string[]): KubernetesCert {
    // data comes in as an array of strings in this format:
    // KEY (base64)--------------------CERTIFICATE (base64)
    const crt = certData[0];
    const separator = certData[1];
    const key = certData[2];

    // validate the format
    if (!key || !separator || !crt) {
      throw new Error("KubernetesManager: Certificate data is invalid.");
    }
    // TODO: CHECK separator !== "--------------------"

    const k8sCert: KubernetesCert = {
      key: key,
      crt: crt,
    };

    return k8sCert;
  }

  /**
   * This function sets up a new namespace in the Kubernetes cluster for a user.
   * @param username - The username of the user for whom the namespace is to be created.
   * @returns A promise that resolves when the namespace is created.
   */
  setupNamespace(username: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const mgmtSSHConnection = new Client();

      mgmtSSHConnection
        .on("ready", () => {
          mgmtSSHConnection.exec(
            `./setup_k8s.sh ${username}`,
            (err, stream) => {
              if (err) {
                console.log(
                  "KubernetesManager: Could not setup K8S.\n" + err.message,
                );
                reject(err);
              }

              stream.on("data", (data: undefined) => {
                console.log(`KubernetesManager: ${data}`);
              });
              stream.stderr.on("data", (data: undefined) => {
                console.log(`KubernetesManager: ${data}`);
              });
              stream.on("close", () => {
                console.log(
                  `KubernetesManager: User setup for ${username} successful.`,
                );
                resolve();
              });
            },
          );
        })
        .on("error", (err) => {
          console.log(
            "KubernetesManager: Could not connect to Kubernetes management node.\n" +
              err.message,
          );
          reject(err);
        })
        .connect({
          host: process.env.K8S_MGMT_SVC_IP,
          port: 22,
          username: "root",
          password: process.env.K8S_MGMT_PASSWORD,
        });
    });
  }

  /**
   * This function undeploys a namespace in the Kubernetes cluster.
   * @param username - The username of the user whose namespace is to be undeployed.
   * @returns A promise that resolves when the namespace is undeployed.
   */
  undeployNamespace(username: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const mgmtSSHConnection = new Client();

      mgmtSSHConnection
        .on("ready", () => {
          mgmtSSHConnection.exec(
            `./undeploy_k8s.sh ${username}`,
            (err, stream) => {
              if (err) {
                console.log(
                  "KubernetesManager: Could not undeploy K8S namespace.\n" +
                    err.message,
                );
                reject(err);
              }

              stream.on("data", (data: undefined) => {
                console.log(`KubernetesManager undeploy: ${data}`);
              });
              stream.stderr.on("data", (data: undefined) => {
                console.log(`KubernetesManager undeploy: ${data}`);
                reject(new Error(data));
              });
              stream.on("close", () => {
                console.log(
                  `KubernetesManager: Undeploy for ${username} successful.`,
                );
                resolve();
              });
            },
          );
        })
        .on("error", (err) => {
          console.log(
            "KubernetesManager: Could not connect to Kubernetes management node.\n" +
              err.message,
          );
          reject(err);
        })
        .connect({
          host: process.env.K8S_MGMT_SVC_IP,
          port: 22,
          username: "root",
          password: process.env.K8S_MGMT_PASSWORD,
        });
    });
  }

  /**
   * This function builds a namespace name for a user based on the user's group number.
   * @param groupNumber - The group number of the user.
   * @returns The namespace name as a string.
   */
  buildNamespaceName(groupNumber: number): string {
    return `ns-group-${groupNumber}`;
  }

  getUserCert(username: string): Promise<KubernetesCert> {
    return new Promise((resolve, reject) => {
      const certData: string[] = [];
      const mgmtSSHConnection = new Client();

      mgmtSSHConnection
        .on("ready", () => {
          mgmtSSHConnection.exec(
            `./get_user_cert.sh ${username}`,
            (err, stream) => {
              if (err) {
                console.log(
                  "KubernetesManager: Could not get user certificate.\n" +
                    err.message,
                );
                reject(err);
              }

              stream.on("data", (data: string) => {
                certData.push(data);
                console.log(`KubernetesManager: ${data}`);
              });
              stream.stderr.on("data", (data: undefined) => {
                console.log(`KubernetesManager: ${data}`);
                reject(new Error(data));
              });
              stream.on("close", () => {
                console.log(
                  `KubernetesManager: User certificate retrieved for ${username}.`,
                );

                // check if cert was created
                if (certData.length < 3) {
                  reject(
                    new Error(
                      "KubernetesManager: Certificate was not found. Try to create it instead.",
                    ),
                  );
                }

                try {
                  const k8sCert = this.parseCert(certData);
                  resolve(k8sCert);
                } catch (err: unknown) {
                  console.log(
                    "KubernetesManager: Could not parse certificate data.\n" +
                      (err as Error).message,
                  );
                  reject(new Error("Could not parse certificate data."));
                }
              });
            },
          );
        })
        .on("error", (err) => {
          console.log(
            "KubernetesManager: Could not connect to Kubernetes management node.\n" +
              err.message,
          );
          reject(err);
        })
        .connect({
          host: process.env.K8S_MGMT_SVC_IP,
          port: 22,
          username: "root",
          password: process.env.K8S_MGMT_PASSWORD,
        });
    });
  }

  /**
   * This function creates a kubeconfig file for a user.
   * @param cert - The user's certificate.
   * @param username - The username of the user.
   * @returns The kubeconfig file as a string.
   */
  getKubeconfig(cert: KubernetesCert, username: string): string {
    return `
apiVersion: v1
clusters:
  - cluster:
      certificate-authority-data: ${process.env.K8S_CERT_AUTH_DATA}
      server: ${process.env.K8S_CLUSTER_IP}
    name: learn-sdn-hub-cluster
contexts:
  - context:
      cluster: learn-sdn-hub-cluster
      namespace: ${username}
      user: ${username}-user
    name: ${username}-context
current-context: ${username}-context
kind: Config
preferences: {}
users:
  - name: ${username}-user
    user:
      client-certificate-data: ${cert.crt}
      client-key-data: ${cert.key}
 `;
  }

  /**
   * This function stores a kubeconfig file on the local filesystem. It overwrites any existing file.
   * @param kubeconfig - The kubeconfig file to be stored.
   * @param groupNumber - The group number of the user.
   */
  storeLocalKubeconfig(kubeconfig: string, groupNumber: number): void {
    const localPath = process.env.KUBECTL_STORE_PATH || "/tmp";

    fs.writeFileSync(
      `${localPath}/kubeconfig-group-${groupNumber}`,
      kubeconfig,
    );
  }

  /**
   * This function deletes a kubeconfig file from the local filesystem.
   * @param groupNumber - The group number of the user.
   */
  deleteLocalKubeconfig(groupNumber: number): void {
    const localPath = process.env.KUBECTL_STORE_PATH || "/tmp";

    if (fs.existsSync(`${localPath}/kubeconfig-group-${groupNumber}`)) {
      fs.unlinkSync(`${localPath}/kubeconfig-group-${groupNumber}`);
    }
  }

  /**
   * Get the path to the kubeconfig file on the local filesystem.
   * @param groupNumber - The group number of the user.
   * @returns The path to the kubeconfig file as a string.
   */
  getLocalKubeconfigPath(groupNumber: number): string {
    const localPath = process.env.KUBECTL_STORE_PATH || "/tmp";

    if (!fs.existsSync(`${localPath}/kubeconfig-group-${groupNumber}`)) {
      throw new Error("KubernetesManager: Kubeconfig file not found.");
    }

    return `${localPath}/kubeconfig-group-${groupNumber}`;
  }
}
