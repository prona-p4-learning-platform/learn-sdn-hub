import { EventEmitter } from "events";
import { Client, ClientChannel } from "ssh2";
import fs from "fs";

export interface Console {
  on(event: "ready", listener: () => void): this;
  on(event: "data", listener: (data: string) => void): this;
  on(event: "close", listener: () => void): this;
  on(event: "closed", listener: () => void): this;
  on(event: "stdout", listener: () => void): this;
  on(event: "stderr", listener: () => void): this;
  on(event: "finished", listener: () => void): this;
  write(data: string): void;
  writeLine(data: string): void;
  close(environmentId: string): void;
}

type CustomizedSSHClient = Client & {
  ready: boolean;
  environmentId: string;
};

export default class SSHConsole extends EventEmitter implements Console {
  private command: string;
  private cwd: string;
  private provideTty: boolean;
  private args: Array<string>;
  private stream: ClientChannel;
  private static sshConnections: Map<string, CustomizedSSHClient> = new Map();
  public stdout = "";
  public stderr = "";
  public exitCode = "";
  public exitSignal = "";

  constructor(
    environmentId: string,
    ipaddress: string,
    port: number,
    command: string,
    args: Array<string>,
    cwd: string,
    provideTty: boolean
  ) {
    super();
    this.command = command;
    this.args = args;
    this.cwd = cwd;
    this.provideTty = provideTty;
    let sshConsole: CustomizedSSHClient;
    const consoleIdentifier = `${ipaddress}:${port}:${environmentId}`;
    if (SSHConsole.sshConnections.has(consoleIdentifier)) {
      sshConsole = SSHConsole.sshConnections.get(consoleIdentifier);
      if (sshConsole.ready === false) {
        sshConsole.on("ready", () => {
          sshConsole.ready = true;
          this.setupShellStream(sshConsole);
        });
      } else {
        this.setupShellStream(sshConsole);
      }
    } else {
      sshConsole = new Client() as CustomizedSSHClient;
      sshConsole.ready = false;
      sshConsole.environmentId = environmentId;
      SSHConsole.sshConnections.set(consoleIdentifier, sshConsole);
      sshConsole.on("ready", () => {
        sshConsole.ready = true;
        this.setupShellStream(sshConsole);
      });
      sshConsole.on("error", (err) => {
        console.log(err);
      });
      sshConsole.on("close", () => {
        console.log("SSH connection closed.");
        sshConsole.end();
        this.emit("closed");
        SSHConsole.sshConnections.delete(consoleIdentifier);
      });
      sshConsole.on("stdout", (data: string) => {
        this.stdout += data;
      });
      sshConsole.on("stderr", (data: string) => {
        this.stdout += data;
      });
      sshConsole.on("finished", (code: string, signal: string) => {
        this.emit("finished", code, signal);
      });
      console.log("Establishing SSH connection " + ipaddress + ":" + port);
      sshConsole
        .on("ready", function () {
          console.log("SSH Client :: ready");
        })
        .on("error", (err) => {
          console.log("SSH console error: ", err);
        })
        .connect({
          host: ipaddress,
          port,
          username: process.env.SSH_USERNAME,
          password: process.env.SSH_PASSWORD,
          privateKey: process.env.SSH_PRIVATE_KEY_PATH
            ? fs.readFileSync(process.env.SSH_PRIVATE_KEY_PATH)
            : undefined,
          readyTimeout: 10000,
        });
    }
  }

  private setupShellStream(sshConsole: CustomizedSSHClient) {
    if (this.provideTty) {
      sshConsole.shell((err, stream) => {
        console.log("setting up shell");
        if (err) throw err;
        this.emit("ready");
        this.stream = stream;
        stream
          .on("close", () => {
            console.log("SSH Stream :: close");
            stream.end();
            this.emit("close");
          })
          .on("error", (err: Error) => {
            console.log("SSH shell error: ", err);
          })
          .on("data", (data: string) => {
            this.emit("data", data);
          });
        // write command to console
        stream.write("cd " + this.cwd + "\n");
        stream.write(this.command + " " + this.args.join(" ") + "\n");
      });
    } else {
      sshConsole.exec(
        "cd " + this.cwd + " && " + this.command + " " + this.args.join(" "),
        function (err, stream) {
          if (err) throw err;
          stream
            .on("close", function (code: string, signal: string) {
              console.log(
                "Stream :: close :: code: " + code + ", signal: " + signal
              );
              sshConsole.emit("finished", code, signal);
              stream.end();
              sshConsole.end();
            })
            .on("data", function (data: string) {
              sshConsole.emit("stdout", data);
            })
            .stderr.on("data", function (data: string) {
              sshConsole.emit("stderr", data);
            });
        }
      );
    }
  }

  write(data: string): void {
    console.log(`${this.command}${this.args} writing: `, data);
    this.stream.write(data);
  }

  writeLine(data: string): void {
    console.log(`${this.command}${this.args}`, data);
    this.stream.write(`${data}\n`);
  }

  async close(environmentId: string): Promise<void> {
    console.log("SSH console close");
    SSHConsole.sshConnections.forEach((value, key, map) => {
      if (value.environmentId === environmentId) {
        value.emit("close");
        map.delete(key);
      }
    });
    this.stream.end();
  }
}
