import SSHConsole, { Console } from "./consoles/SSHConsole";
import FileHandler from "./filehandler/SSHFileHandler";
import {
  InstanceProvider,
  VMEndpoint,
  InstanceNotFoundErrorMessage,
} from "./providers/Provider";
import { Persister } from "./database/Persister";
import crypto from "crypto";
import querystring from "querystring";
import * as Y from "yjs";
import { fromUint8Array } from "js-base64";
import ActiveEnvironmentTracker from "./trackers/ActiveEnvironmentTracker";

export interface AliasedFile {
  absFilePath: string;
  alias: string;
}

export interface Shell {
  type: "Shell";
  name: string;
  executable: string;
  cwd: string;
  params: Array<string>;
  provideTty: boolean;
}

export interface WebApp {
  type: "WebApp";
  name: string;
  url: string;
}

export interface Desktop {
  type: "Desktop";
  name: string;
  guacamoleServerURL: string;
  remoteDesktopProtocol: "vnc" | "rdp";
  remoteDesktopPort: number;
  remoteDesktopUsername?: string;
  remoteDesktopPassword: string;
  remoteDesktopHostname?: string;
}

interface DesktopInstance {
  guacamoleServerURL: string;
  remoteDesktopProtocol: "vnc" | "rdp";
  remoteDesktopPort: number;
  remoteDesktopPassword: string;
  remoteDesktopToken: GuacamoleAuthResponse;
}

export interface GuacamoleAuthResponse {
  authToken: string;
  username: string;
  dataSource: string;
  availableDataSources: string[];
}

export type TerminalType = Shell | Desktop | WebApp;

export interface AssignmentStep {
  name: string;
  label: string;
  tests: Array<AssignmentStepTestType>;
}

interface AssignmentStepTestSSHCommand {
  type: "SSHCommand";
  command: string;
  stdOutMatch: string;
  successMessage: string;
  errorHint: string;
}

interface AssignmentStepTestTerminalBufferSearch {
  type: "TerminalBufferSearch";
  terminal: string;
  match: string;
  successMessage: string;
  errorHint: string;
}

type AssignmentStepTestType =
  | AssignmentStepTestSSHCommand
  | AssignmentStepTestTerminalBufferSearch;

export type TerminalStateType = {
  endpoint: string;
  state: string;
};

export interface TestResult {
  code: number;
  message: string;
}

export interface Submission {
  assignmentName: string;
  lastChanged: Date;
  points?: number;
}

export interface SubmissionAdminOverviewEntry extends Submission {
  submissionID: string;
  username: string;
  groupNumber: number;
  fileNames: string[];
  terminalEndpoints: string[];
  assignmentRef?: string;
  userRef?: string;
}

export interface SubmissionAdminEntryDetails {
  submissionID: string;
  terminalStatus: Array<TerminalStateType>;
  submittedFiles: Array<SubmissionFileType>;
}

export type SubmissionFileType = {
  fileName: string;
  fileContent: string;
};

export interface EnvironmentDescription {
  terminals: Array<Array<TerminalType>>;
  editableFiles: Array<AliasedFile>;
  stopCommands: Array<TerminalType>;
  steps?: Array<AssignmentStep>;
  submissionPrepareCommand?: string;
  submissionSupplementalFiles?: Array<string>;
  submissionCleanupCommand?: string;
  description: string;
  assignmentLabSheet: string;
  assignmentLabSheetLocation?: "backend" | "instance";
  providerImage?: string;
  providerDockerCmd?: string;
  providerDockerSupplementalPorts?: string[];
  providerKernelImage?: string;
  providerKernelBootARGs?: string;
  providerRootDrive?: string;
  providerProxmoxTemplateTag?: string;
  rootPath?: string;
  workspaceFolders?: string[];
  useCollaboration?: boolean;
  useLanguageClient?: boolean;
  maxBonusPoints?: number;
}

const DenyStartOfMissingInstanceErrorMessage =
  "Instance not found and explicitly told not to create a new instance.";

export default class Environment {
  private activeConsoles: Map<string, Console>;
  private activeDesktops: Map<string, DesktopInstance>;
  private editableFiles: Map<string, string>;
  private static activeCollabDocs = new Map<string, string>();
  private configuration: EnvironmentDescription;
  private environmentId: string;
  private instanceId?: string;
  private static activeEnvironments = new Map<string, Environment>();
  private environmentProvider: InstanceProvider;
  private persister: Persister;
  private username: string;
  private filehandler!: FileHandler; // TODO: filehandler is not set in constructor
  private groupNumber: number;

  public static getActiveEnvironment(
    environmentId: string,
    username: string,
  ): Environment | undefined {
    return Environment.activeEnvironments.get(`${username}-${environmentId}`);
  }

