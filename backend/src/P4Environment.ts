import SSHConsole, { Console } from "./consoles/SSHConsole";
import FileHandler from "./filehandler/SSHFileHandler";
import {
  InstanceProvider,
  VMEndpoint,
  InstanceNotFoundErrorMessage,
} from "./providers/Provider";
import { Persister } from "./database/Persister";

interface AliasedFile {
  absFilePath: string;
  alias: string;
}

interface Task {
  executable: string;
  cwd: string;
  params: Array<string>;
  provideTty: boolean;
  name: string;
}

interface AssignmentStep {
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
  tasks: Array<Array<Task>>;
  editableFiles: Array<AliasedFile>;
  stopCommands: Array<Task>;
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
}

export interface P4EnvironmentResult {
  consoleEndpoints: Array<string>;
  p4fileEndpoints: Array<string>;
}

const DenyStartOfMissingInstanceErrorMessage =
  "Instance not found and explicitly told not to create a new instance.";

// refactor class name? Not only focussing P4 anymore?
export default class P4Environment {
  private activeConsoles: Map<string, Console>;
  private editableFiles: Map<string, string>;
  private configuration: EnvironmentDescription;
  private environmentId: string;
  private static activeEnvironments = new Map<string, P4Environment>();
  private environmentProvider: InstanceProvider;
  private persister: Persister;
  private username: string;
  private filehandler: FileHandler;
  private groupNumber: number;

  public static getActiveEnvironment(
    environmentId: string,
    username: string
  ): P4Environment {
    return P4Environment.activeEnvironments.get(`${username}-${environmentId}`);
  }

  public static getDeployedUserEnvironmentList(
    username: string
  ): Array<string> {
    const deployedEnvironmentsForUser: Array<string> = new Array<string>();
    P4Environment.activeEnvironments.forEach(
      (value: P4Environment, key: string) => {
        if (value.username === username)
          deployedEnvironmentsForUser.push(key.split("-").slice(1).join("-"));
      }
    );
    return deployedEnvironmentsForUser;
  }

  public static getDeployedGroupEnvironmentList(
    groupNumber: number
  ): Array<string> {
    const deployedEnvironmentsForGroup: Array<string> = new Array<string>();
    P4Environment.activeEnvironments.forEach(
      async (value: P4Environment, key: string) => {
        if (value.groupNumber == groupNumber) {
          deployedEnvironmentsForGroup.push(key.split("-").slice(1).join("-"));
        }
      }
    );
    return deployedEnvironmentsForGroup;
  }

