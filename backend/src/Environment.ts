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

class WebAppInstance {
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

class DesktopInstance {
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

export interface Submission {
  assignmentName: string;
  lastChanged: Date;
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
  rootPath?: string;
  workspaceFolders?: string[];
  useCollaboration?: boolean;
  useLanguageClient?: boolean;
}

const DenyStartOfMissingInstanceErrorMessage =
  "Instance not found and explicitly told not to create a new instance.";

export default class Environment {
  private activeConsoles: Map<string, Console>;
  private activeDesktops: Map<string, DesktopInstance>;
  private activeWebApps: Map<string, WebAppInstance>;
  private editableFiles: Map<string, string>;
  private static activeCollabDocs = new Map<string, string>();
  private configuration: EnvironmentDescription;
  private environmentId: string;
  private instanceId: string;
  private static activeEnvironments = new Map<string, Environment>();
  private environmentProvider: InstanceProvider;
  private persister: Persister;
  private username: string;
  private filehandler: FileHandler;
  private groupNumber: number;

  public static getActiveEnvironment(
    environmentId: string,
    username: string,
  ): Environment {
    return Environment.activeEnvironments.get(`${username}-${environmentId}`);
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

  public static getDeployedGroupEnvironmentList(
    groupNumber: number,
  ): Array<string> {
    const deployedEnvironmentsForGroup: Array<string> = new Array<string>();
    Environment.activeEnvironments.forEach(
      async (value: Environment, key: string) => {
        if (value.groupNumber == groupNumber) {
          deployedEnvironmentsForGroup.push(key.split("-").slice(1).join("-"));
        }
      },
    );
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
    this.activeWebApps = new Map();
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

  public getFilePathByAlias(alias: string): string {
    return this.editableFiles.get(alias);
  }

  public getConsoleByAlias(alias: string): Console {
    return this.activeConsoles.get(alias);
  }

  public getConsoles(): Map<string, Console> {
    return this.activeConsoles;
  }

  public getDesktopByAlias(alias: string): DesktopInstance {
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
    return new Promise<Environment>(async (resolve, reject) => {
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
      Environment.activeEnvironments.forEach((environment: Environment) => {
        if (environment.groupNumber === groupNumber) {
          if (environment.environmentId !== environmentId) {
            throw Error(
              "Your group already deployed another environment. Please reload assignment list.",
            );
          } else {
            activeEnvironmentsForGroup.push(environment);
          }
        }
      });
      if (activeEnvironmentsForGroup.length === 0) {
        environment
          .start(env, true)
          .then((endpoint) => {
            environment.instanceId = endpoint.instance;
            Environment.activeEnvironments.set(
              `${username}-${environmentId}`,
              environment,
            );
            return resolve(environment);
          })
          .catch((err) => {
            Environment.activeEnvironments.delete(
              `${username}-${environmentId}`,
            );
            return reject(new Error("Start of environment failed." + err));
          });
      } else {
        // the group already runs an environment add this user to it
        // and reuse instance
        let groupEnvironmentInstance;
        const userEnvironmentsOfOtherGroupUser =
          await persister.GetUserEnvironments(
            activeEnvironmentsForGroup[0].username,
          );
        for (const userEnvironmentOfOtherGroupUser of userEnvironmentsOfOtherGroupUser) {
          if (
            userEnvironmentOfOtherGroupUser.environment ===
            activeEnvironmentsForGroup[0].environmentId
          ) {
            groupEnvironmentInstance = userEnvironmentOfOtherGroupUser.instance;
          }
        }
        await persister.AddUserEnvironment(
          username,
          activeEnvironmentsForGroup[0].environmentId,
          activeEnvironmentsForGroup[0].configuration.description,
          groupEnvironmentInstance,
        );
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
        environment
          .start(env, false)
          .then((endpoint) => {
            environment.instanceId = endpoint.instance;
            Environment.activeEnvironments.set(
              `${username}-${environmentId}`,
              environment,
            );
            return resolve(environment);
          })
          .catch((err) => {
            Environment.activeEnvironments.delete(
              `${username}-${environmentId}`,
            );
            return reject(
              new Error("Failed to join environment of your group." + err),
            );
          });
      }
    });
  }

  static async deleteEnvironment(
    username: string,
    environmentId: string,
  ): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      const environment = this.getActiveEnvironment(environmentId, username);
      const groupNumber = environment.groupNumber;
      environment
        .stop()
        .then(() => {
          Environment.activeEnvironments.delete(`${username}-${environmentId}`);
          // search for other activeEnvironments in the same group
          Environment.activeEnvironments.forEach((env: Environment) => {
            if (env.groupNumber === groupNumber && env.username != username) {
              Environment.activeEnvironments.delete(
                `${env.username}-${env.environmentId}`,
              );
            }
          });
          return resolve(true);
        })
        .catch((err) => {
          if (err === DenyStartOfMissingInstanceErrorMessage) {
            console.log(
              "Environment was already stopped. Silently deleting leftovers in user session.",
            );
            Environment.activeEnvironments.delete(
              `${username}-${environmentId}`,
            );
            // search for other activeEnvironments in the same group
            Environment.activeEnvironments.forEach((env: Environment) => {
              if (env.groupNumber === groupNumber && env.username != username) {
                Environment.activeEnvironments.delete(
                  `${env.username}-${env.environmentId}`,
                );
              }
            });
            return resolve(true);
          } else {
            console.log("Failed to stop environment. " + JSON.stringify(err));
            return reject(false);
          }
        });
    });
  }

