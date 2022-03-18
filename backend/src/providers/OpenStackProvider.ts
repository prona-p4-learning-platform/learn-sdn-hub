import { InstanceProvider, VMEndpoint } from "./Provider";
import axios, { AxiosInstance } from "axios";
import { Client } from "ssh2";
import { ToadScheduler, SimpleIntervalJob, AsyncTask } from "toad-scheduler";

const defaultAxiosTimeout = 30000;

export const InstanceNotFoundErrorMessage =
  "OpenStackProvider: Cannot get server. Instance not found.";

interface Service {
  endpoints: Endpoint[];
  id: string;
  name: string;
  type: string;
}

interface Endpoint {
  id: string;
  interface: string;
  region_id: string;
  url: string;
  region: string;
}

interface FloatingIp {
  router_id: string;
  description: string;
  dns_domain: string;
  dns_name: string;
  created_at: string;
  updated_at: string;
  revision_number: number;
  project_id: string;
  tenant_id: string;
  floating_network_id: string;
  fixed_ip_address: string;
  floating_ip_address: string;
  port_id: string;
  id: string;
  status: string;
  port_details: PortDetails;
  tags: string[];
  port_forwardings: [];
  qos_network_policy_id: string;
  qos_policy_id: string;
}

interface PortDetails {
  status: string;
  name: string;
  admin_state_up: boolean;
  network_id: string;
  device_owner: string;
  mac_address: string;
  device_id: string;
}

// only the most essential attibutes defined here,
// a lot more are provided in OpenStack server list response
interface Server {
  id: string;
  name: string;
  created: string;
  metadata: Metadata;
}

// metadata keys added by learn-sdn-hub to started server instances
interface Metadata {
  learn_sdn_hub_user: string;
  learn_sdn_hub_group: number;
  learn_sdn_hub_assignment: string;
}

interface Token {
  token: string;
  issued_at: string;
  expires_at: string;
}

export default class OpenStackProvider implements InstanceProvider {
  // OpenStack config
  private os_username: string;
  private os_password: string;
  private os_authUrl: string;
  private os_region: string;
  private os_projectId: string;
  private os_domainName: string;
  private os_imageId: string;
  private os_flavor: string;
  private os_networkId: string;
  private os_keyname: string;
  private os_secgroup: string;
  private os_floatingNetworkId: string;

  // the authentication token from keystone
  private os_token: Token;

  private endpointPublicComputeURL: string;
  private endpointPublicNetworkURL: string;

  // OpenStack Provider config
  private os_associateFloatingIp: string;
  private os_max_instance_lifetime_minutes: number;

  // SSH and LanguageServer Port config
  private sshPort: number;
  private lsPort: number;

  private axiosInstance: AxiosInstance;

  private providerInstance: OpenStackProvider;

  constructor() {
    this.os_username = process.env.OPENSTACK_USERNAME;
    this.os_password = process.env.OPENSTACK_PASSWORD;
    this.os_authUrl = process.env.OPENSTACK_AUTHURL;
    this.os_region = process.env.OPENSTACK_REGION;
    this.os_projectId = process.env.OPENSTACK_PROJECTID;
    this.os_domainName = process.env.OPENSTACK_DOMAINNAME;
    this.os_imageId = process.env.OPENSTACK_P4_HOST_IMAGE;
    this.os_flavor = process.env.OPENSTACK_FLAVOR;
    this.os_networkId = process.env.OPENSTACK_NETWORKID;
    this.os_keyname = process.env.OPENSTACK_KEYNAME;
    this.os_secgroup = "default";
    this.os_floatingNetworkId = process.env.OPENSTACK_FLOATING_NETWORKID;

    this.os_associateFloatingIp = process.env.OPENSTACK_ASSOCIATE_FLOATING_IP;
    this.os_max_instance_lifetime_minutes = parseInt(
      process.env.OPENSTACK_MAX_INSTANCE_LIFETIME_MINUTES
    );

    this.providerInstance = this;

    this.sshPort = 22;
    this.lsPort = 3005;

    this.axiosInstance = axios.create({
      timeout: defaultAxiosTimeout,
    });
    this.axiosInstance.defaults.headers.common["Content-Type"] =
      "application/json";

    const scheduler = new ToadScheduler();

    const task = new AsyncTask(
      "OpenStackProvider Instance Pruning Task",
      () => {
        return this.pruneServerInstance().then(() => {
          //console.log("OpenStackProvider: Pruning finished...");
        });
      },
      (err: Error) => {
        console.log(
          "OpenStackProvider: Could not prune stale server instances..." + err
        );
      }
    );
    const job = new SimpleIntervalJob(
      { seconds: 5 * 60, runImmediately: true },
      task
    );

    scheduler.addSimpleIntervalJob(job);
  }