  public static getActiveEnvironments(): Map<string, Environment> {
    return Environment.activeEnvironments;
  }

  public static getDeployedUserEnvironmentList(
    username: string,
  ): Array<string> {
    const deployedEnvironmentsForUser: Array<string> = new Array<string>();
    Environment.activeEnvironments.forEach(
      (value: Environment, key: string) => {
        if (value.username === username)
          deployedEnvironmentsForUser.push(key.split("-").slice(1).join("-"));
      },
    );
    return deployedEnvironmentsForUser;
  }

  public static getDeployedGroupEnvironmentList(groupNumber: number): string[] {
    const deployedEnvironmentsForGroup: string[] = [];

    for (const [key, value] of Environment.activeEnvironments) {
      if (value.groupNumber === groupNumber) {
        deployedEnvironmentsForGroup.push(key.split("-").slice(1).join("-"));
      }
    }

    return deployedEnvironmentsForGroup;
  }

  private constructor(
    username: string,
    groupNumber: number,
    environmentId: string,
    configuration: EnvironmentDescription,
    environmentProvider: InstanceProvider,
    persister: Persister,
  ) {
    this.activeConsoles = new Map();
    this.activeDesktops = new Map();
    this.editableFiles = new Map();
    this.configuration = configuration;
    this.environmentProvider = environmentProvider;
    this.persister = persister;
    this.username = username;
    this.groupNumber = groupNumber;
    this.environmentId = environmentId;
  }

  private addEditableFile(alias: string, path: string): void {
    this.editableFiles.set(alias, path);
  }

  public getFilePathByAlias(alias: string): string | undefined {
    return this.editableFiles.get(alias);
  }

  public getConsoleByAlias(alias: string): Console | undefined {
    return this.activeConsoles.get(alias);
  }

  public getConsoles(): Map<string, Console> {
    return this.activeConsoles;
  }

  public getDesktopByAlias(alias: string): DesktopInstance | undefined {
    return this.activeDesktops.get(alias);
  }

  static async createEnvironment(
    username: string,
    groupNumber: number,
    environmentId: string,
    env: EnvironmentDescription,
    provider: InstanceProvider,
    persister: Persister,
  ): Promise<Environment> {
    const environment = new Environment(
      username,
      groupNumber,
      environmentId,
      env,
      provider,
      persister,
    );

    console.log(
      "Creating new environment: " + environmentId + " for user: " + username,
    );

    const activeEnvironmentsForGroup = Array<Environment>();
    for (const environment of Environment.activeEnvironments.values()) {
      if (environment.groupNumber === groupNumber) {
        if (environment.environmentId !== environmentId) {
          return Promise.reject(
            new Error(
              "Your group already deployed another environment. Please reload assignment list.",
            ),
          );
        } else {
          activeEnvironmentsForGroup.push(environment);
        }
      }
    }

    if (activeEnvironmentsForGroup.length === 0) {
      await environment
        .start(env, true)
        .then((endpoint) => {
          environment.instanceId = endpoint.instance;
          Environment.activeEnvironments.set(
            `${username}-${environmentId}`,
            environment,
          );
          ActiveEnvironmentTracker.addActivity(environment.instanceId, {
            groupData: {
              usernames: [username],
              groupNumber: groupNumber,
            },
            environmentData: {
              environmentId: environmentId,
              sshPort: endpoint.SSHPort,
              lsPort: endpoint.LanguageServerPort,
              ipAddress: endpoint.IPAddress,
              startTimestamp: Date.now(),
              remoteDesktopPort: endpoint.RemoteDesktopPort,
              lifetimeMinutes: endpoint.maxLifetimeMinutes,
            },
          });

          return Promise.resolve(environment);
        })
        .catch((err) => {
          Environment.activeEnvironments.delete(`${username}-${environmentId}`);

          if (environment.instanceId)
            ActiveEnvironmentTracker.removeUserActivity(
              username,
              environment.instanceId,
            );

          return Promise.reject(
            new Error("Start of environment failed. " + err),
          );
        });
    } else {
      // the group already runs an environment add this user to it
      // and reuse instance
      let groupEnvironmentInstance;
      const userEnvironmentsOfOtherGroupUser = await persister
        .GetUserEnvironments(activeEnvironmentsForGroup[0].username)
        .catch((err) => {
          return Promise.reject(
            new Error(
              "Error: Unable to get UserEnvironments of group member " +
                activeEnvironmentsForGroup[0].username +
                "." +
                err,
            ),
          );
        });

      for (const userEnvironmentOfOtherGroupUser of userEnvironmentsOfOtherGroupUser) {
        if (
          userEnvironmentOfOtherGroupUser.environment ===
          activeEnvironmentsForGroup[0].environmentId
        ) {
          groupEnvironmentInstance = userEnvironmentOfOtherGroupUser.instance;
        }
      }

      await persister
        .AddUserEnvironment(
          username,
          activeEnvironmentsForGroup[0].environmentId,
          activeEnvironmentsForGroup[0].configuration.description,
          groupEnvironmentInstance ?? "",
        )
        .catch((err) => {
          return Promise.reject(
            new Error(
              "Error: Unable to add UserEnvironment for group member " +
                username +
                "." +
                err,
            ),
          );
        });

      console.log(
        "Added existing environment: " +
          environmentId +
          " for user: " +
          username +
          " from user: " +
          activeEnvironmentsForGroup[0].username +
          " in group: " +
          groupNumber +
          " using instance: " +
          groupEnvironmentInstance,
      );

      await environment
        .start(env, false)
        .then((endpoint) => {
          environment.instanceId = endpoint.instance;
          Environment.activeEnvironments.set(
            `${username}-${environmentId}`,
            environment,
          );

          ActiveEnvironmentTracker.addActivity(environment.instanceId, {
            groupData: {
              usernames: [username],
              groupNumber: groupNumber,
            },
            environmentData: {
              environmentId: environmentId,
              sshPort: endpoint.SSHPort,
              lsPort: endpoint.LanguageServerPort,
              ipAddress: endpoint.IPAddress,
              startTimestamp: Date.now(),
              remoteDesktopPort: endpoint.RemoteDesktopPort,
              lifetimeMinutes: endpoint.maxLifetimeMinutes,
            },
          });

          return Promise.resolve(environment);
        })
        .catch((err) => {
          Environment.activeEnvironments.delete(`${username}-${environmentId}`);

          if (environment.instanceId)
            ActiveEnvironmentTracker.removeUserActivity(
              username,
              environment.instanceId,
            );

          return Promise.reject(
            new Error("Failed to join environment of your group." + err),
          );
        });
    }
    return Promise.resolve(environment);
  }

