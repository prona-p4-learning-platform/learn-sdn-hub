import { InstanceProvider, VMEndpoint } from "./Provider";

// better use env var to allow configuration of port numbers?
const lsPort = 3005;

export default class LocalMultiuserVMProvider implements InstanceProvider {
  private availableInstances: Map<string, VMEndpoint>;

  constructor() {
    this.availableInstances = new Map();

    let ipAddresses: string[] = [];
    let sshPorts: number[] = [];

    const VBOX_IP_ADDRESSES = process.env.VBOX_IP_ADDRESSES;
    if (VBOX_IP_ADDRESSES !== undefined) {
      ipAddresses = VBOX_IP_ADDRESSES.split(",");
    } else {
      throw new Error(
        "LocalMultiUserVMProvider: No VBOX_IP_ADDRESSES environment variable set. LocalMultiuserVMProvider can not provide instances.",
      );
    }

    const VBOX_SSH_PORTS = process.env.VBOX_SSH_PORTS;
    if (VBOX_SSH_PORTS !== undefined) {
      sshPorts = VBOX_SSH_PORTS.split(",").map((port) => {
        return parseInt(port, 10);
      });
    } else {
      console.log(
        "LocalMultiUserVMProvider: No VBOX_SSH_PORTS environment variable set. LocalMultiuserVMProvider uses Port 22 for all instances.",
      );
      sshPorts = ipAddresses.map(() => {
        return 22;
      });
    }

    for (const [index, ipAddress] of ipAddresses.entries()) {
      console.log(
        `LocalMultiUserVMProvider: Adding VM to LocalMultiuserVMProvider pool: ${ipAddress} with SSH port: ${sshPorts[index]}`,
      );
      this.availableInstances.set(`vm-${index}`, {
        // vms can be reused for different environments, hence providerInstanceStatus will not contain expiration info etc.
        instance: `vm-${index}`,
        providerInstanceStatus: "",
        IPAddress: ipAddress,
        SSHPort: sshPorts[index],
        LanguageServerPort: lsPort,
      });
    }

    if (process.env.BACKEND_USER_MAPPING === undefined) {
      console.log(
        "LocalMultiUserVMProvider: No BACKEND_USER_MAPPING environment variable set. Cannot differentiate mapping for users. Mapping all users to first instance.",
      );
    }
  }

  createServer(identifier: string): Promise<VMEndpoint> {
    return new Promise((resolve, reject) => {
      if (this.availableInstances.size > 0) {
        // this should maybe be improved later, username with "-" will not work otherwise,
        // due to "-" being used as the delimiter in `${this.username}-${this.configuration.description}`
        // for the identifier argument
        const username = identifier.split("-")[0];

        //TODO: should leverage user group mapping from AuthenticationProvider
        const BACKEND_USER_MAPPING = process.env.BACKEND_USER_MAPPING;
        if (BACKEND_USER_MAPPING !== undefined) {
          const userMappingConfig = BACKEND_USER_MAPPING.split(",");
          const usermap = new Map<string, number>();

          for (const userMappingConfigEntry of userMappingConfig) {
            const [login, instanceNumber] = userMappingConfigEntry.split(":");

            usermap.set(login, parseInt(instanceNumber));
          }

          const mapping = usermap.get(username);
          if (mapping !== undefined) {
            console.log(
              `LocalMultiUserVMProvider: Mapped user ${username} to instance number ${mapping}`,
            );

            const instance = this.availableInstances.get(`vm-${mapping}`);

            if (instance) {
              resolve(instance);
            } else {
              reject(
                new Error(
                  `LocalMultiUserVMProvider: Instance number ${mapping} is not defined.`,
                ),
              );
            }
          } else {
            reject(
              new Error(
                `LocalMultiUserVMProvider: No mapping defined to map user ${username} to an instance.`,
              ),
            );
          }
        } else {
          console.log(
            "LocalMultiUserVMProvider: No BACKEND_USER_MAPPING environment variable set. Mapping user to first instance.",
          );
          // value should not be undefined as we test if availableInstances > 0
          const available = this.availableInstances.values().next()
            .value as VMEndpoint;

          resolve(available);
        }
      } else {
        reject(
          new Error(
            "LocalMultiUserVMProvider: Cannot create server. No VMs (VBOX_IP_ADDRESSES) configured.",
          ),
        );
      }
    });
  }

  getServer(instance: string): Promise<VMEndpoint> {
    return new Promise((resolve, reject) => {
      const endpoint = this.availableInstances.get(instance);

      if (endpoint) resolve(endpoint);
      else
        reject(
          new Error("LocalMultiUserVMProvider: Server not found: " + instance),
        );
    });
  }

  deleteServer(instance: string): Promise<void> {
    console.log(
      `Ignoring to delete server ${instance} as LocalMultiuserVMProvider uses prebuild VMs that will not be deleted`,
    );

    return Promise.resolve();
  }
}
