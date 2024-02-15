import {
  InstanceProvider,
  VMEndpoint,
  InstanceNotFoundErrorMessage,
} from "./Provider";
import Dockerode, {
  PortBinding,
  Container,
  ContainerCreateOptions,
} from "dockerode";
import { ToadScheduler, SimpleIntervalJob, AsyncTask } from "toad-scheduler";
import { Client } from "ssh2";
import Environment from "../Environment";

const schedulerIntervalSeconds = 5 * 60;

interface ContainerDetails {
  id: string;
  createdAt: Date;
  sshBindingHost: string;
  sshBindingPort: number;
  lspBindingPort: number;
  rdpBindingPort: number;
}

// instead of providing an own error class
// dockerode just modifies the base error and adds
// custom properties
interface DockerodeError extends Error {
  reason?: string;
  statusCode?: number;
}

const PROTOCOL_TYPES = ["ssh", "http", "https"];
type SSHProtocol = "ssh" | "http" | "https" | undefined;

function isSSHProtocol(protocol: string | undefined): protocol is SSHProtocol {
  if (protocol === undefined) return true;
  else return PROTOCOL_TYPES.includes(protocol);
}

export default class DockerProvider implements InstanceProvider {
  // Docker config
  // ssh needs username, password, key etc. to be implemented - check docker-modem/dockerode
  private protocol?: SSHProtocol;
  private host?: string;
  private port?: number;
  private socketPath?: string;
  private image: string;
  private cmd: string;

  // Docker Provider config
  private maxInstanceLifetimeMinutes: number;
  private containerStartTimeoutSeconds = 60;
  private containerSSHTimeoutSeconds = 60;

  // SSH and LanguageServer Port config
  private sshPort: number;
  private lsPort: number;
  private remoteDesktopPort: number;

  private dockerodeInstance: Dockerode;

  constructor() {
    // check for docker protocol
    const ENV_PROTOCOL = process.env.DOCKER_PROTOCOL;
    if (isSSHProtocol(ENV_PROTOCOL)) this.protocol = ENV_PROTOCOL;
    else {
      throw new Error(
        "DockerProvider: Provided protocol type is invalid (DOCKER_PROTOCOL).",
      );
    }

    // check for docker port
    const ENV_PORT = process.env.DOCKER_PORT;
    if (ENV_PORT) {
      const parsedPort = parseInt(ENV_PORT);

      if (!isNaN(parsedPort)) this.port = parsedPort;
      else {
        throw new Error(
          "DockerProvider: Provided port could not be parsed (DOCKER_PORT).",
        );
      }
    }

    // check for docker image
    const ENV_IMAGE = process.env.DOCKER_IMAGE;
    if (ENV_IMAGE) this.image = ENV_IMAGE;
    else {
      throw new Error(
        "DockerProvider: No default docker image provided (DOCKER_IMAGE).",
      );
    }

    // check for docker command
    const ENV_CMD = process.env.DOCKER_CMD;
    if (ENV_CMD) this.cmd = ENV_CMD;
    else {
      throw new Error(
        "DockerProvider: No default docker command provided (DOCKER_CMD).",
      );
    }

    // check for max instance lifetime
    const ENV_LIFETIME = process.env.DOCKER_MAX_INSTANCE_LIFETIME_MINUTES;
    if (ENV_LIFETIME) {
      const parsedLifetime = parseInt(ENV_LIFETIME);

      if (!isNaN(parsedLifetime))
        this.maxInstanceLifetimeMinutes = parsedLifetime;
      else {
        throw new Error(
          "DockerProvider: Provided instance lifetime cannot be parsed (DOCKER_MAX_INSTANCE_LIFETIME_MINUTES).",
        );
      }
    } else {
      throw new Error(
        "DockerProvider: No instance lifetime provided (DOCKER_MAX_INSTANCE_LIFETIME_MINUTES).",
      );
    }

    this.host = process.env.DOCKER_HOST;
    this.socketPath = process.env.DOCKER_SOCKET_PATH;

    this.dockerodeInstance = new Dockerode({
      socketPath: this.socketPath,
      protocol: this.protocol,
      host: this.host,
      port: this.port,
      timeout: 20000,
    });

    // TODO: use env vars to allow configuration of port numbers?
    this.sshPort = 22;
    this.lsPort = 3005;
    this.remoteDesktopPort = 5900;

    const scheduler = new ToadScheduler();
    const task = new AsyncTask(
      "DockerProvider Instance Pruning Task",
      () => {
        return this.pruneContainerInstance();
      },
      (err) => {
        console.log(
          "DockerProvider: Could not prune stale container instances...\n" +
            err.message,
        );
      },
    );
    const job = new SimpleIntervalJob(
      { seconds: schedulerIntervalSeconds, runImmediately: true },
      task,
    );

    scheduler.addSimpleIntervalJob(job);
  }

