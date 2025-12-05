/* eslint-disable @typescript-eslint/prefer-promise-reject-errors */
/* eslint-disable no-async-promise-executor */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// TODO: fix eslint instead of disabling rules
// currently in developement, as the ContainerLab provider is not actively used in our envs

import {
  InstanceProvider,
  VMEndpoint,
  InstanceNotFoundErrorMessage,
} from "./Provider";
import axios, { AxiosInstance } from "axios";
import { Client } from "ssh2";
import { ToadScheduler, SimpleIntervalJob, AsyncTask } from "toad-scheduler";
import Environment from "../Environment";

const defaultAxiosTimeout = 30000;
const schedulerIntervalSeconds = 5 * 60;

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
// a lot more are provided in ContainerLab server list response
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

export default class ContainerLabProvider implements InstanceProvider {
  // ContainerLab config
  private os_username: string;
  private os_password: string;
  private os_url: string;
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
  private os_token?: Token;

  private endpointPublicComputeURL?: string;
  private endpointPublicNetworkURL?: string;

  // ContainerLab Provider config
  private associateFloatingIP: string;
  private maxInstanceLifetimeMinutes: number;

  // SSH and LanguageServer Port config
  private sshPort: number;
  private lsPort: number;

  private axiosInstance: AxiosInstance;

  private providerInstance: ContainerLabProvider;