  static async deleteEnvironment(
    username: string,
    environmentId: string,
  ): Promise<boolean> {
    const environment = this.getActiveEnvironment(environmentId, username);

    if (environment) {
      const groupNumber = environment.groupNumber;

      await environment
        .stop()
        .then(() => {
          Environment.activeEnvironments.delete(`${username}-${environmentId}`);
          // search for other activeEnvironments in the same group
          Environment.activeEnvironments.forEach((env: Environment) => {
            if (env.groupNumber === groupNumber && env.username !== username) {
              Environment.activeEnvironments.delete(
                `${env.username}-${env.environmentId}`,
              );
            }
          });

          if (environment.instanceId)
            ActiveEnvironmentTracker.removeActivity(environment.instanceId);

          return Promise.resolve(true);
        })
        .catch((err: Error) => {
          if (err.message === DenyStartOfMissingInstanceErrorMessage) {
            console.log(
              "Environment was already stopped. Silently deleting leftovers in user session.",
            );
            Environment.activeEnvironments.delete(
              `${username}-${environmentId}`,
            );
            // search for other activeEnvironments in the same group
            Environment.activeEnvironments.forEach((env: Environment) => {
              if (
                env.groupNumber === groupNumber &&
                env.username !== username
              ) {
                Environment.activeEnvironments.delete(
                  `${env.username}-${env.environmentId}`,
                );
              }
            });

            if (environment.instanceId)
              ActiveEnvironmentTracker.removeActivity(environment.instanceId);

            return Promise.resolve(true);
          } else {
            console.log("Failed to stop environment. " + JSON.stringify(err));
            return Promise.reject(false);
          }
        });
    } else {
      console.log("Environment not found.");
      return Promise.reject(false);
    }
    return Promise.resolve(true);
  }