  async createServer(
    username: string,
    groupNumber: number,
    environment: string,
    image?: string,
    dockerCmd?: string,
    dockerSupplementalPorts?: string[],
  ): Promise<VMEndpoint> {
    const containerImage = image ?? this.image;
    const containerCmd = dockerCmd ?? this.cmd;

    // default ports to be exposed and bound are SSH, LSP and RDP
    let containerPorts = [
      this.sshPort + "/tcp",
      this.lsPort + "/tcp",
      this.remoteDesktopPort + "/tcp",
    ];

    // append additionally configured ports
    if (dockerSupplementalPorts && dockerSupplementalPorts.length > 0)
      containerPorts = containerPorts.concat(dockerSupplementalPorts);

    const exposedPorts: Record<string, object> = {};
    const portBindings: Record<string, object> = {};

    for (const port of containerPorts) {
      exposedPorts[port] = {};
      portBindings[port] = [{}];
    }

    const containerOptions: ContainerCreateOptions = {
      Image: containerImage,
      name: `${username}-${groupNumber}-${environment}`,
      Labels: {
        learn_sdn_hub_user: username,
        learn_sdn_hub_group: groupNumber.toString(),
        learn_sdn_hub_assignment: environment,
      },
      Cmd: [containerCmd],
      Tty: true,
      ExposedPorts: exposedPorts,
      HostConfig: {
        PortBindings: portBindings,
        Privileged: true,
        AutoRemove: true,
      },
    };

    // TODO: handle container already exists?
    // create container with options
    const container = await this.dockerodeInstance
      .createContainer(containerOptions)
      .catch((reason) => {
        const originalMessage =
          reason instanceof Error ? reason.message : "Unknown error";
        throw new Error(
          "DockerProvider: Could not create container.\n" + originalMessage,
        );
      });

    // TODO: handle container already started?
    // start newly created container
    await container.start().catch((reason) => {
      const originalMessage =
        reason instanceof Error ? reason.message : "Unknown error";
      throw new Error(
        "DockerProvider: Could not start container.\n" + originalMessage,
      );
    });

    // get bindings from container
    const containerDetails = await this.getContainerDetails(
      container,
      this.containerStartTimeoutSeconds,
    );

    // check ssh connectivity
    await this.waitForContainerSSH(
      containerDetails.sshBindingHost,
      containerDetails.sshBindingPort,
      this.containerSSHTimeoutSeconds,
    );

    // collect and return data
    const maxLifetime = this.maxInstanceLifetimeMinutes * 60 * 1000;
    const expiryDate = new Date(
      containerDetails.createdAt.getTime() + maxLifetime,
    );

    return {
      instance: containerDetails.id,
      providerInstanceStatus:
        "Environment will be deleted at " + expiryDate.toLocaleString(),
      IPAddress: containerDetails.sshBindingHost,
      SSHPort: containerDetails.sshBindingPort,
      LanguageServerPort: containerDetails.lspBindingPort,
      RemoteDesktopPort: containerDetails.rdpBindingPort,
    };
  }

