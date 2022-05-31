import {
  InstanceProvider,
  VMEndpoint,
  InstanceNotFoundErrorMessage,
} from "./Provider";
import Dockerode from "dockerode";
import { ToadScheduler, SimpleIntervalJob, AsyncTask } from "toad-scheduler";
import { Client } from "ssh2";

const schedulerIntervalSeconds = 10;

export default class DockerProvider implements InstanceProvider {
  // Docker config
  // ssh needs username, password, key etc. to be implemented - check docker-modem/dockerode
  private protocol: "http" | "https" | "ssh";
  private host: string;
  private port: number;
  private socketPath: string;
  private image: string;
  private cmd: string;

  // Docker Provider config
  private maxInstanceLifetimeMinutes: number;
  private containerStartTimeoutSeconds = 60;
  private containerSSHTimeoutSeconds = 60;

  // SSH and LanguageServer Port config
  private sshPort: number;
  private lsPort: number;

  private dockerodeInstance: Dockerode;

  private providerInstance: DockerProvider;

  constructor() {
    if (process.env.DOCKER_PROTOCOL === "ssh") {
      this.protocol = "ssh";
    } else if (process.env.DOCKER_PROTOCOL === "https") {
      this.protocol = "https";
    } else {
      this.protocol = "http";
    }
    this.host = process.env.DOCKER_HOST;
    this.port = parseInt(process.env.DOCKER_PORT);
    this.socketPath = process.env.DOCKER_SOCKET_PATH;
    this.image = process.env.DOCKER_IMAGE;
    this.cmd = process.env.DOCKER_CMD;

    this.maxInstanceLifetimeMinutes = parseInt(
      process.env.DOCKER_MAX_INSTANCE_LIFETIME_MINUTES
    );

    this.dockerodeInstance = new Dockerode({
      socketPath: this.socketPath,
      protocol: this.protocol,
      host: this.host,
      port: this.port,
    });

    this.providerInstance = this;

    // better use env var to allow configuration of port numbers?
    this.sshPort = 22;
    this.lsPort = 3005;

    const scheduler = new ToadScheduler();

    const task = new AsyncTask(
      "DockerProvider Instance Pruning Task",
      () => {
        return this.pruneContainerInstance().then(() => {
          //console.log("DockerProvider: Pruning finished...");
        });
      },
      (err: Error) => {
        console.log(
          "DockerProvider: Could not prune stale container instances..." + err
        );
      }
    );
    const job = new SimpleIntervalJob(
      { seconds: schedulerIntervalSeconds, runImmediately: true },
      task
    );

    scheduler.addSimpleIntervalJob(job);
  }

