import SSHConsole, { Console } from "./consoles/SSHConsole";
import FileHandler from "./filehandler/SSHFileHandler";
import { InstanceProvider, VMEndpoint } from "./providers/Provider";
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
}

export interface P4EnvironmentResult {
  consoleEndpoints: Array<string>;
  p4fileEndpoints: Array<string>;
}

export default class P4Environment {
  private activeConsoles: Map<string, Console>;
  private editableFiles: Map<string, string>;
  private configuration: EnvironmentDescription;
  private identifier: string;
  private static activeEnvironments = new Map<string, P4Environment>();
  private environmentProvider: InstanceProvider;
  private persister: Persister;
  private userId: string;
  private filehandler: FileHandler;

  public static getActiveEnvironment(
    identifier: string,
    userid: string
  ): P4Environment {
    return P4Environment.activeEnvironments.get(`${userid}-${identifier}`);
  }

  public static getActiveEnvironmentList(userid: string): Array<string> {
    const activeEnvironmentsForUser: Array<string> = new Array<string>();
    P4Environment.activeEnvironments.forEach(
      (value: P4Environment, key: string) => {
        if (value.userId === userid)
          activeEnvironmentsForUser.push(key.split("-").slice(1).join("-"));
      }
    );
    return activeEnvironmentsForUser;
  }

  private constructor(
    userId: string,
    identifier: string,
    configuration: EnvironmentDescription,
    environmentProvider: InstanceProvider,
    persister: Persister
  ) {
    this.activeConsoles = new Map();
    this.editableFiles = new Map();
    this.configuration = configuration;
    this.environmentProvider = environmentProvider;
    this.persister = persister;
    this.userId = userId;
    this.identifier = identifier;
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

  static async createEnvironment(
    userId: string,
    identifier: string,
    env: EnvironmentDescription,
    provider: InstanceProvider,
    persister: Persister
  ): Promise<P4Environment> {
    const environment = new P4Environment(
      userId,
      identifier,
      env,
      provider,
      persister
    );
    console.log(`${userId}-${identifier}`);
    await environment.start(env);
    P4Environment.activeEnvironments.set(
      `${userId}-${identifier}`,
      environment
    );
    return environment;
  }

  static async deleteEnvironment(
    userId: string,
    environmentId: string
  ): Promise<boolean> {
    const environment = this.getActiveEnvironment(environmentId, userId);
    environment.stop();
    P4Environment.activeEnvironments.delete(`${userId}-${environmentId}`);
    return true;
  }

  async getLanguageServerPort(): Promise<number> {
    const endpoint = await this.makeSureInstanceExists();
    return endpoint.LanguageServerPort;
  }

  async getIPAddress(): Promise<string> {
    const endpoint = await this.makeSureInstanceExists();
    return endpoint.IPAddress;
  }

  async makeSureInstanceExists(): Promise<VMEndpoint> {
    const environments = await this.persister.GetUserEnvironments(this.userId);
    console.log(environments);
    const filtered = environments.filter(
      (env) => env.identifier === this.identifier
    );
    if (filtered.length > 0) {
      try {
        const endpoint = await this.environmentProvider.getServer(
          filtered[0].identifier
        );
        return endpoint;
      } catch (err) {
        if (err.message === "openstack Error (404): Item not found") {
          await this.persister.RemoveUserEnvironment(
            this.userId,
            filtered[0].identifier
          );
          return this.environmentProvider.createServer(
            `${this.userId}-${this.identifier}`
          );
        }
        throw err;
      }
    } else {
      return this.environmentProvider.createServer(
        `${this.userId}-${this.identifier}`
      );
    }
  }

  async start(
    desc: EnvironmentDescription = this.configuration
  ): Promise<void> {
    const endpoint = await this.makeSureInstanceExists();
    await this.persister.AddUserEnvironment(
      this.userId,
      endpoint.identifier,
      this.configuration.description
    );
    console.log(endpoint);
    this.filehandler = new FileHandler(endpoint.IPAddress, endpoint.SSHPort);
    desc.editableFiles.forEach((val) =>
      this.addEditableFile(val.alias, val.absFilePath)
    );
    return new Promise((resolve, reject) => {
      let errorConsoleCounter = 0;
      let resolvedOrRejected = false;
      let readyConsoleCounter = 0;
      desc.tasks.forEach((subtasks) => {
        subtasks.forEach((task) => {
          const console = new SSHConsole(
            this.identifier,
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
              reject(new Error("Unable to create environment"));
            } else {
              global.console.log("deleted the console");
              this.activeConsoles.delete(task.name);
            }
          };

          console.on("close", setupCloseHandler);

          console.on("ready", () => {
            readyConsoleCounter++;
            this.activeConsoles.set(task.name, console);
            if (
              resolvedOrRejected === false &&
              readyConsoleCounter === desc.tasks.length
            ) {
              resolvedOrRejected = true;
              resolve();
            }
          });
        });
      });
    });
  }

