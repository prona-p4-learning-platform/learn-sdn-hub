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
  tests: Array<AssignmentStepTest>;
}

type AssignmentStepTestType = "sshCommand" | "terminalBufferSearch";

interface AssignmentStepTest {
  testType: AssignmentStepTestType;
  testItem: string;
  match: string;
  successMessage: string;
  errorHint: string;
}

export interface EnvironmentDescription {
  tasks: Array<Array<Task>>;
  steps?: Array<AssignmentStep>;
  description: string;
  editableFiles: Array<AliasedFile>;
  stopCommands: Array<Task>;
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
