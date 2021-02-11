import { exec } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";
import SSHConsole, { Console } from "./consoles/SSHConsole";
import FileHandler from "./filehandler/SSHFileHandler";
import { InstanceProvider, VMEndpoint } from "./providers/Provider";
import { Persister } from "./database/Persister";
import extractCompilationResult, {
  CompilationError,
} from "./CompilationResultExtractor";
import environments from "./Configuration";
import user from "./routes/user";

interface AliasedFile {
  absFilePath: string;
  alias: string;
}

interface CompilationResult {
  errors: Array<CompilationError>;
}

interface Task {
  executable: string;
  cwd: string;
  params: Array<string>;
  provideTty: boolean;
  name: string;
}

export interface EnvironmentDescription {
  tasks: Array<Task>;
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
  private static activeEnvironments = new Map<string, P4Environment>();
  private environmentProvider: InstanceProvider;
  private persister: Persister;
  private userId: string;
  private filehandler: FileHandler;

  public static getActiveEnvironment(
    alias: string,
    userid: string
  ): P4Environment {
    return P4Environment.activeEnvironments.get(`${userid}-${alias}`);
  }

  public static getActiveEnvironmentList(
    userid: string
  ): Array<string> {
    let activeEnvironmentsForUser: Array<string> = new Array<string>();
    P4Environment.activeEnvironments.forEach((value: P4Environment, key: string) => {
      if (value.userId === userid) {
        activeEnvironmentsForUser.push(key.split("-").slice(1).join("-"))
      }
    });
    return activeEnvironmentsForUser;
  }

  private constructor(
    userId: string,
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
  }

  private addEditableFile(alias: string, path: string): void {
    this.editableFiles.set(alias, path);
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
    const environment = new P4Environment(userId, env, provider, persister);
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
    identifier: string,
  ): Promise<boolean> {
    const environment = this.getActiveEnvironment(identifier, userId)
    environment.stop();
    P4Environment.activeEnvironments.delete(
      `${userId}-${identifier}`
    );
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
      (env) => env.description === this.configuration.description
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
            `${this.userId}-${this.configuration.description}`
          );
        }
        throw err;
      }
    } else {
      return this.environmentProvider.createServer(
        `${this.userId}-${this.configuration.description}`
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
      desc.tasks.forEach((task) => {
        const console = new SSHConsole(
          endpoint.IPAddress,
          endpoint.SSHPort,
          task.executable,
          task.params,
          task.cwd
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
  }

  async stop(): Promise<void> {
    for (const console of this.activeConsoles) {
      console[1].close();
    }
    const endpoint = await this.makeSureInstanceExists();
    for (const command of this.configuration.stopCommands) {
      const console = new SSHConsole(
        endpoint.IPAddress,
        endpoint.SSHPort,
        command.executable,
        command.params,
        command.cwd
      );
      global.console.log(
        "Executing stop command: ",
        JSON.stringify(command),
        JSON.stringify(endpoint)
      );
      const cc = new Promise((resolve) => {
        console.on("close", () => resolve(undefined));
      });
      await cc;
      console.close()
    }
    this.filehandler.close()
    await this.persister.RemoveUserEnvironment(
      this.userId,
      endpoint.identifier
    );
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