  async getToken(): Promise<void> {
    const providerInstance = this.providerInstance;

    return new Promise((resolve, reject) => {
      const tokenExpires = Date.parse(
        providerInstance.os_token?.expires_at ?? Date()
      );
      const now = Date.now();

      console.log(
        "Token expires at: " + new Date(tokenExpires) + " now: " + new Date(now)
      );

      // add 5 sec for the token to be valid for subsequent operations
      if (
        providerInstance.os_token !== undefined &&
        now <= tokenExpires + 5000
      ) {
        return resolve();
      } else {
        // authenticate to OpenStack and get a token
        const data_auth = {
          auth: {
            identity: {
              methods: ["password"],
              password: {
                user: {
                  name: providerInstance.os_username,
                  domain: { name: providerInstance.os_domainName },
                  password: providerInstance.os_password,
                },
              },
            },
            scope: {
              project: {
                domain: { name: providerInstance.os_domainName },
                id: providerInstance.os_projectId,
              },
            },
          },
        };

        providerInstance.axiosInstance
          .post(providerInstance.os_authUrl + "/v3/auth/tokens", data_auth)
          .then(function (response) {
            // extract and store token
            const token = response.headers["x-subject-token"];
            providerInstance.axiosInstance.defaults.headers.common[
              "X-Auth-Token"
            ] = token;

            providerInstance.os_token = response.data.token as Token;

            // currently the default microversion for compute API is sufficient
            //axiosInstance.defaults.headers.common[
            //  "X-OpenStack-Nova-API-Version"
            //] = "2.66";

            // get compute and network public endpoint urls from received service catalog
            const catalog = response.data.token.catalog as Array<Service>;
            const serviceCompute = catalog.find(
              (element) => element.type === "compute"
            );
            providerInstance.endpointPublicComputeURL = serviceCompute.endpoints.find(
              (element) =>
                element.interface === "public" &&
                element.region === providerInstance.os_region
            ).url;
            const serviceNetwork = catalog.find(
              (element) => element.type === "network"
            );
            providerInstance.endpointPublicNetworkURL = serviceNetwork.endpoints.find(
              (element) =>
                element.interface === "public" &&
                element.region === providerInstance.os_region
            ).url;
            return resolve();
          })
          .catch(function (err) {
            // expire token information
            providerInstance.axiosInstance.defaults.headers.common[
              "X-Auth-Token"
            ] = "";
            providerInstance.os_token = undefined;
            providerInstance.endpointPublicComputeURL = undefined;
            providerInstance.endpointPublicNetworkURL = undefined;
            return reject(
              new Error("OpenStackProvider: Authentication failed: " + err)
            );
          });
      }
    });
  }