  private constructor(
    username: string,
    groupNumber: number,
    environmentId: string,
    configuration: EnvironmentDescription,
    environmentProvider: InstanceProvider,
    persister: Persister
  ) {
    this.activeConsoles = new Map();
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

  static async createEnvironment(
    username: string,
    groupNumber: number,
    environmentId: string,
    env: EnvironmentDescription,
    provider: InstanceProvider,
    persister: Persister
  ): Promise<P4Environment> {
    return new Promise<P4Environment>(async (resolve, reject) => {
      const environment = new P4Environment(
        username,
        groupNumber,
        environmentId,
        env,
        provider,
        persister
      );
      console.log(
        "Creating new environment: " + environmentId + " for user: " + username
      );
      const activeEnvironmentsForGroup = Array<P4Environment>();
      P4Environment.activeEnvironments.forEach((environment: P4Environment) => {
        if (environment.groupNumber === groupNumber) {
          if (environment.environmentId !== environmentId) {
            throw Error(
              "Your group already deployed another environment. Please reload assignment list."
            );
          } else {
            activeEnvironmentsForGroup.push(environment);
          }
        }
      });
      if (activeEnvironmentsForGroup.length === 0) {
        environment
          .start(env, true)
          .then(() => {
            P4Environment.activeEnvironments.set(
              `${username}-${environmentId}`,
              environment
            );
            return resolve(environment);
          })
          .catch((err) => {
            P4Environment.activeEnvironments.delete(
              `${username}-${environmentId}`
            );
            return reject(new Error("Start of environment failed." + err));
          });
      } else {
        // the group already runs an environment add this user to it
        // and reuse instance
        let groupEnvironmentInstance;
        const userEnvironmentsOfOtherGroupUser =
          await persister.GetUserEnvironments(
            activeEnvironmentsForGroup[0].username
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
          groupEnvironmentInstance
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
            groupEnvironmentInstance
        );
        environment
          .start(env, false)
          .then(() => {
            P4Environment.activeEnvironments.set(
              `${username}-${environmentId}`,
              environment
            );
            return resolve(environment);
          })
          .catch((err) => {
            P4Environment.activeEnvironments.delete(
              `${username}-${environmentId}`
            );
            return reject(
              new Error("Failed to join environment of your group." + err)
            );
          });
      }
    });
  }

  static async deleteEnvironment(
    username: string,
    environmentId: string
  ): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      const environment = this.getActiveEnvironment(environmentId, username);
      environment
        .stop()
        .then(() => {
          P4Environment.activeEnvironments.delete(
            `${username}-${environmentId}`
          );
          return resolve(true);
        })
        .catch((err) => {
          if (err === DenyStartOfMissingInstanceErrorMessage) {
            console.log(
              "Environment was already stopped. Silently deleting leftovers in user session."
            );
            P4Environment.activeEnvironments.delete(
              `${username}-${environmentId}`
            );
            return resolve(true);
          } else {
            console.log("Failed to stop environment. " + JSON.stringify(err));
            return reject(false);
          }
        });
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
        this.username
      );
      console.log("Current user environments: " + JSON.stringify(environments));
      const filtered = environments.filter(
        (env) => env.environment === this.environmentId
      );
      if (filtered.length === 1) {
        console.log(
          "Environment " +
            this.environmentId +
            " already deployed for user " +
            this.username +
            ", trying to reopen it..."
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
                filtered[0].environment
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
              this.configuration.providerDockerSupplementalPorts
            )
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
              filtered
          )
        );
      }
    });
  }

  async start(
    desc: EnvironmentDescription = this.configuration,
    createIfMissing: boolean
  ): Promise<void> {
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
      endpoint.instance
    );
    console.log(
      "Added new environment: " +
        this.environmentId +
        "for user: " +
        this.username +
        " using endpoint: " +
        JSON.stringify(endpoint)
    );
    return new Promise((resolve, reject) => {
      try {
        this.filehandler = new FileHandler(
          endpoint.IPAddress,
          endpoint.SSHPort
        );
      } catch (err) {
        return reject(err);
      }
      desc.editableFiles.forEach((val) =>
        this.addEditableFile(val.alias, val.absFilePath)
      );
      let errorConsoleCounter = 0;
      let resolvedOrRejected = false;
      let readyConsoleCounter = 0;
      desc.tasks.forEach((subtasks) => {
        subtasks.forEach((task) => {
          global.console.log(
            "Opening console: ",
            JSON.stringify(task),
            JSON.stringify(endpoint)
          );
          try {
            const console = new SSHConsole(
              this.environmentId,
              this.username,
              this.groupNumber,
              endpoint.IPAddress,
              endpoint.SSHPort,
              task.executable,
              task.params,
              task.cwd,
              task.provideTty
            );

            const setupCloseHandler = (): void => {
              errorConsoleCounter++;
              if (
                resolvedOrRejected === false &&
                errorConsoleCounter + readyConsoleCounter === desc.tasks.length
              ) {
                resolvedOrRejected = true;
                return reject(new Error("Unable to create environment"));
              } else {
                this.activeConsoles.delete(task.name);
                global.console.log("deleted console for task: " + task.name);
              }
            };

            console.on("close", setupCloseHandler);

            console.on("error", (err) => {
              return reject(err);
            });

            console.on("ready", () => {
              readyConsoleCounter++;
              this.activeConsoles.set(task.name, console);
              if (
                resolvedOrRejected === false &&
                readyConsoleCounter === desc.tasks.length
              ) {
                resolvedOrRejected = true;
                return resolve();
              }
            });
          } catch (err) {
            return reject(err);
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

        let isEnvironmentUsedByOtherUserInGroup = false;
        P4Environment.activeEnvironments.forEach((value: P4Environment) => {
          if (
            value.groupNumber === this.groupNumber &&
            value.username != this.username
          )
            isEnvironmentUsedByOtherUserInGroup = true;
        });
        if (!isEnvironmentUsedByOtherUserInGroup) {
          for (const command of this.configuration.stopCommands) {
            let stopCmdFinished = false;
            await new Promise<void>((stopCmdSuccess, stopCmdFail) => {
              global.console.log(
                "Executing stop command: ",
                JSON.stringify(command),
                JSON.stringify(endpoint)
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
                command.provideTty
              );
              console.on("finished", async (code: string, signal: string) => {
                global.console.log(
                  "OUTPUT: " +
                    console.stdout +
                    "(exit code: " +
                    code +
                    ", signal: " +
                    signal +
                    ")"
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
                    new Error("Error: Unable to remove UserEnvironment." + err)
                  );
                });
            })
            .catch((err) => {
              if (err.message === InstanceNotFoundErrorMessage) {
                // OpenStack instance already gone
                global.console.log(
                  "Error: Server Instance not found during deletion?"
                );
              } else {
                global.console.log(err);
                return reject(
                  new Error("Error: Unable to delete server." + err)
                );
              }
            });
        } else {
          console.log(
            "Other users in the same group still use this environment. Skipping executing of stop commands."
          );
          this.persister
            .RemoveUserEnvironment(this.username, this.environmentId)
            .then(() => {
              return resolve();
            })
            .catch((err) => {
              return reject(
                new Error("Error: Unable to remove UserEnvironment." + err)
              );
            });
          return resolve();
        }
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
        let resolved = false;
        await new Promise<void>((resolve, reject) => {
          global.console.log(
            "Executing stop command: ",
            JSON.stringify(command),
            JSON.stringify(endpoint)
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
            false
          );
          console.on("finished", (code: string, signal: string) => {
            global.console.log(
              "OUTPUT: " +
                console.stdout +
                "(exit code: " +
                code +
                ", signal: " +
                signal +
                ")"
            );
            resolved = true;
            console.emit("closed");
          });
          console.on("closed", () => {
            if (resolved === true) return resolve();
            else
              return reject(
                new Error("Unable to run stop command." + command.executable)
              );
          });
        });
      }
    } catch (err) {
      throw err;
    }

    console.log("Stop commands finished...");
    P4Environment.activeEnvironments.forEach((value: P4Environment) => {
      if (value.groupNumber === this.groupNumber) {
        console.log("Found group env " + value.environmentId + "...");
        const terminal = value.getConsoles();
        terminal.forEach((value: Console) => {
          console.log("Found active console in " + value.cwd + "...");
          // write command to console
          value.write("cd " + value.cwd + "\n");
          console.log(
            "Executing " + value.command + " " + value.args.join(" ") + "\n"
          );
          value.write(value.command + " " + value.args.join(" ") + "\n");
        });
      }
    });
  }

  async runSSHCommand(
    command: string,
    stdoutSuccessMatch?: string
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
          false
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
              ")"
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
    terminalStates: TerminalStateType[]
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
                  "No terminal states available. Please use the terminals to run the steps given in the assignment and check again."
                )
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
          "Cannot execute test. No steps defined in tasks for assignment."
        );
        return reject(
          new Error(
            "Cannot execute test. No steps defined in tasks for assignment."
          )
        );
      }
    });
  }

  async submit(
    stepIndex: string,
    terminalStates: TerminalStateType[]
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
          "binary"
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
      submittedFiles
    );
  }

  public static async getUserSubmissions(
    persister: Persister,
    username: string,
    groupNumber: number
  ): Promise<Submission[]> {
    const result = await persister.GetUserSubmissions(username, groupNumber);
    return result;
  }

  public async readFile(
    alias: string,
    alreadyResolved?: boolean
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
    alreadyResolved?: boolean
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

  async getProviderInstanceStatus(): Promise<string> {
    try {
      const endpoint = await this.makeSureInstanceExists();
      return endpoint.providerInstanceStatus;
    } catch (err) {
      throw err;
    }
  }
}