  async stop(): Promise<void> {
    let resolved = false;
    const endpoint = await this.makeSureInstanceExists();
    await this.persister.RemoveUserEnvironment(
      this.userId,
      endpoint.identifier
    );

    for (const console of this.activeConsoles) {
      console[1].close(this.identifier);
    }
    this.filehandler.close();

    return new Promise((resolve, reject) => {
      for (const command of this.configuration.stopCommands) {
        global.console.log(
          "Executing stop command: ",
          JSON.stringify(command),
          JSON.stringify(endpoint)
        );
        const console = new SSHConsole(
          this.identifier,
          endpoint.IPAddress,
          endpoint.SSHPort,
          command.executable,
          command.params,
          command.cwd,
          command.provideTty
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
        });
        console.on("closed", () => {
          if (resolved === true) resolve();
          else reject();
        });
      }
    });
  }

  async restart(): Promise<void> {
    console.log("STOPPING");
    await this.stop();
    console.log("STARTING");
    await this.start();
  }

  async runSSHCommand(
    command: string,
    stdoutSuccessMatch?: string
  ): Promise<string> {
    const endpoint = await this.makeSureInstanceExists();
    let resolved = false;

    return new Promise((resolve, reject) => {
      // run sshCommand
      const console = new SSHConsole(
        this.identifier,
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
        if (resolved === true) resolve(console.stdout);
        else reject();
      });
    });
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
              reject(
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
          resolve("All tests passed! " + testOutput);
        else reject(new Error("Some Tests failed! " + testOutput));
      } else {
        // no tests defined
        global.console.log(
          "Cannot execute test. No steps defined in tasks for assignment."
        );
        reject(
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
    const submittedFiles = new Map<string, string>();
    for (const [alias] of this.editableFiles.entries()) {
      await this.readFile(alias).then((fileContent: string) => {
        submittedFiles.set(alias, fileContent);
      });
    }

    // if submissionPrepareCommand is defined in config, run it and include its output
    if (this.configuration.submissionPrepareCommand) {
      let submissionPrepareResult = "";
      const cmdWithExpanededVars = this.configuration.submissionPrepareCommand
        .replace("$user", this.userId)
        .replace("$identifier", this.identifier);
      await this.runSSHCommand(cmdWithExpanededVars)
        .then((result) => {
          submissionPrepareResult = result;
        })
        .catch((error) => {
          submissionPrepareResult = error;
        });
      if (submissionPrepareResult) {
        submittedFiles.set(
          "sumissionPrepareResult-output.log",
          submissionPrepareResult
        );
      }
    }

    // if submissionSupplementalFiles are defined in config, include them in the submission
    if (this.configuration.submissionSupplementalFiles) {
      for (const supplementalFile of this.configuration
        .submissionSupplementalFiles) {
        const fileNameWithExpanededVars = supplementalFile
          .replace("$user", this.userId)
          .replace("$identifier", this.identifier);
        const fileContent = await this.filehandler.readFile(
          fileNameWithExpanededVars,
          "binary"
        );
        const flattenedFilePathName = fileNameWithExpanededVars
          .replace(/\//g, "_")
          .replace(/\\/g, "_");
        submittedFiles.set(flattenedFilePathName, fileContent);
      }
    }

    // if submissionCleanupCommand is defined in config, run it and include its output
    if (this.configuration.submissionCleanupCommand) {
      let submissionCleanupResult = "";
      const cmdWithExpanededVars = this.configuration.submissionCleanupCommand
        .replace("$user", this.userId)
        .replace("$identifier", this.identifier);
      await this.runSSHCommand(cmdWithExpanededVars)
        .then((result) => {
          submissionCleanupResult = result;
        })
        .catch((error) => {
          submissionCleanupResult = error;
        });
      if (submissionCleanupResult) {
        submittedFiles.set(
          "submissionCleanupResult-output.log",
          submissionCleanupResult
        );
      }
    }

    await this.persister.SubmitUserEnvironment(
      this.userId,
      this.identifier,
      terminalStates,
      submittedFiles
    );
  }

  public async getUserSubmissions(
    userId: string
  ): Promise<Map<string, string | Date>> {
    await this.persister.GetUserEnvironments(userId).then((result) => {
      return result;
    });
    throw new Error("Could not get user submissions.");
  }

  public async readFile(alias: string): Promise<string> {
    const resolvedPath = this.editableFiles.get(alias);
    if (resolvedPath === undefined) {
      throw new Error("Could not resolve alias.");
    }
    const content = await this.filehandler.readFile(resolvedPath);
    return content;
  }

  public async writeFile(alias: string, newContent: string): Promise<void> {
    const resolvedPath = this.editableFiles.get(alias);
    if (resolvedPath === undefined) {
      throw new Error("Could not resolve alias.");
    }
    await this.filehandler.writeFile(resolvedPath, newContent);
  }
}