  async createServer(
    username: string,
    groupNumber: number,
    environment: string
  ): Promise<VMEndpoint> {
    const providerInstance = this.providerInstance;

    return new Promise((resolve, reject) => {
      providerInstance
        .getToken()
        .then(() => {
          // create server instance
          const data_server = {
            server: {
              name: username + "-" + groupNumber + "-" + environment,
              imageRef: providerInstance.os_imageId,
              flavorRef: providerInstance.os_flavor,
              key_name: providerInstance.os_keyname,
              security_groups: [
                {
                  name: providerInstance.os_secgroup,
                },
              ],
              networks: [
                {
                  uuid: providerInstance.os_networkId,
                },
              ],
              metadata: {
                learn_sdn_hub_user: username,
                learn_sdn_hub_group: groupNumber.toString(),
                learn_sdn_hub_assignment: environment,
              },
            },
          };
          providerInstance.axiosInstance
            .post(
              providerInstance.endpointPublicComputeURL + "/servers",
              data_server
            )
            .then(function (response) {
              // get server instance id
              const serverId = response.data.server.id as string;
              const expirationDate = new Date(
                Date.now() +
                  providerInstance.os_max_instance_lifetime_minutes * 60 * 1000
              );
              providerInstance
                .waitForServerAddresses(serverId, 60)
                .then((result) => {
                  const fixedIpAddress = result;
                  console.log("OpenStackProvider: Created server: " + serverId);

                  // if floating ip should be associated, allocate floating ip and associate it
                  if (providerInstance.os_associateFloatingIp === "true") {
                    const data_floatingIp = {
                      floatingip: {
                        project_id: providerInstance.os_projectId,
                        floating_network_id:
                          providerInstance.os_floatingNetworkId,
                      },
                    };
                    providerInstance.axiosInstance
                      .post(
                        providerInstance.endpointPublicNetworkURL +
                          "/v2.0/floatingips",
                        data_floatingIp
                      )
                      .then(function (response) {
                        const floatingIpAddress = response.data.floatingip
                          .floating_ip_address as string;
                        const floatingIpAddressId = response.data.floatingip
                          .id as string;
                        // associate floating ip to server
                        // get port id from server
                        providerInstance.axiosInstance
                          .get(
                            providerInstance.endpointPublicComputeURL +
                              "/servers/" +
                              serverId +
                              "/os-interface"
                          )
                          .then(function (response) {
                            const portId = response.data.interfaceAttachments[0]
                              .port_id as string;

                            // associate floating ip to server port id
                            const data_floatingipassociation = {
                              floatingip: {
                                port_id: portId,
                                description: serverId,
                              },
                            };
                            providerInstance.axiosInstance
                              .put(
                                providerInstance.endpointPublicNetworkURL +
                                  "/v2.0/floatingips/" +
                                  floatingIpAddressId,
                                data_floatingipassociation
                              )
                              .then(function () {
                                // instance creation takes longer after new image is used, needs to be copied to compute hosts
                                providerInstance
                                  .waitForServerSSH(floatingIpAddress, 300)
                                  .then(() => {
                                    // finished, successfully created server and associated floating ip
                                    return resolve({
                                      instance: serverId,
                                      providerInstanceStatus:
                                        "Environment will be deleted at " +
                                        expirationDate.toLocaleString(),
                                      IPAddress: floatingIpAddress,
                                      SSHPort: providerInstance.sshPort,
                                      LanguageServerPort:
                                        providerInstance.lsPort,
                                    });
                                  })
                                  .catch((err) => {
                                    return reject(
                                      new Error(
                                        "OpenStackProvider: Initial SSH connection failed. " +
                                          err
                                      )
                                    );
                                  });
                              })
                              .catch(function (err) {
                                return reject(
                                  new Error(
                                    "OpenStackProvider: Could not associate floating ip to port id from server: " +
                                      err
                                  )
                                );
                              });
                          })
                          .catch(function (err) {
                            return reject(
                              new Error(
                                "OpenStackProvider: Could not get port id from server: " +
                                  err
                              )
                            );
                          });
                      })
                      .catch(function (err) {
                        return reject(
                          new Error(
                            "OpenStackProvider: Could not allocate new Floating IP: " +
                              err
                          )
                        );
                      });
                  } else {
                    // instance creation takes longer after new image is used, needs to be copied to compute hosts
                    providerInstance
                      .waitForServerSSH(fixedIpAddress, 300)
                      .then(() => {
                        // finished, successfully created server and got fixed ip
                        return resolve({
                          instance: serverId,
                          providerInstanceStatus:
                            "Environment will be deleted at " +
                            expirationDate.toLocaleString(),
                          IPAddress: fixedIpAddress,
                          SSHPort: providerInstance.sshPort,
                          LanguageServerPort: providerInstance.lsPort,
                        });
                      })
                      .catch((err) => {
                        return reject(
                          new Error(
                            "OpenStackProvider: Initial SSH connection failed. " +
                              err
                          )
                        );
                      });
                  }
                })
                .catch(function (err) {
                  return reject(
                    new Error(
                      "OpenStackProvider: Timed out waiting for instance: " +
                        err
                    )
                  );
                });
            })
            .catch(function (err) {
              return reject(
                new Error("OpenStackProvider: Server Creation failed: " + err)
              );
            });
        })
        .catch((err) => {
          // pass authentication error
          return reject(err);
        });
    });
  }

