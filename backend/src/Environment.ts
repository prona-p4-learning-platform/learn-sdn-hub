import crypto from "node:crypto";
import { fromUint8Array } from "js-base64";
import querystring from "querystring";
import * as Y from "yjs";

import SSHConsole, { Console, JumpHost } from "./consoles/SSHConsole";
import FileHandler from "./filehandler/SSHFileHandler";
import {
  InstanceProvider,
  VMEndpoint,
  InstanceNotFoundErrorMessage,
} from "./providers/Provider";
import { Persister } from "./database/Persister";
import { getBackendIdentifier } from "./utils/BackendIdentifier";

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
  mountKubeconfig?: boolean;

  //SAL
  sshTunnelingPorts? : string[];
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
  private environmentProvider: InstanceProvider;
  private persister: Persister;
  private username: string;
  private filehandler!: FileHandler | undefined;
  private groupNumber: number;
  private sessionId: string;

  public static async getDeployedUserSessionEnvironmentList(
    persister: Persister,
    username: string,
  ): Promise<Array<string>> {
    const userEnvironments = await persister.GetUserEnvironments(username);
    return userEnvironments.map(env => env.environment);
  }

  public static async getDeployedGroupEnvironmentList(
    persister: Persister,
    groupNumber: number,
  ): Promise<string[]> {
    // Get all users in the group and their environments
    const allUsers = await persister.GetAllUsers();
    const groupUsers = allUsers.filter(user => user.groupNumber === groupNumber);
    
    const deployedEnvironments = new Set<string>();
    
    for (const user of groupUsers) {
      const userEnvironments = await persister.GetUserEnvironments(user.username);
      userEnvironments.forEach(env => deployedEnvironments.add(env.environment));
    }
    
    return Array.from(deployedEnvironments);
  }

  // Helper method for websocket handlers to get an Environment instance for a deployed environment
  public static async getEnvironmentForWebsocket(
    environmentId: string,
    groupNumber: number,
    sessionId: string,
    persister: Persister,
    provider: InstanceProvider,
    environmentConfigs: Map<string, EnvironmentDescription>,
  ): Promise<Environment | undefined> {
    // Find any user in the group that has this environment deployed
    const allUsers = await persister.GetAllUsers();
    const groupUsers = allUsers.filter(user => user.groupNumber === groupNumber);
    
    for (const user of groupUsers) {
      const userEnvironments = await persister.GetUserEnvironments(user.username);
      const deployedEnv = userEnvironments.find(env => env.environment === environmentId);
      
      if (deployedEnv) {
        const targetEnv = environmentConfigs.get(environmentId);
        if (targetEnv) {
          try {
            // Create an Environment instance for this websocket connection
            // Use the first user found who has the environment deployed
            return await Environment.createEnvironment(
              user.username,
              groupNumber,
              sessionId,
              environmentId,
              targetEnv,
              provider,
              persister,
            );
          } catch (error) {
            console.log(`Failed to create environment instance for websocket: ${String(error)}`);
            return undefined;
          }
        }
        break;
      }
    }
    
    return undefined;
  }

  private constructor(
    username: string,
    groupNumber: number,
    sessionId: string,
    environmentId: string,
    configuration: EnvironmentDescription,
    environmentProvider: InstanceProvider,
    persister: Persister,
  ) {
    this.activeConsoles = new Map();
    this.activeDesktops = new Map();
    this.filehandler = undefined;
    this.editableFiles = new Map();
    this.configuration = configuration;
    this.environmentProvider = environmentProvider;
    this.persister = persister;
    this.username = username;
    this.groupNumber = groupNumber;
    this.sessionId = sessionId;
    this.environmentId = environmentId;

    //TODO go through all environments stored in db and check if instances are still running, if not remove environment in db

    //TODO maybe move scheduler here, to prune environments that are not used anymore, would reduce redundant code in providers
    // and lead to an easier to understand codebase (esp. as then instances can be directly deleted instead of )
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
    sessionId: string,
    environmentId: string,
    env: EnvironmentDescription,
    provider: InstanceProvider,
    persister: Persister,
  ): Promise<Environment> {
    const environment = new Environment(
      username,
      groupNumber,
      sessionId,
      environmentId,
      env,
      provider,
      persister,
    );

    console.log(
      "Creating new environment: " +
        environmentId +
        " for user: " +
        username +
        " in group: " +
        groupNumber +
        " session: " +
        sessionId,
    );

    // Check if group already has environments deployed
    const groupEnvironments = await Environment.getDeployedGroupEnvironmentList(persister, groupNumber);
    
    if (groupEnvironments.length > 0 && !groupEnvironments.includes(environmentId)) {
      return Promise.reject(
        new Error(
          "You or your group already deployed another environment. Please reload assignment list.",
        ),
      );
    }

    // Check if this environment is already deployed by someone in the group
    const allUsers = await persister.GetAllUsers();
    const groupUsers = allUsers.filter(user => user.groupNumber === groupNumber);
    
    let existingInstance: string | undefined;
    for (const user of groupUsers) {
      const userEnvironments = await persister.GetUserEnvironments(user.username);
      const existingEnv = userEnvironments.find(env => env.environment === environmentId);
      if (existingEnv) {
        existingInstance = existingEnv.instance;
        break;
      }
    }

    if (existingInstance) {
      // Join existing environment
      await persister
        .AddUserEnvironment(
          username,
          environmentId,
          env.description,
          existingInstance,
          getBackendIdentifier(),
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
          " in group: " +
          groupNumber +
          " session: " +
          sessionId +
          " using instance: " +
          existingInstance,
      );

      await environment
        .start(env, sessionId, false)
        .then(() => {
          return Promise.resolve(environment);
        })
        .catch((err) => {
          return Promise.reject(
            new Error("Failed to join environment of your group." + err),
          );
        });
    } else {
      // Create new environment
      await environment
        .start(env, sessionId, true)
        .then(() => {
          return Promise.resolve(environment);
        })
        .catch((err) => {
          return Promise.reject(
            new Error("Start of environment failed. " + err),
          );
        });
    }
    
    return Promise.resolve(environment);
  }

  static async deleteEnvironment(
    persister: Persister,
    provider: InstanceProvider,
    groupNumber: number,
    environmentId: string,
  ): Promise<boolean> {
    try {
      // Get all users in the group
      const allUsers = await persister.GetAllUsers();
      const groupUsers = allUsers.filter(user => user.groupNumber === groupNumber);
      
      // Find the instance for this environment
      let instanceToDelete: string | undefined;
      for (const user of groupUsers) {
        const userEnvironments = await persister.GetUserEnvironments(user.username);
        const envToDelete = userEnvironments.find(env => env.environment === environmentId);
        if (envToDelete) {
          instanceToDelete = envToDelete.instance;
          break;
        }
      }

      if (instanceToDelete) {
        // Delete the instance
        await provider.deleteServer(instanceToDelete);
        
        // Remove environment from all group users
        for (const user of groupUsers) {
          await persister.RemoveUserEnvironment(user.username, environmentId, getBackendIdentifier())
            .catch((err: Error) => {
              console.log(`Warning: Could not remove environment for user ${user.username}: ${err.message}`);
            });
        }
        
        return true;
      } else {
        console.log("Environment not found in persister.");
        return false;
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes(InstanceNotFoundErrorMessage)) {
          console.log(
            "Environment was already stopped. Silently deleting leftovers in user session.",
          );
          
          // Remove environment from all group users even if instance is gone
          const allUsers = await persister.GetAllUsers();
          const groupUsers = allUsers.filter(user => user.groupNumber === groupNumber);
          
          for (const user of groupUsers) {
            await persister.RemoveUserEnvironment(user.username, environmentId, getBackendIdentifier())
              .catch((removeErr: Error) => {
                console.log(`Warning: Could not remove environment for user ${user.username}: ${removeErr.message}`);
              });
          }
          
          return true;
        } else {
          console.log("Failed to stop environment. " + JSON.stringify(err));
          throw err;
        }
      }
      throw err;
    }
  }


  static async deleteInstanceEnvironments(
    persister: Persister,
    provider: InstanceProvider,
    instance: string,
  ): Promise<boolean> {
    let instanceEnvironmentFound = false;

    // Get all users and check their environments for this instance
    const allUsers = await persister.GetAllUsers();
    
    for (const user of allUsers) {
      const userEnvironments = await persister.GetUserEnvironments(user.username);
      const envWithInstance = userEnvironments.find(env => env.instance === instance);
      
      if (envWithInstance) {
        instanceEnvironmentFound = true;

        // the environment uses the specified instance and should be deleted
        await this.deleteEnvironment(
          persister,
          provider,
          user.groupNumber,
          envWithInstance.environment,
        ).then((result) => {
          if (!result) {
            // unable to delete environment
            throw new Error(
              `Environment used by instance ${instance} could not be deleted.`,
            );
          }
        });
        
        // Break after finding the first match since all users in the group should share the same instance
        break;
      }
    }

    return instanceEnvironmentFound;
  }

  async getLanguageServerPort(): Promise<number> {
    const endpoint = await this.makeSureInstanceExists();
    return endpoint.LanguageServerPort;
  }

  async getIPAddress(): Promise<string> {
    const endpoint = await this.makeSureInstanceExists();
    return endpoint.IPAddress;
  }

  async getJumphost(): Promise<JumpHost | undefined> {
    const endpoint = await this.makeSureInstanceExists();
    return endpoint.SSHJumpHost;
  }

  async makeSureInstanceExists(createIfMissing?: boolean): Promise<VMEndpoint> {
    const environments = await this.persister
      .GetUserEnvironments(this.username)
      .catch((error: Error) => {
        throw new Error("Unable to get UserEnvironments.\n" + error.message);
      });

    console.log("Current user environments: " + JSON.stringify(environments));

    const filtered = environments.filter(
      (env) => env.environment === this.environmentId,
    );

    if (filtered.length === 1) {
      console.log(
        `Environment ${this.environmentId} already deployed for user ${this.username}, trying to reopen it...`,
      );

      return await this.environmentProvider
        .getServer(filtered[0].instance)
        .catch(async (error: Error) => {
          if (error.message === InstanceNotFoundErrorMessage) {
            // instance is gone, remove environment
            await this.persister.RemoveUserEnvironment(
              this.username,
              filtered[0].environment,
              getBackendIdentifier(),
            );
          }

          throw error;
        });
    } else if (filtered.length === 0) {
      if (createIfMissing === true) {
        return await this.environmentProvider.createServer(
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
            proxmoxTemplateTag: this.configuration.providerProxmoxTemplateTag,
            mountKubeconfig: this.configuration.mountKubeconfig,
            //SAL
            sshTunnelingPorts: this.configuration.sshTunnelingPorts,
          },
        );
      } else throw new Error(DenyStartOfMissingInstanceErrorMessage);
    } else {
        throw new Error(
          `More than 1 environment exists for user ${this.username}. Remove duplicate environments from persister! Envs found:\n ${JSON.stringify(filtered, null, 2)}`,
        );
    }
  }

  async start(
    desc: EnvironmentDescription = this.configuration,
    sessionId: string,
    createIfMissing: boolean,
  ): Promise<VMEndpoint> {
    const endpoint = await this.makeSureInstanceExists(createIfMissing);

    await this.persister.AddUserEnvironment(
      this.username,
      this.environmentId,
      this.configuration.description,
      endpoint.instance,
      getBackendIdentifier(),
    );

    console.log(
      `Added new environment: ${this.environmentId} for user: ${this.username} using endpoint: ${JSON.stringify(endpoint)}`,
    );

    //SAL
    // this.filehandler = new FileHandler(
    //   this.environmentId,
    //   this.username,
    //   this.groupNumber,
    //   this.sessionId,
    //   endpoint.IPAddress,
    //   endpoint.SSHPort,
    //   endpoint.SSHJumpHost,
    // );
    this.filehandler = await FileHandler.create(
      this.environmentId,
      this.username,
      this.groupNumber,
      this.sessionId,
      endpoint.IPAddress,
      endpoint.SSHPort,
      endpoint.SSHJumpHost,
    );

    for (const file of desc.editableFiles)
      this.addEditableFile(file.alias, file.absFilePath);

    for (const subterminals of desc.terminals) {
      for (const subterminal of subterminals) {
        switch (subterminal.type) {
          case "Shell":
            {
              console.log(
                "Opening console: ",
                JSON.stringify(subterminal),
                JSON.stringify(endpoint),
              );

              // SAL - replace placeholder in params (ToDo: In Function auslagern, was es für alle subTerminal.Types macht?)
              subterminal.params = subterminal.params.map(str => str.replace(/\$\((GROUP_ID)\)/g, this.groupNumber.toString()));

              await new Promise<void>((resolve, reject) => {
                const sshConsole = new SSHConsole(
                  this.environmentId,
                  subterminal.name,
                  this.username,
                  this.groupNumber,
                  sessionId,
                  endpoint.IPAddress,
                  endpoint.SSHPort,
                  subterminal.executable,
                  subterminal.params,
                  subterminal.cwd,
                  subterminal.provideTty,
                  endpoint.SSHJumpHost,
                );

                sshConsole.on("ready", () => {
                  this.activeConsoles.set(subterminal.name, sshConsole);
                  resolve();
                });

                sshConsole.on("error", (err: Error) => {
                  reject(err);
                });

                sshConsole.on("close", () => {
                  this.activeConsoles.delete(subterminal.name);
                  reject(new Error("Unable to create environment"));
                });
              });
            }
            break;
          case "Desktop":
            {
              console.log(
                "Opening desktop: ",
                JSON.stringify(subterminal),
                JSON.stringify(endpoint),
              );

              // currently fixed to guacamole and VNC, additional protocols require
              // different params, see:
              //   https://guacamole.apache.org/doc/gug/json-auth.html
              //   https://guacamole.apache.org/doc/gug/configuring-guacamole.html#connection-configuration

              const groupEnv = `${this.groupNumber.toString(10)}-${this.environmentId}`;
              // Add -join as connection to join already existing connections
              const groupEnvJoin = `${groupEnv}-join`;
              const payload = {
                username: this.username,
                expires: (Date.now() + 2 * 3600 * 1000).toString(),
                connections: {
                  [groupEnv]: {
                    id: groupEnv,
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
                  [groupEnvJoin]: {
                    id: groupEnvJoin,
                    join: groupEnv,
                    parameters: {
                      "read-only": "false",
                    },
                  },
                },
              };
              const strPayload = JSON.stringify(payload);
              // change secret (128 bit, 16 byte secret in hexadecimal)
              const key = Buffer.from(
                "4c0b569e4c96df157eee1b65dd0e4d41",
                "hex",
              );
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

              await fetch(subterminal.guacamoleServerURL + "/api/tokens", {
                method: "POST",
                body: "data=" + urlenctoken,
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                },
              })
                .then((response) => {
                  if (response.status === 200) return response.json();
                  else
                    throw new Error(
                      `Unable to get token from guacamole server (Code: ${response.status}).`,
                    );
                })
                .then((json: GuacamoleAuthResponse) => {
                  const desktop: DesktopInstance = {
                    remoteDesktopProtocol: subterminal.remoteDesktopProtocol,
                    remoteDesktopPort: subterminal.remoteDesktopPort,
                    remoteDesktopPassword: subterminal.remoteDesktopPassword,
                    remoteDesktopToken: json,
                    guacamoleServerURL: subterminal.guacamoleServerURL,
                  };

                  console.log(
                    "Received guacamole token for user: " +
                      desktop.remoteDesktopToken.username,
                  );
                  this.activeDesktops.set(subterminal.name, desktop);
                })
                .catch((err: Error) => {
                  console.log("Unable to get token from guacamole server.");
                  throw err;
                });
            }
            break;
          case "WebApp":
            {
              // SAL - replace placeholder in url (ToDo: In Function auslagern, was es für alle subTerminal.Types macht?)
              const url = subterminal.url.replace(/(\d+)\$\((GROUP_ID)\)/g, (_, port, __) => {
                // console.log(port);
                return (Number(port) + this.groupNumber).toString();
              });
              subterminal.url = url;

              // currently WebApps are instantly treated as ready
              // maybe track WebApp init later
              // maybe also store in activeWebApps var?
              console.log(
                "Opening webapp: ",
                JSON.stringify(subterminal),
                JSON.stringify(endpoint),
              );
            }
            break;
          default:
            // ignoring other unsupported terminal types, will not be started
            break;
        }
      }
    }

    return endpoint;
  }

  async stop(): Promise<void> {
    try {
      const endpoint = await this.makeSureInstanceExists().catch(
        (err: Error) => {
          throw new Error(
            `Error: Unable to make sure instance exists ${this.environmentId}.\n${err.message}`,
          );
        },
      );

      // environments are run per group, so stop all consoles (ssh) and close the filehandler (scp) and remove desktop contexts
      for (const [identifier, handler] of this.activeConsoles) {
        handler.close(this.environmentId, this.groupNumber);
        this.activeConsoles.delete(identifier);
      }

      await this.filehandler?.close();
      this.filehandler = undefined;

      for (const [identifier, _] of this.activeDesktops) {
        this.activeDesktops.delete(identifier);
      }

      // get other active users in group
      const allUsers = await this.persister.GetAllUsers();
      const groupUsers = allUsers.filter(user => user.groupNumber === this.groupNumber && user.username !== this.username);
      const activeUsers: string[] = [];
      
      for (const user of groupUsers) {
        const userEnvironments = await this.persister.GetUserEnvironments(user.username);
        if (userEnvironments.some(env => env.environment === this.environmentId)) {
          activeUsers.push(user.username);
        }
      }

      // run stop commands
      for (const command of this.configuration.stopCommands) {
        if (command.type === "Shell") {
          await new Promise<void>((resolve, reject) => {
            // session is not used as command is not run from a console,
            // so it can be anything and also create a new SSH connection if needed
            // (no need to reuse an existing connection)
            const sshConsole = new SSHConsole(
              this.environmentId,
              command.name,
              this.username,
              this.groupNumber,
              undefined,
              endpoint.IPAddress,
              endpoint.SSHPort,
              command.executable,
              command.params,
              command.cwd,
              command.provideTty,
              endpoint.SSHJumpHost,
            );
            let stopCmdFinished = false;

            sshConsole.on("finished", () => {
              stopCmdFinished = true;
              sshConsole.emit("closed");
            });

            sshConsole.on("closed", () => {
              if (!stopCmdFinished) {
                console.log("Stop command failed.");
                reject(new Error("Stop command failed."));
              } else resolve();
            });
          });
        }
      }

      await this.environmentProvider
        .deleteServer(endpoint.instance)
        .then(async () => {
          await this.persister
            .RemoveUserEnvironment(this.username, this.environmentId, getBackendIdentifier())
            .catch((err: Error) => {
              throw new Error(
                "Error: Unable to remove UserEnvironment.\n" + err.message,
              );
            });

          for (const user of activeUsers) {
            await this.persister
              .RemoveUserEnvironment(user, this.environmentId, getBackendIdentifier())
              .catch((err: Error) => {
                throw new Error(
                  `Error: Unable to remove UserEnvironment for group member ${user}.\n${err.message}`,
                );
              });
          }
        });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === InstanceNotFoundErrorMessage) {
          // instance already gone (e.g., OpenStack instance already deleted)
          console.log(
            "Error ignored: Server Instance not found during deletion?",
          );
          return;
        } else {
          throw new Error("Error: Unable to delete server.\n" + err.message);
        }
      }

      throw new Error("Error: Unable to delete server.\nUnknown error.");
    }
  }

  async restart(sessionId: string): Promise<void> {
    const endpoint = await this.makeSureInstanceExists();

    for (const command of this.configuration.stopCommands) {
      if (command.type === "Shell") {
        let resolved = false;
        await new Promise<void>((resolve, reject) => {
          //console.log(
          //  "Executing stop command: ",
          //  JSON.stringify(command),
          //  JSON.stringify(endpoint),
          //);
          const sshConsole = new SSHConsole(
            this.environmentId,
            command.name,
            this.username,
            this.groupNumber,
            sessionId,
            endpoint.IPAddress,
            endpoint.SSHPort,
            command.executable,
            command.params,
            command.cwd,
            false,
            endpoint.SSHJumpHost,
          );
          sshConsole.on("finished", (_code: string, _signal: string) => {
            // console.log(
            //   "OUTPUT: " +
            //     sshConsole.stdout +
            //     "(exit code: " +
            //     code +
            //     ", signal: " +
            //     signal +
            //     ")",
            // );
            resolved = true;
            sshConsole.emit("closed");
          });
          sshConsole.on("closed", () => {
            if (resolved) resolve();
            else
              reject(
                new Error("Unable to run stop command: " + command.executable),
              );
          });
        });
      }
    }

    console.log("Stop commands finished...");
    // Note: The restart functionality that relied on activeEnvironments has been removed
    // as environments are now managed through the persister. Individual console restart
    // should be handled differently if needed.
  }

  async runSSHCommand(
    command: string,
    stdoutSuccessMatch?: string,
  ): Promise<string> {
    const endpoint = await this.makeSureInstanceExists();
    let resolved = false;

    return new Promise((resolve, reject) => {
      // run sshCommand
      const sshConsole = new SSHConsole(
        this.environmentId,
        // name and session are not used as command is not run from a console,
        // so it can be anything and also create a new SSH connection if needed
        // (no need to reuse an existing connection)
        // also, no need to specify args and use / as cwd
        "NoConsole",
        this.username,
        this.groupNumber,
        undefined,
        endpoint.IPAddress,
        endpoint.SSHPort,
        command,
        [""],
        "/",
        false,
        endpoint.SSHJumpHost,
      );
      sshConsole.on("finished", (code: number, _signal: string) => {
        // console.log(
        //   "STDOUT: " +
        //     sshConsole.stdout +
        //     "STDERR: " +
        //     sshConsole.stderr +
        //     "(exit code: " +
        //     code +
        //     ", signal: " +
        //     signal +
        //     ")",
        //);
        if (code === 0) {
          // if stdoutSuccessMatch was supplied, try to match stdout against it, to detect whether cmd was successfull
          if (stdoutSuccessMatch) {
            if (sshConsole.stdout.match(stdoutSuccessMatch)) {
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
        sshConsole.emit("closed");
      });
      sshConsole.on("closed", () => {
        if (resolved) resolve(sshConsole.stdout);
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
      await this.readFile(alias).then((fileContent: string | undefined) => {
        if (fileContent === undefined) {
          throw new Error(
            "Could not read file content for " + alias + " during submission.",
          );
        }
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
        await this.filehandler
          ?.readFile(fileNameWithExpanededVars, "binary")
          .then((content) => {
            const flattenedFilePathName = fileNameWithExpanededVars
              .replace(/\//g, "_")
              .replace(/\\/g, "_");
            submittedFiles.push({
              fileName: flattenedFilePathName,
              fileContent: content,
            });
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

    await this.persister.CreateUserSubmission(
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
  ): Promise<string | undefined> {
    let resolvedPath: string | undefined;

    if (alreadyResolved === undefined || !alreadyResolved) {
      resolvedPath = this.editableFiles.get(alias);
      if (resolvedPath === undefined) {
        throw new Error("Could not resolve alias " + alias + ".");
      }
    } else {
      resolvedPath = alias;
    }

    const content = await this.filehandler?.readFile(resolvedPath);
    return content;
  }

  public async writeFile(
    alias: string,
    newContent: string,
    alreadyResolved?: boolean,
  ): Promise<void> {
    let resolvedPath: string | undefined;

    if (alreadyResolved === undefined || !alreadyResolved) {
      resolvedPath = this.editableFiles.get(alias);
    } else {
      resolvedPath = alias;
    }

    if (resolvedPath === undefined) {
      throw new Error(`Could not resolve alias "${alias}".`);
    }

    await this.filehandler?.writeFile(resolvedPath, newContent);
  }

  // Create a yjs Doc, handle intial content and return it
  // Note: This method now requires an Environment instance to be passed
  // since we no longer maintain a static activeEnvironments map
  public static async getCollabDoc(
    alias: string,
    environment: Environment,
  ): Promise<string> {
    if (this.activeCollabDocs.get(alias) === undefined) {
      const resolvedPath = environment.editableFiles.get(alias);

      if (resolvedPath === undefined) {
        throw new Error("Could not resolve alias.");
      }

      const content = await environment.filehandler?.readFile(resolvedPath);
      if (content === undefined) {
        throw new Error(
          "Could not read file content to populate collaboration document " +
            alias +
            ".",
        );
      }
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