  async createServer(
    username: string,
    groupNumber: number,
    environment: string,
    image?: string,
    dockerCmd?: string,
    dockerSupplementalPorts?: string[]
  ): Promise<VMEndpoint> {
    const providerInstance = this.providerInstance;
    const cri = providerInstance.dockerodeInstance;

    return new Promise((resolve, reject) => {
      const containerImage = image ?? providerInstance.image;
      const containerCmd = dockerCmd ?? providerInstance.cmd;
      // Default ports to be exposed and bound are SSH and LSP:
      // should be always tcp for ssh and lsp - at least for now? ;)
      let containerPorts = [this.sshPort + "/tcp", this.lsPort + "/tcp"];
      // append additionally configured ports
      if (dockerSupplementalPorts.length > 0)
        containerPorts = containerPorts.concat(dockerSupplementalPorts);

      const exposedPorts = containerPorts
        .map((port) => '"' + port + '": {},')
        .join(" ")
        .slice(0, -1);
      const portBindings = containerPorts
        .map((port) => '"' + port + '": [{}],')
        .join(" ")
        .slice(0, -1);

      // make priviledged configurable, possibly allowing fine-grained capabilities
      const options =
        '{ "Image": "' +
        containerImage +
        '", "name": "' +
        username +
        "-" +
        groupNumber +
        "-" +
        environment +
        '", "Labels": { "learn_sdn_hub_user": "' +
        username +
        '", "learn_sdn_hub_group": "' +
        groupNumber.toString() +
        '", "learn_sdn_hub_assignment": "' +
        environment +
        '" }, "Cmd": ["' +
        containerCmd +
        '"], "Tty": true, "ExposedPorts": { ' +
        exposedPorts +
        ' }, "HostConfig": { "PortBindings": { ' +
        portBindings +
        ' }, "Privileged": true, "AutoRemove": true } }';

      const containerCreateOptions = JSON.parse(options);

      cri
        .createContainer(containerCreateOptions)
        .then((container) => {
          container
            .start()
            .then(() => {
              providerInstance
                .waitForServerAddresses(
                  container.id,
                  providerInstance.containerStartTimeoutSeconds
                )
                .then(() => {
                  container
                    .inspect()
                    .then((response) => {
                      const portMap = response.NetworkSettings.Ports;

                      // improve selection of array field?

                      // only use Host defined for SSH
                      const sshBindingHost =
                        portMap[Object.keys(portMap)[0]][0].HostIp;

                      const sshBindingPort = parseInt(
                        portMap[Object.keys(portMap)[0]][0].HostPort
                      );
                      const lsBindingPort = parseInt(
                        portMap[Object.keys(portMap)[1]][0].HostPort
                      );
                      const expirationDate = new Date(
                        Date.now() +
                          providerInstance.maxInstanceLifetimeMinutes *
                            60 *
                            1000
                      );
                      providerInstance
                        .waitForServerSSH(
                          sshBindingHost,
                          sshBindingPort,
                          providerInstance.containerSSHTimeoutSeconds
                        )
                        .then(() => {
                          return resolve({
                            instance: response.Id,
                            providerInstanceStatus:
                              "Environment will be deleted at " +
                              expirationDate.toLocaleString(),
                            IPAddress: sshBindingHost,
                            SSHPort: sshBindingPort,
                            LanguageServerPort: lsBindingPort,
                          });
                        })
                        .catch((err) => {
                          return reject(
                            new Error(
                              "DockerProvider: Could not connect to container using SSH " +
                                err
                            )
                          );
                        });
                    })
                    .catch((err) => {
                      return reject(
                        new Error(
                          "DockerProvider: Could not inspect started container to get port and ip address: " +
                            err
                        )
                      );
                    });
                })
                .catch((err) => {
                  return reject(
                    new Error(
                      "DockerProvider: Could not get container addresses: " +
                        err
                    )
                  );
                });
            })
            .catch((err) => {
              return reject(
                new Error("DockerProvider: Could not start container " + err)
              );
            });
        })
        .catch((err) => {
          return reject(
            new Error("DockerProvider: Could not create container: " + err)
          );
        });
    });
  }

  async getServer(instance: string): Promise<VMEndpoint> {
    const providerInstance = this.providerInstance;
    const cri = providerInstance.dockerodeInstance;

    return new Promise((resolve, reject) => {
      cri
        .getContainer(instance)
        .inspect()
        .then((response) => {
          const portMap = response.NetworkSettings.Ports;

          // improve selection of array field?

          // only use Host defined for SSH
          const sshBindingHost = portMap[Object.keys(portMap)[0]][0].HostIp;

          const sshBindingPort = parseInt(
            portMap[Object.keys(portMap)[0]][0].HostPort
          );
          const lsBindingPort = parseInt(
            portMap[Object.keys(portMap)[1]][0].HostPort
          );

          const expirationDate = new Date(
            new Date(response.Created).getTime() +
              providerInstance.maxInstanceLifetimeMinutes * 60 * 1000
          );
          // dummy
          return resolve({
            instance: response.Id,
            providerInstanceStatus:
              "Environment will be deleted at " +
              expirationDate.toLocaleString(),
            IPAddress: sshBindingHost,
            SSHPort: sshBindingPort,
            LanguageServerPort: lsBindingPort,
          });
        })
        .catch((err) => {
          if (err.reason === "no such container") {
            return reject(new Error(InstanceNotFoundErrorMessage));
          } else {
            return reject(
              new Error(
                "DockerProvider: Could not inspect container to get port and ip address: " +
                  err
              )
            );
          }
        });
    });
  }

  async deleteServer(instance: string): Promise<void> {
    const providerInstance = this.providerInstance;
    const cri = providerInstance.dockerodeInstance;

    return new Promise((resolve, reject) => {
      const container = cri.getContainer(instance);
      container
        .kill()
        .then(() => {
          container
            .remove()
            .then(() => {
              return resolve();
            })
            .catch((err) => {
              if (err.statusCode === 404) {
                // container does not exist anymore, removal not necessary
                return resolve();
              } else if (err.statusCode === 409) {
                // container removal already in progress
                return resolve();
              } else {
                return reject(
                  new Error(
                    "DockerProvider: Could not remove container: " + err
                  )
                );
              }
            });
        })
        .catch((err) => {
          return reject(
            new Error("DockerProvider: Could not kill container: " + err)
          );
        });
    });
  }

