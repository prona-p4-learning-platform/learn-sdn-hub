import { InstanceProvider, VMEndpoint } from "./Provider";
export default class LocalMultiuserVMProvider implements InstanceProvider {
  private availableInstances: Map<string, VMEndpoint> = new Map();
  private availableInstancesList: string[] = [];
  constructor() {
    let ipAddresses: string[] = [];
    let sshPorts: number[] = [];
    if (process.env.VBOX_IP_ADDRESSES != undefined) {
      ipAddresses = process.env.VBOX_IP_ADDRESSES.split(",");
    } else {
      throw new Error(
        "No VBOX_IP_ADDRESSES environment variable set. LocalMultiuserVMProvider can not provide instances."
      );
    }
    if (process.env.VBOX_SSH_PORTS != undefined) {
      sshPorts = process.env.VBOX_SSH_PORTS.split(",").map((port) =>
        Number.parseInt(port)
      );
    } else {
      console.log(
        "No VBOX_SSH_PORTS environment variable set. LocalMultiuserVMProvider uses Port 22 for all instances."
      );
      sshPorts = ipAddresses.map(() => 22);
    }
    ipAddresses.forEach((ipAddress, index) => {
      console.log(
        `Adding VM to LocalMultiuserVMProvider pool: ${ipAddress} with SSH port: ${sshPorts[index]}`
      );
      this.availableInstances.set(`vm-${index}`, {
        IPAddress: ipAddress,
        SSHPort: sshPorts[index],
        LanguageServerPort: 3005,
        identifier: `vm-${index}`,
      });
      this.availableInstancesList.push(`vm-${index}`);
    });
    if (process.env.BACKEND_USER_MAPPING === undefined) {
      console.log(
        "No BACKEND_USER_MAPPING environment variable set. Cannot differentiate mapping for users. Mapping all users to first instance."
      );
    }
  }

  async getServer(identifier: string): Promise<VMEndpoint> {
    return this.availableInstances.get(identifier);
  }

  async createServer(identifier: string): Promise<VMEndpoint> {
    if (this.availableInstancesList.length > 0) {
      // this should maybe be improved later, userids with "-" will not work otherwise,
      // due to "-" being used as the delimiter in `${this.userId}-${this.configuration.description}`
      // for the identifier argument
      const userid = identifier.split("-")[0];

      //TODO: should leverage user group mapping from AuthenticationProvider
      if (process.env.BACKEND_USER_MAPPING != undefined) {
        const userMappingConfig = process.env.BACKEND_USER_MAPPING.split(",");
        const usermap: Map<string, number> = new Map();
        userMappingConfig.forEach((userMappingConfigEntry) => {
          const login = userMappingConfigEntry.split(":")[0];
          const instanceNumber = userMappingConfigEntry.split(":")[1];
          usermap.set(login, parseInt(instanceNumber));
        });

        if (usermap.has(userid)) {
          console.log(
            "Mapped user " +
              userid +
              " to instance number " +
              usermap.get(userid)
          );
          if (this.availableInstances.has(`vm-${usermap.get(userid)}`)) {
            return this.availableInstances.get(`vm-${usermap.get(userid)}`);
          } else {
            throw new Error(
              "Instance " + usermap.get(userid) + " is not defined."
            );
          }
        } else {
          throw new Error(
            "No mapping defined to map user " + userid + " to an instance."
          );
        }
      } else {
        console.log(
          "No BACKEND_USER_MAPPING environment variable set. Mapping user to first instance."
        );
        return this.availableInstances.values().next().value;
      }
    }
    throw new Error("Cannot create server.");
  }
}