  async getServer(instance: string): Promise<VMEndpoint> {
    const providerInstance = this.providerInstance;

    return new Promise((resolve, reject) => {
      providerInstance
        .getToken()
        .then(() => {
          // get server ips
          let address: string;
          console.log(
            "OpenStackProvider: Getting server instance " + instance + ")"
          );
          // check identifier format to inhibit injection?
          // minor issue, as we produce and hold the id in the backend?
          // also relevant for similar lines of code for the entire backend
          providerInstance.axiosInstance
            .get(
              providerInstance.endpointPublicComputeURL + "/servers/" + instance
            )
            .then(function (response) {
              const result = response.data.server;
              if (Object.keys(result.addresses).length > 0) {
                // return first ip address
                const firstAddress =
                  result.addresses[Object.keys(result.addresses)[0]];
                if (providerInstance.os_associateFloatingIp === "true") {
                  // our instances only have one interface/network, so the second
                  // entry is the floating ip, sadly OpenStack does not returen a
                  // label, e.g., floatin/public in result
                  address = firstAddress["1"].addr;
                } else {
                  address = firstAddress["0"].addr;
                }
                const createdDate = new Date(result.created as string);
                const expirationDate = new Date(
                  createdDate.getTime() +
                    providerInstance.os_max_instance_lifetime_minutes *
                      60 *
                      1000
                );
                return resolve({
                  instance: instance,
                  providerInstanceStatus:
                    "Environment will be deleted at " +
                    expirationDate.toLocaleString(),
                  IPAddress: address,
                  SSHPort: providerInstance.sshPort,
                  LanguageServerPort: providerInstance.lsPort,
                });
              }
            })
            .catch(function (err) {
              if (err.response.status === 404) {
                return reject(new Error(InstanceNotFoundErrorMessage));
              } else {
                return reject(
                  "OpenStackProvider: Failed to get server instance. " + err
                );
              }
            });
        })
        .catch((err) => {
          // pass authentication error
          return reject(err);
        });
    });
  }

  async deleteServer(instance: string): Promise<void> {
    const providerInstance = this.providerInstance;

    return new Promise((resolve, reject) => {
      providerInstance
        .getToken()
        .then(() => {
          // delete server instance
          console.log(
            "OpenStackProvider: Deleting server instance " + instance + ")"
          );
          // check identifier format to inhibit injection?
          // minor issue, as we produce and hold the id in the backend?
          // also relevant for similar lines of code for the entire backend
          providerInstance.axiosInstance
            .delete(
              providerInstance.endpointPublicComputeURL + "/servers/" + instance
            )
            .then(() => {
              if (providerInstance.os_associateFloatingIp === "true") {
                providerInstance.axiosInstance
                  .get(
                    providerInstance.endpointPublicNetworkURL +
                      "/v2.0/floatingips"
                  )
                  .then(function (response) {
                    const floating_ips = response.data
                      .floatingips as Array<FloatingIp>;
                    const used_floating_ip = floating_ips.find(
                      (element) => element.description === instance
                    );
                    if (used_floating_ip !== undefined) {
                      console.log(
                        "OpenStackProvider: Deleting floating ip " +
                          used_floating_ip.floating_ip_address
                      );
                      providerInstance.axiosInstance
                        .delete(
                          providerInstance.endpointPublicNetworkURL +
                            "/v2.0/floatingips/" +
                            used_floating_ip.id
                        )
                        .then(function () {
                          return resolve();
                        })
                        .catch((err) => {
                          return reject(
                            new Error(
                              "OpenStackProvider: Could not delete floating ip" +
                                err
                            )
                          );
                        });
                    } else {
                      return reject(
                        new Error(
                          "OpenStackProvider: Could not find floating ip"
                        )
                      );
                    }
                  })
                  .catch(function (err) {
                    return reject(
                      new Error(
                        "OpenStackProvider: Could not get floating ip list: " +
                          err
                      )
                    );
                  });
              } else {
                // floating ips are not configured to be used, to no cleanup of floating ips necessary
                return resolve();
              }
            })
            .catch(function (err) {
              if (err.status === 404) {
                return reject(new Error(InstanceNotFoundErrorMessage));
              } else {
                return reject(
                  "OpenStackProvider: Failed to delete instance. " + err
                );
              }
            });
        })
        .catch((err) => {
          // pass authentication error
          return reject(err);
        });
    });
  }