  constructor() {
    this.os_secgroup = "default";

    // check for ContainerLab username
    const ENV_USERNAME = process.env.CLAB_USERNAME;
    if (ENV_USERNAME) this.os_username = ENV_USERNAME;
    else {
      throw new Error(
        "ContainerLabProvider: No username provided (CONTAINERLAB_USERNAME).",
      );
    }

    // check for ContainerLab password
    const ENV_PASSWORD = process.env.CLAB_PASSWORD;
    if (ENV_PASSWORD) this.os_password = ENV_PASSWORD;
    else {
      throw new Error(
        "ContainerLabProvider: No password provided (CONTAINERLAB_PASSWORD).",
      );
    }

    // check for ContainerLab auth url
    const ENV_URL = process.env.CLAB_URL;
    if (ENV_URL) {
      this.os_url = ENV_URL;
      this.os_authUrl = ENV_URL + "/login";
    }
    else {
      throw new Error(
        "ContainerLabProvider: No auth url provided (CONTAINERLAB_AUTHURL).",
      );
    }

    // check for ContainerLab region
    const ENV_REGION = process.env.CLAB_REGION;
    if (ENV_REGION) this.os_region = ENV_REGION;
    else {
      throw new Error(
        "ContainerLabProvider: No region provided (CONTAINERLAB_REGION).",
      );
    }

    // check for ContainerLab project id
    const ENV_PROJECT_ID = process.env.CLAB_PROJECTID;
    if (ENV_PROJECT_ID) this.os_projectId = ENV_PROJECT_ID;
    else {
      throw new Error(
        "ContainerLabProvider: No project id provided (CONTAINERLAB_PROJECTID).",
      );
    }

    // check for ContainerLab domain name
    const ENV_DOMAIN = process.env.CLAB_DOMAINNAME;
    if (ENV_DOMAIN) this.os_domainName = ENV_DOMAIN;
    else {
      throw new Error(
        "ContainerLabProvider: No domain name provided (CONTAINERLAB_DOMAINNAME).",
      );
    }

    // check for ContainerLab image id
    const ENV_IMAGE = process.env.CLAB_P4_HOST_IMAGE;
    if (ENV_IMAGE) this.os_imageId = ENV_IMAGE;
    else {
      throw new Error(
        "ContainerLabProvider: No p4 host image id provided (CONTAINERLAB_P4_HOST_IMAGE).",
      );
    }

    // check for ContainerLab flavor
    const ENV_FLAVOR = process.env.CLAB_FLAVOR;
    if (ENV_FLAVOR) this.os_flavor = ENV_FLAVOR;
    else {
      throw new Error(
        "ContainerLabProvider: No flavor provided (CONTAINERLAB_FLAVOR).",
      );
    }

    // check for ContainerLab network id
    const ENV_NETWORK_ID = process.env.CLAB_NETWORKID;
    if (ENV_NETWORK_ID) this.os_networkId = ENV_NETWORK_ID;
    else {
      throw new Error(
        "ContainerLabProvider: No network id provided (CONTAINERLAB_NETWORKID).",
      );
    }

    // check for ContainerLab keyname
    const ENV_KEYNAME = process.env.CLAB_KEYNAME;
    if (ENV_KEYNAME) this.os_keyname = ENV_KEYNAME;
    else {
      throw new Error(
        "ContainerLabProvider: No keyname provided (CONTAINERLAB_KEYNAME).",
      );
    }

    // check for ContainerLab floating network id
    const ENV_FLOATING_ID = process.env.CLAB_FLOATING_NETWORKID;
    if (ENV_FLOATING_ID) this.os_floatingNetworkId = ENV_FLOATING_ID;
    else {
      throw new Error(
        "ContainerLabProvider: No floating network id provided (CONTAINERLAB_FLOATING_NETWORKID).",
      );
    }

    // check for ContainerLab floating ip association
    const ENV_FLOATING_ASSOCIATE = process.env.CLAB_ASSOCIATE_FLOATING_IP;
    if (ENV_FLOATING_ASSOCIATE)
      this.associateFloatingIP = ENV_FLOATING_ASSOCIATE.toLowerCase();
    else {
      throw new Error(
        "ContainerLabProvider: No floating ip association provided (CONTAINERLAB_ASSOCIATE_FLOATING_IP).",
      );
    }

    // check for max instance lifetime
    const ENV_LIFETIME = process.env.CLAB_MAX_INSTANCE_LIFETIME_MINUTES;
    if (ENV_LIFETIME) {
      const parsedLifetime = parseInt(ENV_LIFETIME);

      if (!isNaN(parsedLifetime))
        this.maxInstanceLifetimeMinutes = parsedLifetime;
      else {
        throw new Error(
          "ContainerLabProvider: Provided instance lifetime cannot be parsed (CONTAINERLAB_MAX_INSTANCE_LIFETIME_MINUTES).",
        );
      }
    } else {
      throw new Error(
        "DockerProvider: No instance lifetime provided (CONTAINERLAB_MAX_INSTANCE_LIFETIME_MINUTES).",
      );
    }

    this.providerInstance = this;

    // better use env var to allow configuration of port numbers?
    this.sshPort = 22;
    this.lsPort = 3005;

    this.axiosInstance = axios.create({
      timeout: defaultAxiosTimeout,
    });
    this.axiosInstance.defaults.headers.common["Content-Type"] =
      "application/json";

    const scheduler = new ToadScheduler();

    const task = new AsyncTask(
      "ContainerLabProvider Instance Pruning Task",
      () => {
        return this.pruneServerInstance();
      },
      (err: Error) => {
        console.log(
          "ConatinerLabProvider: Could not prune stale server instances..." +
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

  async getToken(): Promise<void> {
    const providerInstance = this.providerInstance;

    return new Promise((resolve, reject) => {
      const tokenExpires = Date.parse(
        providerInstance.os_token?.expires_at ?? Date(),
      );
      const now = Date.now();

      console.log(
        "Token expires at: " +
          new Date(tokenExpires).toISOString() +
          " now: " +
          new Date(now).toISOString(),
      );

      // add 5 sec for the token to be valid for subsequent operations
      if (
        providerInstance.os_token !== undefined &&
        now <= tokenExpires + 5000
      ) {
        return resolve();
      } else {
        // authenticate to ContainerLab and get a token
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
          .post(providerInstance.os_authUrl, data_auth)
          .then(function (response) {
            // extract and store token
            const token = response.headers["x-subject-token"] as string;
            providerInstance.axiosInstance.defaults.headers.common[
              "X-Auth-Token"
            ] = token;

            providerInstance.os_token = response.data.token as Token;

            // currently the default microversion for compute API is sufficient
            //axiosInstance.defaults.headers.common[
            //  "X-ContainerLab-Nova-API-Version"
            //] = "2.66";

            // get compute and network public endpoint urls from received service catalog
            const catalog = response.data.token.catalog as Array<Service>;
            const serviceCompute = catalog.find(
              (element) => element.type === "compute",
            );
            providerInstance.endpointPublicComputeURL =
              serviceCompute?.endpoints.find(
                (element) =>
                  element.interface === "public" &&
                  element.region === providerInstance.os_region,
              )?.url;
            const serviceNetwork = catalog.find(
              (element) => element.type === "network",
            );
            providerInstance.endpointPublicNetworkURL =
              serviceNetwork?.endpoints.find(
                (element) =>
                  element.interface === "public" &&
                  element.region === providerInstance.os_region,
              )?.url;
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
              new Error("ContainerLabProvider: Authentication failed: " + err),
            );
          });
      }
    });
  }

  async createServer(
    username: string,
    groupNumber: number,
    environment: string,
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
            .post(providerInstance.os_url + "/servers",
              data_server,
            )
            .then(function (response) {
              // get server instance id
              const serverId = response.data.server.id as string;
              const expirationDate = new Date(
                Date.now() +
                  providerInstance.maxInstanceLifetimeMinutes * 60 * 1000,
              );
              providerInstance
                .waitForServerAddresses(serverId, 60)
                .then((result) => {
                  const fixedIpAddress = result;
                  console.log("ContainerLabProvider: Created server: " + serverId);

                  // if floating ip should be associated, allocate floating ip and associate it
                  if (providerInstance.associateFloatingIP === "true") {
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
                        data_floatingIp,
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
                            providerInstance.os_url +
                              "/servers/" +
                              serverId +
                              "/os-interface",
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
                                data_floatingipassociation,
                              )
                              .then(function () {
                                // instance creation takes longer after new image is used, needs to be copied to compute hosts
                                providerInstance
                                  .waitForServerSSH(
                                    floatingIpAddress,
                                    providerInstance.sshPort,
                                    300,
                                  )
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
                                        "ContainerLabProvider: Initial SSH connection failed. " +
                                          err,
                                      ),
                                    );
                                  });
                              })
                              .catch(function (err) {
                                return reject(
                                  new Error(
                                    "ContainerLabProvider: Could not associate floating ip to port id from server: " +
                                      err,
                                  ),
                                );
                              });
                          })
                          .catch(function (err) {
                            return reject(
                              new Error(
                                "ContainerLabProvider: Could not get port id from server: " +
                                  err,
                              ),
                            );
                          });
                      })
                      .catch(function (err) {
                        return reject(
                          new Error(
                            "ContainerLabProvider: Could not allocate new Floating IP: " +
                              err,
                          ),
                        );
                      });
                  } else {
                    // instance creation takes longer after new image is used, needs to be copied to compute hosts
                    providerInstance
                      .waitForServerSSH(
                        fixedIpAddress,
                        providerInstance.sshPort,
                        300,
                      )
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
                            "ContainerLabProvider: Initial SSH connection failed. " +
                              err,
                          ),
                        );
                      });
                  }
                })
                .catch(function (err) {
                  return reject(
                    new Error(
                      "ContainerLabProvider: Timed out waiting for instance: " +
                        err,
                    ),
                  );
                });
            })
            .catch(function (err) {
              return reject(
                new Error("ContainerLabProvider: Server Creation failed: " + err),
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
            "ContainerLabProvider: Getting server instance " + instance + ")",
          );
          // check identifier format to inhibit injection?
          // minor issue, as we produce and hold the id in the backend?
          // also relevant for similar lines of code for the entire backend
          providerInstance.axiosInstance
            .get(
              providerInstance.os_url +
                "/servers/" +
                instance,
            )
            .then(function (response) {
              const result = response.data.server;
              if (Object.keys(result.addresses).length > 0) {
                // improve selection of array field?

                // return first ip address
                const firstAddress =
                  result.addresses[Object.keys(result.addresses)[0]];
                if (providerInstance.associateFloatingIP === "true") {
                  // our instances only have one interface/network, so the second
                  // entry is the floating ip, sadly ConatinerLab does not returen a
                  // label, e.g., floatin/public in result
                  address = firstAddress["1"].addr;
                } else {
                  address = firstAddress["0"].addr;
                }
                const createdDate = new Date(result.created as string);
                const expirationDate = new Date(
                  createdDate.getTime() +
                    providerInstance.maxInstanceLifetimeMinutes * 60 * 1000,
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
                  "ContainerLabProvider: Failed to get server instance. " + err,
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
            "ContainerLabProvider: Deleting server instance " + instance + ")",
          );
          // check identifier format to inhibit injection?
          // minor issue, as we produce and hold the id in the backend?
          // also relevant for similar lines of code for the entire backend
          providerInstance.axiosInstance
            .delete(
              providerInstance.os_url +
                "/servers/" +
                instance,
            )
            .then(() => {
              if (providerInstance.associateFloatingIP === "true") {
                providerInstance.axiosInstance
                  .get(
                    providerInstance.endpointPublicNetworkURL +
                      "/v2.0/floatingips",
                  )
                  .then(function (response) {
                    const floating_ips = response.data
                      .floatingips as Array<FloatingIp>;
                    const used_floating_ip = floating_ips.find(
                      (element) => element.description === instance,
                    );
                    if (used_floating_ip !== undefined) {
                      console.log(
                        "ContainerLabProvider: Deleting floating ip " +
                          used_floating_ip.floating_ip_address,
                      );
                      providerInstance.axiosInstance
                        .delete(
                          providerInstance.endpointPublicNetworkURL +
                            "/v2.0/floatingips/" +
                            used_floating_ip.id,
                        )
                        .then(function () {
                          return resolve();
                        })
                        .catch((err) => {
                          return reject(
                            new Error(
                              "ContainerLabProvider: Could not delete floating ip" +
                                err,
                            ),
                          );
                        });
                    } else {
                      return reject(
                        new Error(
                          "ContainerLabProvider: Could not find floating ip",
                        ),
                      );
                    }
                  })
                  .catch(function (err) {
                    return reject(
                      new Error(
                        "ContainerLabProvider: Could not get floating ip list: " +
                          err,
                      ),
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
                  "ContainerLabProvider: Failed to delete instance. " + err,
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

    console.log("ContainerLabProvider: Pruning stale server instances...");

    return new Promise((resolve, reject) => {
      providerInstance
        .getToken()
        .then(() => {
          // get servers older than timestamp
          const deadline = new Date(
            Date.now() -
              providerInstance.maxInstanceLifetimeMinutes * 60 * 1000,
          );
          console.log(
            "ContainerLabProvider: Pruning server instances older than " +
              deadline.toISOString(),
          );
          providerInstance.axiosInstance
            .get(providerInstance.os_url + "/servers/detail")
            .then(async function (response) {
              const servers = response.data.servers as Array<Server>;
              for (const server of servers) {
                if (server.metadata.learn_sdn_hub_user !== undefined) {
                  // server instance has learn_sdn_hub metadata and is assumed to be created by learn-sdn-hub
                  const timestampCreated = new Date(server.created);
                  if (timestampCreated < deadline) {
                    console.log(
                      server.name +
                        " was created at " +
                        timestampCreated.toISOString() +
                        "and should be deleted",
                    );
                    const deleted =
                      await Environment.deleteInstanceEnvironments(server.id);
                    if (!deleted) {
                      console.log(
                        `ContainerLabProvider: Could not delete environment during pruning, environment seams to be gone already, deleting leftover instance: (${server.id}).`,
                      );
                      await providerInstance
                        .deleteServer(server.id)
                        .catch((reason) => {
                          const originalMessage =
                            reason instanceof Error
                              ? reason.message
                              : "Unknown error";
                          throw new Error(
                            `ContainerLabProvider: Failed to delete instance (${server.id}) to be pruned.\n` +
                              originalMessage,
                          );
                        });
                    }
                  }
                }
              }
              return resolve();
            })
            .catch(function (err) {
              return reject(
                "ContainerLabProvider: Failed get list of server instances to prune. " +
                  err,
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
          "ContainerLabProvider: Waiting for server to get ready... (timeout: " +
            timeout +
            ")",
        );
        providerInstance.axiosInstance
          .get(
            providerInstance.os_url +
              "/servers/" +
              serverId +
              "/ips",
          )
          .then(function (response) {
            const result = response.data;
            if (Object.keys(result.addresses).length > 0) {
              // improve selection of array field?

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
                "ContainerLabProvider: Could not get server instance ips." + err,
              ),
            );
          });
        await providerInstance.sleep(5000);
        timeout -= 5;
      }
      return reject("ContainerLabProvider: Timed out waiting for IPs.");
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
            sshConn.end();
            return resolve();
          })
          .on("error", (err) => {
            sshConn.end();
            console.log(
              "ContainerLabProvider: SSH connection failed - retrying... " +
                err.message,
            );
          })
          .connect({
            host: ip,
            port: port,
            username: process.env.SSH_USERNAME,
            password: process.env.SSH_PASSWORD,
            readyTimeout: 1000,
          });
        await providerInstance.sleep(1000);
        timeout -= 1;
      }
      if (!resolved)
        return reject(
          "ContainerLabProvider: Timed out waiting for SSH connection.",
        );
    });
  }

  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