  static async deleteInstanceEnvironments(instance: string): Promise<boolean> {
    let instanceEnvironmentFound = false;
    for (const activeEnvironment of this.activeEnvironments.values()) {
      if (activeEnvironment.instanceId === instance) {
        instanceEnvironmentFound = true;
        // the environment uses the specified instance and should be deleted
        await this.deleteEnvironment(
          activeEnvironment.username,
          activeEnvironment.environmentId,
        )
          .then((result) => {
            if (!result) {
              // unable to delete environment
              throw new Error(
                "Environment used by instance " +
                  instance +
                  " could not be deleted.",
              );
            }
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }
    }
    return Promise.resolve(instanceEnvironmentFound);
  }

  async getLanguageServerPort(): Promise<number> {
    const endpoint = await this.makeSureInstanceExists();
    return endpoint.LanguageServerPort;
  }

  async getIPAddress(): Promise<string> {
    const endpoint = await this.makeSureInstanceExists();
    return endpoint.IPAddress;
  }

  async makeSureInstanceExists(createIfMissing?: boolean): Promise<VMEndpoint> {
    return new Promise<VMEndpoint>((resolve, reject) => {
      this.persister
        .GetUserEnvironments(this.username)
        .then((environments) => {
          console.log(
            "Current user environments: " + JSON.stringify(environments),
          );
          const filtered = environments.filter(
            (env) => env.environment === this.environmentId,
          );
          if (filtered.length === 1) {
            console.log(
              "Environment " +
                this.environmentId +
                " already deployed for user " +
                this.username +
                ", trying to reopen it...",
            );
            this.environmentProvider
              .getServer(filtered[0].instance)
              .then((endpoint) => {
                return resolve(endpoint);
              })
              .catch(async (error: Error) => {
                if (error.message === InstanceNotFoundErrorMessage) {
                  // instance is gone, remove environment
                  await this.persister.RemoveUserEnvironment(
                    this.username,
                    filtered[0].environment,
                  );
                }
                return reject(error.message);
              });
          } else if (filtered.length === 0) {
            if (createIfMissing === true) {
              return resolve(
                this.environmentProvider.createServer(
                  this.username,
                  this.groupNumber,
                  this.environmentId,
                  {
                    image: this.configuration.providerImage,
                    dockerCmd: this.configuration.providerDockerCmd,
                    dockerSupplementalPorts:
                      this.configuration.providerDockerSupplementalPorts,
                    kernelImage: this.configuration.providerKernelImage,
                    kernelBootARGs: this.configuration.providerKernelBootARGs,
                    rootDrive: this.configuration.providerRootDrive,
                    proxmoxTemplateTag:
                      this.configuration.providerProxmoxTemplateTag,
                  },
                ),
              );
            } else {
              return reject(DenyStartOfMissingInstanceErrorMessage);
            }
          } else {
            return reject(
              new Error(
                "More than 1 environments exist for user " +
                  this.username +
                  ". Remove duplicate environments from persister " +
                  typeof this.persister +
                  " envs found: " +
                  filtered.join(", "),
              ),
            );
          }
        })
        .catch((err) => {
          return reject(
            new Error("Error: Unable to get UserEnvironments." + err),
          );
        });
    });
  }

  async start(
    desc: EnvironmentDescription = this.configuration,
    createIfMissing: boolean,
  ): Promise<VMEndpoint> {
    const endpoint = await this.makeSureInstanceExists(createIfMissing);

    await this.persister.AddUserEnvironment(
      this.username,
      this.environmentId,
      this.configuration.description,
      endpoint.instance,
    );
    console.log(
      "Added new environment: " +
        this.environmentId +
        " for user: " +
        this.username +
        " using endpoint: " +
        JSON.stringify(endpoint),
    );
    return new Promise((resolve, reject) => {
      try {
        this.filehandler = new FileHandler(
          endpoint.IPAddress,
          endpoint.SSHPort,
          endpoint.SSHJumpHost,
        );
      } catch (err) {
        return reject(err);
      }
      desc.editableFiles.forEach((val) =>
        this.addEditableFile(val.alias, val.absFilePath),
      );
      let errorTerminalCounter = 0;
      let resolvedOrRejected = false;
      let readyTerminalCounter = 0;
      const numberOfTerminals = desc.terminals.flat().length;
      desc.terminals.forEach((subterminals) => {
        subterminals.forEach((subterminal) => {
          if (subterminal.type === "Shell") {
            global.console.log(
              "Opening console: ",
              JSON.stringify(subterminal),
              JSON.stringify(endpoint),
            );
            try {
              const console = new SSHConsole(
                this.environmentId,
                this.username,
                this.groupNumber,
                endpoint.IPAddress,
                endpoint.SSHPort,
                subterminal.executable,
                subterminal.params,
                subterminal.cwd,
                subterminal.provideTty,
                endpoint.SSHJumpHost,
              );

              const setupCloseHandler = (): void => {
                errorTerminalCounter++;
                if (
                  resolvedOrRejected === false &&
                  errorTerminalCounter + readyTerminalCounter ===
                    numberOfTerminals
                ) {
                  resolvedOrRejected = true;
                  return reject(new Error("Unable to create environment"));
                } else {
                  this.activeConsoles.delete(subterminal.name);
                  global.console.log(
                    "deleted console for task: " + subterminal.name,
                  );
                }
              };

              console.on("close", setupCloseHandler);

              console.on("error", (err) => {
                return reject(err);
              });

              console.on("ready", () => {
                readyTerminalCounter++;
                this.activeConsoles.set(subterminal.name, console);
                if (
                  resolvedOrRejected === false &&
                  readyTerminalCounter === numberOfTerminals
                ) {
                  resolvedOrRejected = true;
                  return resolve(endpoint);
                }
              });
            } catch (err) {
              return reject(err);
            }
          } else if (subterminal.type === "Desktop") {
            global.console.log(
              "Opening desktop: ",
              JSON.stringify(subterminal),
              JSON.stringify(endpoint),
            );

            // currently fixed to guacamole and VNC, additional protocols require
            // different params, see:
            //   https://guacamole.apache.org/doc/gug/json-auth.html
            //   https://guacamole.apache.org/doc/gug/configuring-guacamole.html#connection-configuration

            // Add -join as connection to join already existing connections
            const payload = {
              username: this.username,
              expires: (Date.now() + 2 * 3600 * 1000).toString(),
              connections: {
                [this.groupNumber + "-" + this.environmentId]: {
                  id: this.groupNumber + "-" + this.environmentId,
                  protocol: subterminal.remoteDesktopProtocol,
                  parameters: {
                    hostname: subterminal.remoteDesktopHostname
                      ? subterminal.remoteDesktopHostname
                      : endpoint.IPAddress,
                    port: subterminal.remoteDesktopPort.toString(),
                    username: subterminal.remoteDesktopUsername
                      ? subterminal.remoteDesktopUsername
                      : undefined,
                    password: subterminal.remoteDesktopPassword,
                  },
                },
                [this.groupNumber + "-" + this.environmentId + "-join"]: {
                  id: this.groupNumber + "-" + this.environmentId + "-join",
                  join: this.groupNumber + "-" + this.environmentId,
                  parameters: {
                    "read-only": "false",
                  },
                },
              },
            };
            const strPayload = JSON.stringify(payload);
            // change secret (128 bit, 16 byte secret in hexadecimal)
            const key = Buffer.from("4c0b569e4c96df157eee1b65dd0e4d41", "hex");
            const hmac = crypto.createHmac("sha256", key);
            hmac.update(strPayload);
            const signedPayload = hmac.digest("binary") + strPayload;
            //debug to compare output with reference app encrypt-json.sh
            //const hexsignedPayload = Buffer.from(signedPayload, "binary").toString("hex");
            const cipher = crypto.createCipheriv(
              "aes-128-cbc",
              key,
              "\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00",
            );
            const enctoken =
              cipher.update(signedPayload, "binary", "base64") +
              cipher.final("base64");
            const urlenctoken = querystring.escape(enctoken);

            fetch(subterminal.guacamoleServerURL + "/api/tokens", {
              method: "POST",
              body: "data=" + urlenctoken,
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
            })
              .then(async (response) => {
                if (response.status === 200) {
                  const desktop: DesktopInstance = {
                    remoteDesktopProtocol: subterminal.remoteDesktopProtocol,
                    remoteDesktopPort: subterminal.remoteDesktopPort,
                    remoteDesktopPassword: subterminal.remoteDesktopPassword,
                    remoteDesktopToken:
                      (await response.json()) as GuacamoleAuthResponse,
                    guacamoleServerURL: subterminal.guacamoleServerURL,
                  };

                  console.log(
                    "Received guacamole token for user: " +
                      desktop.remoteDesktopToken.username,
                  );
                  this.activeDesktops.set(subterminal.name, desktop);

                  readyTerminalCounter++;
                  if (
                    resolvedOrRejected === false &&
                    readyTerminalCounter === numberOfTerminals
                  ) {
                    resolvedOrRejected = true;
                    return resolve(endpoint);
                  }
                } else {
                  console.log(
                    "Received error while getting token from guacamole server.",
                  );
                  return reject(response.status);
                }
              })
              .catch((err) => {
                console.log("Unable to get token from guacamole server.");
                return reject(err);
              });
          } else if (subterminal.type === "WebApp") {
            // currently WebApps are instantly treated as ready
            // maybe track WebApp init later
            // maybe also store in activeWebApps var?
            readyTerminalCounter++;
            if (
              resolvedOrRejected === false &&
              readyTerminalCounter === numberOfTerminals
            ) {
              resolvedOrRejected = true;
              return resolve(endpoint);
            }
          } else {
            // ignoring other unsupported terminal types, will not be started
            readyTerminalCounter++;
            if (
              resolvedOrRejected === false &&
              readyTerminalCounter === numberOfTerminals
            ) {
              resolvedOrRejected = true;
              return resolve(endpoint);
            }
          }
        });
      });
    });
  }

  async stop(): Promise<void> {
    try {
      const endpoint = await this.makeSureInstanceExists().catch((err) => {
        return Promise.reject(
          new Error(
            "Error: Unable to make sure instance exists " +
              this.environmentId +
              "." +
              err,
          ),
        );
      });

      for (const console of this.activeConsoles) {
        console[1].close(this.environmentId, this.username, this.groupNumber);
      }
      await this.filehandler.close();

      // close consoles of other users in group
      // maybe also stop/close Desktops and WebApps later?
      const activeUsers = new Array<string>();
      Environment.activeEnvironments.forEach((env: Environment) => {
        if (
          env.groupNumber === this.groupNumber &&
          env.username !== this.username
        ) {
          activeUsers.push(env.username);
          for (const console of this.activeConsoles) {
            console[1].close(
              this.environmentId,
              env.username,
              this.groupNumber,
            );
          }
        }
      });
      let stopCmdsRunning = this.configuration.stopCommands.length;
      for (const command of this.configuration.stopCommands) {
        stopCmdsRunning;
        if (command.type === "Shell") {
          let stopCmdFinished = false;
          await new Promise<void>((stopCmdSuccess, stopCmdFail) => {
            global.console.log(
              "Executing stop command: ",
              JSON.stringify(command),
              JSON.stringify(endpoint),
            );
            const console = new SSHConsole(
              this.environmentId,
              this.username,
              this.groupNumber,
              endpoint.IPAddress,
              endpoint.SSHPort,
              command.executable,
              command.params,
              command.cwd,
              command.provideTty,
              endpoint.SSHJumpHost,
            );
            console.on("finished", (code: string, signal: string) => {
              global.console.log(
                "OUTPUT: " +
                  console.stdout +
                  "(exit code: " +
                  code +
                  ", signal: " +
                  signal +
                  ")",
              );
              stopCmdFinished = true;
              stopCmdsRunning--;
              console.emit("closed");
            });
            console.on("closed", () => {
              if (stopCmdFinished === true) {
                stopCmdSuccess();
              } else {
                global.console.log("Stop command failed.");
                stopCmdFail();
              }
            });
          });
        }
      }

      // wait for stop commands to finish
      let timeout = 10;
      while (timeout > 0 && stopCmdsRunning > 0) {
        console.log("Waiting for stop cmds to finish...");
        await new Promise((r) => setTimeout(r, 1000));
        timeout--;
      }
      if (timeout === 0) {
        throw new Error(
          "Timeout while waiting for stop commands to finish. Continuing with deletion.",
        );
      }

      await this.environmentProvider
        .deleteServer(endpoint.instance)
        .then(() => {
          this.persister
            .RemoveUserEnvironment(this.username, this.environmentId)
            .then(() => {
              return Promise.resolve();
            })
            .catch((err) => {
              return Promise.reject(
                new Error("Error: Unable to remove UserEnvironment." + err),
              );
            });
          activeUsers.forEach((user: string) => {
            this.persister
              .RemoveUserEnvironment(user, this.environmentId)
              .then(() => {
                return Promise.resolve();
              })
              .catch((err) => {
                return Promise.reject(
                  new Error(
                    "Error: Unable to remove UserEnvironment for group member " +
                      user +
                      "." +
                      err,
                  ),
                );
              });
          });
        })
        .catch((error: Error) => {
          if (error.message === InstanceNotFoundErrorMessage) {
            // instance already gone (e.g., OpenStack instance already deleted)
            global.console.log(
              "Error ignored: Server Instance not found during deletion?",
            );
            return Promise.resolve();
          } else {
            global.console.log(error.message);
            return Promise.reject(
              new Error("Error: Unable to delete server." + error.message),
            );
          }
        });
    } catch (err) {
      if (
        err instanceof Error &&
        err.message === InstanceNotFoundErrorMessage
      ) {
        return Promise.resolve();
      } else {
        return Promise.reject(err);
      }
    }
  }

  async restart(): Promise<void> {
    const endpoint = await this.makeSureInstanceExists();

    for (const command of this.configuration.stopCommands) {
      if (command.type === "Shell") {
        let resolved = false;
        await new Promise<void>((resolve, reject) => {
          global.console.log(
            "Executing stop command: ",
            JSON.stringify(command),
            JSON.stringify(endpoint),
          );
          const console = new SSHConsole(
            this.environmentId,
            this.username,
            this.groupNumber,
            endpoint.IPAddress,
            endpoint.SSHPort,
            command.executable,
            command.params,
            command.cwd,
            false,
            endpoint.SSHJumpHost,
          );
          console.on("finished", (code: string, signal: string) => {
            global.console.log(
              "OUTPUT: " +
                console.stdout +
                "(exit code: " +
                code +
                ", signal: " +
                signal +
                ")",
            );
            resolved = true;
            console.emit("closed");
          });
          console.on("closed", () => {
            if (resolved) resolve();
            else
              reject(
                new Error("Unable to run stop command." + command.executable),
              );
          });
        });
      }
    }

    console.log("Stop commands finished...");
    Environment.activeEnvironments.forEach((value: Environment) => {
      if (value.groupNumber === this.groupNumber) {
        console.log("Found group env " + value.environmentId + "...");
        const terminal = value.getConsoles();
        terminal.forEach((value: Console) => {
          console.log("Found active console in " + value.cwd + "...");
          // write command to console
          value.write("cd " + value.cwd + "\n");
          console.log(
            "Executing " + value.command + " " + value.args.join(" ") + "\n",
          );
          value.write(value.command + " " + value.args.join(" ") + "\n");
        });
      }
    });
  }

  async runSSHCommand(
    command: string,
    stdoutSuccessMatch?: string,
  ): Promise<string> {
    const endpoint = await this.makeSureInstanceExists();
    let resolved = false;

    return new Promise((resolve, reject) => {
      // run sshCommand
      const console = new SSHConsole(
        this.environmentId,
        this.username,
        this.groupNumber,
        endpoint.IPAddress,
        endpoint.SSHPort,
        command,
        [""],
        "/",
        false,
        endpoint.SSHJumpHost,
      );
      console.on("finished", (code: number, signal: string) => {
        global.console.log(
          "STDOUT: " +
            console.stdout +
            "STDERR: " +
            console.stderr +
            "(exit code: " +
            code +
            ", signal: " +
            signal +
            ")",
        );
        if (code === 0) {
          // if stdoutSuccessMatch was supplied, try to match stdout against it, to detect whether cmd was successfull
          if (stdoutSuccessMatch) {
            if (console.stdout.match(stdoutSuccessMatch)) {
              // command was run successfully (exit code 0) and stdout matched regexp defined in test
              resolved = true;
            } else {
              resolved = false;
            }
          } else {
            // command was run successfully (exit code 0)
            resolved = true;
          }
        } else {
          resolved = false;
        }
        console.emit("closed");
      });
      console.on("closed", () => {
        if (resolved) resolve(console.stdout);
        else reject(new Error("Unable to run SSH command " + command));
      });
    });
  }

  async test(
    stepIndex: string,
    terminalStates: TerminalStateType[],
  ): Promise<TestResult> {
    console.log("TESTING step " + stepIndex);

    if (this.configuration.steps && this.configuration.steps?.length > 0) {
      const activeStep = this.configuration.steps[parseInt(stepIndex)];
      let testOutput = "";
      let someTestsFailed = false;

      for (const test of activeStep.tests) {
        let testPassed = false;
        // per default test result is false
        if (test.type === "TerminalBufferSearch") {
          // search in terminalBuffer for match
          if (terminalStates.length === 0) {
            return Promise.reject(
              new Error(
                "No terminal states available. Please use the terminals to run the steps given in the assignment and check again.",
              ),
            );
          } else {
            for (const terminalState of terminalStates) {
              const split = terminalState.endpoint.split("/");
              const element = split.pop();

              if (element !== undefined && element.match(test.terminal)) {
                if (terminalState.state.match(test.match)) {
                  testOutput += "PASSED: " + test.successMessage + " ";
                  testPassed = true;
                }
              }
            }
            if (testPassed !== true)
              testOutput += "FAILED: " + test.errorHint + " ";
          }
        } else if (test.type === "SSHCommand") {
          await this.runSSHCommand(test.command, test.stdOutMatch)
            .then(() => {
              testOutput += "PASSED: " + test.successMessage + " ";
              testPassed = true;
            })
            .catch(() => {
              testOutput += "FAILED: " + test.errorHint + " ";
            });
        }
        // if any of the terminalStates matched
        if (testPassed === true && someTestsFailed !== true)
          someTestsFailed = false;
        else someTestsFailed = true;
      }
      if (someTestsFailed !== undefined && someTestsFailed === false)
        return Promise.resolve({
          code: 201,
          message: "All tests passed! " + testOutput,
        });
      else
        return Promise.resolve({
          code: 251,
          message: "Some Tests failed! " + testOutput,
        });
    } else {
      return Promise.reject(
        new Error(
          "Cannot execute test. No steps defined in tasks for assignment.",
        ),
      );
    }
  }

  async submit(
    stepIndex: string,
    terminalStates: TerminalStateType[],
  ): Promise<void> {
    console.log("SUBMITTING assignment (step " + stepIndex + ")");
    const submittedFiles = new Array<SubmissionFileType>();
    for (const [alias] of this.editableFiles.entries()) {
      await this.readFile(alias).then((fileContent: string) => {
        submittedFiles.push({ fileName: alias, fileContent: fileContent });
      });
    }

    // if submissionPrepareCommand is defined in config, run it and include its output
    if (this.configuration.submissionPrepareCommand) {
      let submissionPrepareResult = "";
      const cmdWithExpanededVars = this.configuration.submissionPrepareCommand
        .replace("$user", this.username)
        .replace("$environment", this.environmentId);
      await this.runSSHCommand(cmdWithExpanededVars)
        .then((result) => {
          submissionPrepareResult = result;
        })
        .catch((error: Error) => {
          submissionPrepareResult = error.message;
        });
      if (submissionPrepareResult) {
        submittedFiles.push({
          fileName: "sumissionPrepareResult-output.log",
          fileContent: submissionPrepareResult,
        });
      }
    }

    // if submissionSupplementalFiles are defined in config, include them in the submission
    if (this.configuration.submissionSupplementalFiles) {
      for (const supplementalFile of this.configuration
        .submissionSupplementalFiles) {
        const fileNameWithExpanededVars = supplementalFile
          .replace("$user", this.username)
          .replace("$environment", this.environmentId);
        const fileContent = await this.filehandler.readFile(
          fileNameWithExpanededVars,
          "binary",
        );
        const flattenedFilePathName = fileNameWithExpanededVars
          .replace(/\//g, "_")
          .replace(/\\/g, "_");
        submittedFiles.push({
          fileName: flattenedFilePathName,
          fileContent: fileContent,
        });
      }
    }

    // if submissionCleanupCommand is defined in config, run it and include its output
    if (this.configuration.submissionCleanupCommand) {
      let submissionCleanupResult = "";
      const cmdWithExpanededVars = this.configuration.submissionCleanupCommand
        .replace("$user", this.username)
        .replace("$environment", this.environmentId);
      await this.runSSHCommand(cmdWithExpanededVars)
        .then((result) => {
          submissionCleanupResult = result;
        })
        .catch((error: Error) => {
          submissionCleanupResult = error.message;
        });
      if (submissionCleanupResult) {
        submittedFiles.push({
          fileName: "submissionCleanupResult-output.log",
          fileContent: submissionCleanupResult,
        });
      }
    }

    await this.persister.SubmitUserEnvironment(
      this.username,
      this.groupNumber,
      this.environmentId,
      terminalStates,
      submittedFiles,
    );
  }

  public static async getUserSubmissions(
    persister: Persister,
    username: string,
    groupNumber: number,
  ): Promise<Submission[]> {
    const result = await persister.GetUserSubmissions(username, groupNumber);
    return result;
  }

  public async readFile(
    alias: string,
    alreadyResolved?: boolean,
  ): Promise<string> {
    let resolvedPath;
    if (alreadyResolved === undefined || !alreadyResolved) {
      resolvedPath = this.editableFiles.get(alias);
      if (resolvedPath === undefined) {
        throw new Error("Could not resolve alias.");
      }
    } else {
      resolvedPath = alias;
    }

    const content = await this.filehandler.readFile(resolvedPath);
    return content;
  }

  public async writeFile(
    alias: string,
    newContent: string,
    alreadyResolved?: boolean,
  ): Promise<void> {
    let resolvedPath;
    if (alreadyResolved === undefined || !alreadyResolved) {
      resolvedPath = this.editableFiles.get(alias);
    } else {
      resolvedPath = alias;
    }
    if (resolvedPath === undefined) {
      throw new Error("Could not resolve alias.");
    }
    await this.filehandler.writeFile(resolvedPath, newContent);
  }

  // Create a yjs Doc, handle intial content and return it
  public static async getCollabDoc(
    alias: string,
    environmentId: string,
    username: string,
  ): Promise<string> {
    if (this.activeCollabDocs.get(alias) === undefined) {
      const env = Environment.getActiveEnvironment(environmentId, username);
      const resolvedPath = env?.editableFiles.get(alias);

      if (!env || resolvedPath === undefined) {
        throw new Error("Could not resolve alias.");
      }

      const content = await env.filehandler.readFile(resolvedPath);
      const ydoc = new Y.Doc();
      const ytext = ydoc.getText("monaco");

      ytext.insert(0, content);
      this.activeCollabDocs.set(
        alias,
        fromUint8Array(Y.encodeStateAsUpdate(ydoc)),
      );
    }

    return this.activeCollabDocs.get(alias)!; // TODO: might be undefined?
  }

  async getProviderInstanceStatus(): Promise<string> {
    const endpoint = await this.makeSureInstanceExists();
    return endpoint.providerInstanceStatus;
  }
}