  async getServer(instance: string): Promise<VMEndpoint> {
    const containerDetails = await this.getContainerDetails(
      instance,
      this.containerStartTimeoutSeconds,
    );

    const maxLifetime = this.maxInstanceLifetimeMinutes * 60 * 1000;
    const expiryDate = new Date(
      containerDetails.createdAt.getTime() + maxLifetime,
    );

    return {
      instance: containerDetails.id,
      providerInstanceStatus:
        "Environment will be deleted at " + expiryDate.toLocaleString(),
      IPAddress: containerDetails.sshBindingHost,
      SSHPort: containerDetails.sshBindingPort,
      LanguageServerPort: containerDetails.lspBindingPort,
      RemoteDesktopPort: containerDetails.rdpBindingPort,
    };
  }

  async deleteServer(instance: string): Promise<void> {
    const container = this.dockerodeInstance.getContainer(instance);

    // try to delete the container (force also kills the server first)
    await container.remove({ force: true }).catch((reason) => {
      let originalMessage = "Unknown error";
      if (reason instanceof Error) {
        const error: DockerodeError = reason;

        // code 404 - no such container | code 409 - removal already in progress
        if (
          error.statusCode &&
          (error.statusCode === 404 || error.statusCode === 409)
        )
          return;

        originalMessage = error.message;
      }

      throw new Error(
        "DockerProvider: Could not remove container.\n" + originalMessage,
      );
    });
  }

  /**
   * Deletes all containers older than specified by maxInstanceLifetimeMinutes.
   */
  private async pruneContainerInstance(): Promise<void> {
    const currentTime = Date.now();
    const maxLifetime = this.maxInstanceLifetimeMinutes * 60 * 1000;
    const deadline = new Date(currentTime - maxLifetime);

    console.log(
      "DockerProvider: Pruning container instances older than " +
        deadline.toISOString(),
    );

    // get all containers (containers might be shut down or in error state)
    const containers = await this.dockerodeInstance
      .listContainers({
        all: true,
      })
      .catch((reason) => {
        const originalMessage =
          reason instanceof Error ? reason.message : "Unknown error";
        throw new Error(
          "DockerProvider: Failed to get list of server instances to prune.\n" +
            originalMessage,
        );
      });

    for (const container of containers) {
      // server instance has learn_sdn_hub metadata and is assumed to be created by learn-sdn-hub
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (container.Labels["learn_sdn_hub_user"] !== undefined) {
        const createdAt = new Date(container.Created * 1000);

        if (createdAt < deadline) {
          console.log(
            `${container.Names[0]} was created at ${createdAt.toISOString()} and should be deleted`,
          );

          await this.deleteServer(container.Id).catch((reason) => {
            const originalMessage =
              reason instanceof Error ? reason.message : "Unknown error";
            throw new Error(
              `DockerProvider: Failed to delete container (${container.Names[0]}) to be pruned.\n` +
                originalMessage,
            );
          });
          await Environment.deleteInstanceEnvironments(container.Id).catch(
            (reason) => {
              const originalMessage =
                reason instanceof Error ? reason.message : "Unknown error";
              console.log(
                `DockerProvider: Error while deleting environment after pruning container (${container.Names[0]}).\n` +
                  originalMessage,
              );
            },
          );
        }
      }
    }
  }