  static async deleteInstanceEnvironments(instance: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.activeEnvironments.forEach((env) => {
        if (env.instanceId === instance) {
          // the environment uses the specified instance and should be deleted
          this.deleteEnvironment(env.username, env.environmentId).then(
            (result) => {
              if (!result) {
                // unable to delete environment
                throw new Error(
                  "Environment used by instance " +
                    instance +
                    " could not be deleted.",
                );
              }
            },
          );
        }
      });
      return resolve(true);
    });
  }

  async getLanguageServerPort(): Promise<number> {
    try {
      const endpoint = await this.makeSureInstanceExists();
      return endpoint.LanguageServerPort;
    } catch (err) {
      throw err;
    }
  }

  async getIPAddress(): Promise<string> {
    try {
      const endpoint = await this.makeSureInstanceExists();
      return endpoint.IPAddress;
    } catch (err) {
      throw err;
    }
  }

  async makeSureInstanceExists(createIfMissing?: boolean): Promise<VMEndpoint> {
    return new Promise<VMEndpoint>(async (resolve, reject) => {
      const environments = await this.persister.GetUserEnvironments(
        this.username,
      );
      console.log("Current user environments: " + JSON.stringify(environments));
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
            resolve(endpoint);
          })
          .catch(async (err) => {
            if (err.message == InstanceNotFoundErrorMessage) {
              // instance is gone, remove environment
              await this.persister.RemoveUserEnvironment(
                this.username,
                filtered[0].environment,
              );
            }
            return reject(err);
          });
      } else if (filtered.length === 0) {
        if (createIfMissing === true) {
          resolve(
            this.environmentProvider.createServer(
              this.username,
              this.groupNumber,
              this.environmentId,
              this.configuration.providerImage,
              this.configuration.providerDockerCmd,
              this.configuration.providerDockerSupplementalPorts,
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
              this.persister +
              " envs found: " +
              filtered,
          ),
        );
      }
    });
  }

  async start(
    desc: EnvironmentDescription = this.configuration,
    createIfMissing: boolean,
  ): Promise<VMEndpoint> {
    let endpoint: VMEndpoint;
    try {
      endpoint = await this.makeSureInstanceExists(createIfMissing);
    } catch (err) {
      throw err;
    }
    await this.persister.AddUserEnvironment(
      this.username,
      this.environmentId,
      this.configuration.description,
      endpoint.instance,
    );
    console.log(
      "Added new environment: " +
        this.environmentId +
        "for user: " +
        this.username +
        " using endpoint: " +
        JSON.stringify(endpoint),
    );
    return new Promise((resolve, reject) => {
      try {
        this.filehandler = new FileHandler(
          endpoint.IPAddress,
          endpoint.SSHPort,
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
                  const desktop = new DesktopInstance();
                  desktop.remoteDesktopProtocol =
                    subterminal.remoteDesktopProtocol;
                  desktop.remoteDesktopPort = subterminal.remoteDesktopPort;
                  desktop.remoteDesktopPassword =
                    subterminal.remoteDesktopPassword;
                  desktop.remoteDesktopToken =
                    (await response.json()) as GuacamoleAuthResponse;
                  desktop.guacamoleServerURL = subterminal.guacamoleServerURL;

                  console.log(
                    "Received guacamole token " + desktop.remoteDesktopToken,
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
    return new Promise(async (resolve, reject) => {
      try {
        const endpoint = await this.makeSureInstanceExists();

        for (const console of this.activeConsoles) {
          console[1].close(this.environmentId, this.username, this.groupNumber);
        }
        this.filehandler.close();

        // close consoles of other users in group
        // maybe also stop/close Desktops and WebApps later?
        const activeUsers = new Array<string>();
        Environment.activeEnvironments.forEach((env: Environment) => {
          if (
            env.groupNumber === this.groupNumber &&
            env.username != this.username
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
        for (const command of this.configuration.stopCommands) {
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
              );
              console.on("finished", async (code: string, signal: string) => {
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

        this.environmentProvider
          .deleteServer(endpoint.instance)
          .then(() => {
            this.persister
              .RemoveUserEnvironment(this.username, this.environmentId)
              .then(() => {
                return resolve();
              })
              .catch((err) => {
                return reject(
                  new Error("Error: Unable to remove UserEnvironment." + err),
                );
              });
            activeUsers.forEach((user: string) => {
              this.persister
                .RemoveUserEnvironment(user, this.environmentId)
                .then(() => {
                  return resolve();
                })
                .catch((err) => {
                  return reject(
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
          .catch((err) => {
            if (err.message === InstanceNotFoundErrorMessage) {
              // instance already gone (e.g., OpenStack instance already deleted)
              global.console.log(
                "Error: Server Instance not found during deletion?",
              );
            } else {
              global.console.log(err);
              return reject(new Error("Error: Unable to delete server." + err));
            }
          });
      } catch (err) {
        if (err.message == InstanceNotFoundErrorMessage) {
          return resolve();
        } else {
          return reject(err);
        }
      }
    });
  }

  async restart(): Promise<void> {
    try {
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
              if (resolved === true) return resolve();
              else
                return reject(
                  new Error("Unable to run stop command." + command.executable),
                );
            });
          });
        }
      }
    } catch (err) {
      throw err;
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
    try {
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
        );
        console.on("finished", (code: string, signal: string) => {
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
          if (code == "0") {
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
          if (resolved === true) return resolve(console.stdout);
          else return reject(new Error("Unable to run SSH command " + command));
        });
      });
    } catch (err) {
      throw err;
    }
  }

  async test(
    stepIndex: string,
    terminalStates: TerminalStateType[],
  ): Promise<string> {
    console.log("TESTING step " + stepIndex);

    return new Promise(async (resolve, reject) => {
      if (this.configuration.steps?.length > 0) {
        const activeStep = this.configuration.steps[parseInt(stepIndex)];
        let testOutput = "";
        let someTestsFailed = undefined as boolean;
        for (const test of activeStep.tests) {
          let testPassed = false;
          // per default test result is false
          if (test.type == "TerminalBufferSearch") {
            // search in terminalBuffer for match
            if (terminalStates.length === 0) {
              return reject(
                new Error(
                  "No terminal states available. Please use the terminals to run the steps given in the assignment and check again.",
                ),
              );
            } else {
              for (const terminalState of terminalStates) {
                if (
                  terminalState.endpoint.split("/").pop().match(test.terminal)
                ) {
                  if (terminalState.state.match(test.match)) {
                    testOutput += "PASSED: " + test.successMessage + " ";
                    testPassed = true;
                  }
                }
              }
              if (testPassed !== true)
                testOutput += "FAILED: " + test.errorHint + " ";
            }
          } else if (test.type == "SSHCommand") {
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
          return resolve("All tests passed! " + testOutput);
        else return reject(new Error("Some Tests failed! " + testOutput));
      } else {
        // no tests defined
        global.console.log(
          "Cannot execute test. No steps defined in tasks for assignment.",
        );
        return reject(
          new Error(
            "Cannot execute test. No steps defined in tasks for assignment.",
          ),
        );
      }
    });
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
        .catch((error) => {
          submissionPrepareResult = error;
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
        .catch((error) => {
          submissionCleanupResult = error;
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
    if (alreadyResolved === undefined || alreadyResolved === false) {
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
    if (alreadyResolved === undefined || alreadyResolved === false) {
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
    const env = Environment.getActiveEnvironment(environmentId, username);
    if (this.activeCollabDocs.get(alias) === undefined) {
      const resolvedPath = env.editableFiles.get(alias);
      if (resolvedPath === undefined) {
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
    return this.activeCollabDocs.get(alias);
  }

  async getProviderInstanceStatus(): Promise<string> {
    try {
      const endpoint = await this.makeSureInstanceExists();
      return endpoint.providerInstanceStatus;
    } catch (err) {
      throw err;
    }
  }
}
