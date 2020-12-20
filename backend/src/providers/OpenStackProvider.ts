/// <reference types="../typings/pkgcloud" />
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import pkgcloud, { OpenStackClient } from "pkgcloud";
import { InstanceProvider, VMEndpoint } from "./Provider";

export default class OpenStackProvider implements InstanceProvider {
  private openstack: OpenStackClient;
  constructor() {
    this.openstack = pkgcloud.compute.createClient({
      provider: "openstack",
      username: process.env.OPENSTACK_USERNAME,
      password: process.env.OPENSTACK_PASSWORD,
      authUrl: process.env.OPENSTACK_AUTHURL,
      keystoneAuthVersion: "v3",
      region: process.env.OPENSTACK_REGION,
      tenantId: process.env.OPENSTACK_TENANTID,
      domainName: process.env.OPENSTACK_DOMAINNAME,
    });
  }

  async getServer(identifier: string): Promise<VMEndpoint> {
    console.log("getServer");
    return new Promise((resolve, reject) => {
      this.openstack.getServer(identifier, (err, server) => {
        console.log(err, server);
        if (err) {
          return reject(err);
        }
        //@ts-ignore
        server.client.getServer(server, (err, server) => {
          if (err) return reject(err);
          console.log(err, server);
          //@ts-ignore
          server.client.getServerAddresses(server, (err, addresses) => {
            if (err) {
              return reject(err);
            }
            console.log(server);
            if (Object.keys(addresses).length > 0) {
              resolve({
                //@ts-ignore
                identifier,
                IPAddress: addresses[Object.keys(addresses)[0]][0].addr,
                SSHPort: 22,
                LanguageServerPort: 3005,
              });
            } else {
              reject(new Error("Instance has no IP Addresses."));
            }
          });
        });
      });
    });
  }

  private async waitForServerRunning(server: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const callback = (err: Error, server: any): void => {
        console.log(server.status);
        if (err) return reject(err);
        if (server.status === "PROVISIONING") {
          setTimeout(() => server.client.getServer(server, callback), 2000);
        } else if (server.status === "ERROR") {
          reject(new Error("Server could not be started."));
        } else if (server.status === "RUNNING") {
          resolve();
        }
      };
      // @ts-ignore
      this.openstack.getServer(server, callback);
    });
  }

  async createServer(identifier: string): Promise<VMEndpoint> {
    console.log("createServer");
    return await new Promise((resolve, reject) => {
      this.openstack.createServer(
        {
          name: identifier,
          flavor: "2",
          image: "e75337a9-28f4-4cc0-ac35-ec57b4215314",
          networks: [{ uuid: "a4aa5b22-1c3e-4b0f-a443-3d837a4de3db" }],
          // @ts-ignore
          keyname: "P4 Template Machine",
        },
        //@ts-ignore
        (err: Error, server: any) => {
          if (err) return reject(err);
          //@ts-ignore

          this.waitForServerRunning(server.id)
            .then(() => {
              //@ts-ignore
              const callback = (err, addresses): void => {
                if (err) {
                  return reject(err);
                }
                if (Object.keys(addresses).length > 0) {
                  resolve({
                    //@ts-ignore
                    identifier: server.id,
                    IPAddress: addresses[Object.keys(addresses)[0]][0].addr,
                    SSHPort: 22,
                    LanguageServerPort: 3005,
                  });
                } else {
                  setTimeout(
                    //@ts-ignore
                    () => server.client.getServerAddresses(server, callback),
                    2000
                  );
                }
              };
              console.log(server);
              //@ts-ignore
              server.client.getServerAddresses(server, callback);
            })
            .catch(reject);
        }
      );
    });
  }
}
