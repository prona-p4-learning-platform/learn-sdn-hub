import { InstanceProvider, VMEndpoint } from "./Provider";

// better use env var to allow configuration of port numbers?
const lsPort = 3005;

export default class LocalMultiuserVMProvider implements InstanceProvider {
  private availableInstances: Map<string, VMEndpoint> = new Map();
  constructor() {
    let ipAddresses: string[] = [];
    let sshPorts: number[] = [];
    if (process.env.VBOX_IP_ADDRESSES != undefined) {
      ipAddresses = process.env.VBOX_IP_ADDRESSES.split(",");
    } else {
      throw new Error(
        "LocalMultiUserVMProvider: No VBOX_IP_ADDRESSES environment variable set. LocalMultiuserVMProvider can not provide instances.",
      );
    }
    if (process.env.VBOX_SSH_PORTS != undefined) {
      sshPorts = process.env.VBOX_SSH_PORTS.split(",").map((port) =>
        Number.parseInt(port),
      );
    } else {
      console.log(
        "LocalMultiUserVMProvider: No VBOX_SSH_PORTS environment variable set. LocalMultiuserVMProvider uses Port 22 for all instances.",
      );
      // better use env var to allow configuration of port numbers?
      sshPorts = ipAddresses.map(() => 22);
    }
    ipAddresses.forEach((ipAddress, index) => {
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
    });
    if (process.env.BACKEND_USER_MAPPING === undefined) {
      console.log(
        "LocalMultiUserVMProvider: No BACKEND_USER_MAPPING environment variable set. Cannot differentiate mapping for users. Mapping all users to first instance.",
      );
    }
  }

  async createServer(identifier: string): Promise<VMEndpoint> {
    if (this.availableInstances.size > 0) {
      // this should maybe be improved later, username with "-" will not work otherwise,
      // due to "-" being used as the delimiter in `${this.username}-${this.configuration.description}`
      // for the identifier argument
      const username = identifier.split("-")[0];

      //TODO: should leverage user group mapping from AuthenticationProvider
      if (process.env.BACKEND_USER_MAPPING != undefined) {
        const userMappingConfig = process.env.BACKEND_USER_MAPPING.split(",");
        const usermap: Map<string, number> = new Map();
        userMappingConfig.forEach((userMappingConfigEntry) => {
          const login = userMappingConfigEntry.split(":")[0];
          const instanceNumber = userMappingConfigEntry.split(":")[1];
          usermap.set(login, parseInt(instanceNumber));
        });

        if (usermap.has(username)) {
          console.log(
            "LocalMultiUserVMProvider: Mapped user " +
              username +
              " to instance number " +
              usermap.get(username),
          );
          if (this.availableInstances.has(`vm-${usermap.get(username)}`)) {
            return this.availableInstances.get(`vm-${usermap.get(username)}`);
          } else {
            throw new Error(
              "LocalMultiUserVMProvider: Instance " +
                usermap.get(username) +
                " is not defined.",
            );
          }
        } else {
          throw new Error(
            "LocalMultiUserVMProvider: No mapping defined to map user " +
              username +
              " to an instance.",
          );
        }
      } else {
        console.log(
          "LocalMultiUserVMProvider: No BACKEND_USER_MAPPING environment variable set. Mapping user to first instance.",
        );
        return this.availableInstances.values().next().value;
      }
    }
    throw new Error(
      "LocalMultiUserVMProvider: Cannot create server. No VMs (VBOX_IP_ADDRESSES) configured.",
    );
  }

  async getServer(instance: string): Promise<VMEndpoint> {
    return this.availableInstances.get(instance);
  }

  async deleteServer(instance: string): Promise<void> {
    console.log(
      "Ignoring to delete server " +
        instance +
        " as LocalMultiuserVMProvider uses prebuild VMs that will not be deleted",
    );
    return Promise.resolve();
  }
}