  /**
   * Tries to get the containers port/ip bindings and
   * creation date.
   *
   * @param containerId The container or container id.
   * @param timeout the timeout for this operation.
   * @returns The container bindings as a promise.
   */
  private async getContainerDetails(
    containerId: Container | string,
    timeout: number,
  ): Promise<ContainerDetails> {
    const getAddresses = async () => {
      const container =
        typeof containerId === "string"
          ? this.dockerodeInstance.getContainer(containerId)
          : containerId;
      const details = await container.inspect().catch((reason) => {
        let originalMessage = "Unknown error";
        if (reason instanceof Error) {
          const error: DockerodeError = reason;

          // code 404 - no such container
          if (error.statusCode !== undefined && error.statusCode === 404)
            throw new Error(InstanceNotFoundErrorMessage);

          originalMessage = error.message;
        }

        throw new Error(
          "DockerProvider: Could not inspect container instance to get ips and ports.\n" +
            originalMessage,
        );
      });

      // check if container is running
      if (!details.State.Running)
        throw new Error(
          "DockerProvider: Container is not running. Check image and cmd used to init the container.",
        );

      // get current portmap
      const portMap = details.NetworkSettings.Ports;

      // check if there are any port mappings
      if (Object.keys(portMap).length === 0)
        throw new Error(
          "DockerProvider: Container does not provide any ports. Per default the image must provide SSH, LSP and RDP to allow collaborative terminals and file editing.",
        );

      const sshBindings = portMap[`${this.sshPort}/tcp`] as
        | PortBinding[]
        | undefined;
      const lspBindings = portMap[`${this.lsPort}/tcp`] as
        | PortBinding[]
        | undefined;
      const rdpBindings = portMap[`${this.remoteDesktopPort}/tcp`] as
        | PortBinding[]
        | undefined;

      if (sshBindings && lspBindings && rdpBindings) {
        const sshBindingHost = sshBindings[0]?.HostIp;
        const sshBindingPort = sshBindings[0]?.HostPort;
        const lspBindingPort = lspBindings[0]?.HostPort;
        const rdpBindingPort = lspBindings[0]?.HostPort;

        if (
          sshBindingHost &&
          sshBindingPort &&
          lspBindingPort &&
          rdpBindingPort
        ) {
          // TODO: maybe check if parseInt returns NaN?
          const bindings: ContainerDetails = {
            id: details.Id,
            createdAt: new Date(details.Created),
            sshBindingHost,
            sshBindingPort: parseInt(sshBindingPort, 10),
            lspBindingPort: parseInt(lspBindingPort, 10),
            rdpBindingPort: parseInt(rdpBindingPort, 10),
          };

          return bindings;
        } else return false;
      } else {
        const notAvailable: string[] = [];

        if (!sshBindings) notAvailable.push("SSH");
        if (!lspBindings) notAvailable.push("LSP");
        if (!rdpBindings) notAvailable.push("RDP");

        throw new Error(
          "DockerProvider: Container does not provide port(s) for: " +
            notAvailable.join(", "),
        );
      }
    };

    const startTime = Date.now();
    let usedTime = 0;

    while (usedTime < timeout) {
      const available = await getAddresses();

      if (available) return available;

      usedTime = Math.floor((Date.now() - startTime) / 1000);
      await this.sleep(1000);
    }

    throw new Error("DockerProvider: Timed out waiting for IPs and ports.");
  }

  /**
   * Tries to connect via SSH to the given container.
   *
   * @param ip The ip address of the container.
   * @param port The port of the container.
   * @param timeout The timeout for this operation.
   * @returns A void promise.
   */
  private async waitForContainerSSH(
    ip: string,
    port: number,
    timeout: number,
  ): Promise<void> {
    // simple connection test function
    const testConnection = () => {
      return new Promise<boolean>((resolve, reject) => {
        const sshConnection = new Client();

        sshConnection
          .on("ready", () => {
            sshConnection.end();
            resolve(true);
          })
          .on("error", (err) => {
            sshConnection.end();
            reject(err);
          })
          .connect({
            host: ip,
            port: port,
            username: process.env.SSH_USERNAME,
            password: process.env.SSH_PASSWORD,
            readyTimeout: 1000,
          });
      });
    };

    const startTime = Date.now();
    let usedTime = 0;

    while (usedTime < timeout) {
      const connected = await testConnection().catch((reason) => {
        const originalMessage =
          reason instanceof Error ? reason.message : "Unknown error";

        console.log(
          "DockerProvider: SSH connection failed - retrying...\n" +
            originalMessage,
        );

        return false;
      });

      if (connected) return;

      usedTime = Math.floor((Date.now() - startTime) / 1000);
      await this.sleep(1000);
    }

    throw new Error("DockerProvider: Timed out waiting for SSH connection.");
  }

  sleep(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