  async pruneContainerInstance(): Promise<void> {
    const providerInstance = this.providerInstance;
    const cri = providerInstance.dockerodeInstance;

    console.log("DockerProvider: Pruning stale container instances...");

    return new Promise((resolve, reject) => {
      // get containers older than timestamp
      const deadline = new Date(
        Date.now() - providerInstance.maxInstanceLifetimeMinutes * 60 * 1000
      );
      console.log(
        "DockerProvider: Pruning container instances older than " +
          deadline.toISOString()
      );
      cri.listContainers((err, containers) => {
        if (err !== null) {
          return reject(
            new Error(
              "DockerProvider: Failed to get list of server instances to prune. " +
                err
            )
          );
        }
        containers.forEach((container) => {
          if (container.Labels["learn_sdn_hub_user"] !== undefined) {
            // server instance has learn_sdn_hub metadata and is assumed to be created by learn-sdn-hub
            const timestampCreated = new Date(container.Created * 1000);
            if (timestampCreated < deadline) {
              console.log(
                container.Names +
                  " was created at " +
                  timestampCreated +
                  "and should be deleted"
              );
              providerInstance.deleteServer(container.Id);
            }
          }
        });
        return resolve();
      });
    });
  }

  waitForServerAddresses(serverId: string, timeout: number): Promise<void> {
    const providerInstance = this.providerInstance;
    const cri = providerInstance.dockerodeInstance;

    return new Promise<void>(async (resolve, reject) => {
      let resolved = false;
      let rejected = false;
      // get server adresses
      while (timeout > 0 && resolved === false && rejected === false) {
        console.log(
          "DockerProvider: Waiting for container to get ready... (timeout: " +
            timeout +
            ")"
        );

        cri
          .getContainer(serverId)
          .inspect()
          .then((response) => {
            if (response.State.Running === false) {
              rejected = true;
              return reject(
                new Error(
                  "DockerProvider: Container was not stated. Check image and cmd used to init the container."
                )
              );
            } else {
              const portMap = response.NetworkSettings.Ports;
              if (Object.keys(portMap).length == 0) {
                rejected = true;
                return reject(
                  new Error(
                    "DockerProvider: Container does not provide any ports. Per default the image must provide SSH and LSP to allow collaborative terminals and file editing."
                  )
                );
              } else {
                // improve selection of array field?

                // only use Host defined for SSH
                const sshBindingHost =
                  portMap[Object.keys(portMap)[0]][0].HostIp;

                const sshBindingPort =
                  portMap[Object.keys(portMap)[0]][0].HostPort;
                const lsBindingPort =
                  portMap[Object.keys(portMap)[1]][0].HostPort;
                if (
                  sshBindingHost !== "" &&
                  sshBindingPort !== "" &&
                  lsBindingPort !== ""
                ) {
                  resolved = true;
                  return resolve();
                }
              }
            }
          })
          .catch(function (err) {
            rejected = true;
            return reject(
              new Error(
                "DockerProvider: Could not inspect server instance to get ips and ports." +
                  err
              )
            );
          });
        await providerInstance.sleep(1000);
        timeout -= 1;
      }
      if (!resolved)
        return reject("DockerProvider: Timed out waiting for IPs and ports.");
    });
  }

  waitForServerSSH(ip: string, port: number, timeout: number): Promise<void> {
    const providerInstance = this.providerInstance;

    return new Promise<void>(async (resolve, reject) => {
      let resolved = false;
      // check ssh connection
      while (timeout > 0 && resolved === false) {
        const sshConn = new Client();
        sshConn
          .on("ready", () => {
            resolved = true;
            return resolve();
          })
          .on("error", (err) => {
            console.log(
              "DockerProvider: SSH connection failed - retrying..." + err
            );
          })
          .connect({
            host: ip,
            port: port,
            username: process.env.SSH_USERNAME,
            password: process.env.SSH_PASSWORD,
          });
        await providerInstance.sleep(1000);
        timeout -= 1;
      }
      if (!resolved)
        return reject("DockerProvider: Timed out waiting for SSH connection.");
    });
  }

  sleep(ms: number): Promise<unknown> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