  async pruneServerInstance(): Promise<void> {
    const providerInstance = this.providerInstance;

    console.log("OpenStackProvider: Pruning stale server instances...");

    return new Promise((resolve, reject) => {
      providerInstance
        .getToken()
        .then(() => {
          // get servers older than timestamp
          const deadline = new Date(
            Date.now() -
              providerInstance.os_max_instance_lifetime_minutes * 60 * 1000
          );
          console.log(
            "OpenStackProvider: Pruning server instances older than " +
              deadline.toISOString()
          );
          providerInstance.axiosInstance
            .get(providerInstance.endpointPublicComputeURL + "/servers/detail")
            .then(function (response) {
              const servers = response.data.servers as Array<Server>;
              for (const server of servers) {
                if (server.metadata.learn_sdn_hub_user !== undefined) {
                  // server instance has learn_sdn_hub metadata and is assumed to be created by learn-sdn-hub
                  const timestampCreated = new Date(server.created);
                  if (timestampCreated < deadline) {
                    console.log(
                      server.name +
                        " was created at " +
                        timestampCreated +
                        "and should be deleted"
                    );
                    providerInstance.deleteServer(server.id);
                  }
                }
              }
              return resolve();
            })
            .catch(function (err) {
              return reject(
                "OpenStackProvider: Failed get list of server instances to prune. " +
                  err
              );
            });
        })
        .catch((err) => {
          return reject(err);
        });
    });
  }

  waitForServerAddresses(serverId: string, timeout: number): Promise<string> {
    const providerInstance = this.providerInstance;

    return new Promise<string>(async (resolve, reject) => {
      // get server ips
      let address;
      while (timeout > 0 && address === undefined) {
        console.log(
          "OpenStackProvider: Waiting for server to get ready... (timeout: " +
            timeout +
            ")"
        );
        providerInstance.axiosInstance
          .get(
            providerInstance.endpointPublicComputeURL +
              "/servers/" +
              serverId +
              "/ips"
          )
          .then(function (response) {
            const result = response.data;
            if (Object.keys(result.addresses).length > 0) {
              // return first ip address
              const firstAddress =
                result.addresses[Object.keys(result.addresses)[0]];
              address = firstAddress["0"].addr;
              return resolve(address);
            }
          })
          .catch(function (err) {
            return reject(
              new Error(
                "OpenStackProvider: Could not get server instance ips." + err
              )
            );
          });
        await providerInstance.sleep(5000);
        timeout -= 5;
      }
      return reject("OpenStackProvider: Timed out waiting for IPs.");
    });
  }

  waitForServerSSH(address: string, timeout: number): Promise<void> {
    const providerInstance = this.providerInstance;

    return new Promise<void>(async (resolve, reject) => {
      let resolved: boolean;
      // check ssh connection
      while (timeout > 0 && resolved === undefined) {
        const sshConn = new Client();
        sshConn
          .on("ready", () => {
            return resolve();
            resolved = true;
          })
          .on("error", (err) => {
            console.log(
              "OpenStackProvider: SSH connection failed - retrying..." + err
            );
          })
          .connect({
            host: address,
            port: 22,
            username: process.env.SSH_USERNAME,
            password: process.env.SSH_PASSWORD,
          });
        await providerInstance.sleep(5000);
        timeout -= 5;
      }
      return reject("OpenStackProvider: Timed out waiting for SSH connection.");
    });
  }

  sleep(ms: number): Promise<unknown> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
