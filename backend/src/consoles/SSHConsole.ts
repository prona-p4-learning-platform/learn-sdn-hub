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
  close(environmentId: string, username: string, groupNumber: number): void;
  resize(columns: number, lines: number): void;
  consumeInitialConsoleBuffer(): string;
  command: string;
  args: Array<string>;
  cwd: string;
}

type CustomizedSSHClient = Client & {
  ready: boolean;
  environmentId: string;
  username: string;
  groupNumber: number;
};

export default class SSHConsole extends EventEmitter implements Console {
  public command: string;
  public args: Array<string>;
  public cwd: string;
  private provideTty: boolean;
  private stream: ClientChannel;
  public initialConsoleBuffer: Array<string>;
  public initialConsoleBufferConsumed = false;
  private static sshConnections: Map<string, CustomizedSSHClient> = new Map();
  public stdout = "";
  public stderr = "";
  public exitCode = "";
  public exitSignal = "";

  constructor(
    environmentId: string,
    username: string,
    groupNumber: number,
    ipaddress: string,
    port: number,
    command: string,
    args: Array<string>,
    cwd: string,
    provideTty: boolean,
  ) {
    super();
    this.command = command;
    this.args = args;
    this.cwd = cwd;
    this.provideTty = provideTty;
    this.initialConsoleBuffer = new Array<string>();
    let sshConsole: CustomizedSSHClient;
    // sharing connections in the same group would be possible and multiple users can then use the same xterm.js together,
    // however refresh/different console sizes (which is inevitable due to different browser window sizes) etc. will lead to console corruption
    const consoleIdentifier = `${ipaddress}:${port}:${environmentId}:${username}:${groupNumber}`;
    const sshConnection = SSHConsole.sshConnections.get(consoleIdentifier);

    if (provideTty && sshConnection) {
      sshConsole = sshConnection;

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
      sshConsole.username = username;
      sshConsole.groupNumber = groupNumber;
      if (this.provideTty) {
        SSHConsole.sshConnections.set(consoleIdentifier, sshConsole);
      }
      sshConsole.on("ready", () => {
        sshConsole.ready = true;
        this.setupShellStream(sshConsole);
      });
      sshConsole.on("error", (err) => {
        console.log(err);
        this.emit("error", err);
      });
      sshConsole.on("close", () => {
        console.log("SSH connection closed.");
        sshConsole.end();
        this.emit("closed");
        if (this.provideTty) {
          SSHConsole.sshConnections.delete(consoleIdentifier);
        }
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
            if (!this.initialConsoleBufferConsumed) {
              this.initialConsoleBuffer.push(data);
              while (this.initialConsoleBuffer.length > 1000) {
                this.initialConsoleBuffer.shift();
              }
            }
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
                "Stream :: close :: code: " + code + ", signal: " + signal,
              );
              sshConsole.emit("finished", code, signal);
              sshConsole.end();
            })
            .on("data", function (data: string) {
              //console.log("STDOUT: " + data);
              sshConsole.emit("stdout", data);
            })
            .stderr.on("data", function (data: string) {
              //console.log("STDERR: " + data);
              sshConsole.emit("stderr", data);
            });
        },
      );
    }
  }

  write(data: string): void {
    //console.log(`${this.command}${this.args} writing: `, data);
    this.stream.write(data);
  }

  writeLine(data: string): void {
    //console.log(`${this.command}${this.args}`, data);
    this.stream.write(`${data}\n`);
  }

  async close(
    environmentId: string,
    username: string,
    groupNumber: number,
  ): Promise<void> {
    console.log("SSH console close");
    SSHConsole.sshConnections.forEach((value, key, map) => {
      if (
        value.environmentId === environmentId &&
        value.username === username &&
        value.groupNumber === groupNumber
      ) {
        value.emit("close");
        map.delete(key);
      }
    });
    this.stream.end();
  }

  resize(columns: number, lines: number): void {
    this.stream.setWindow(lines, columns, 0, 0);
  }

  consumeInitialConsoleBuffer(): string {
    if (this.initialConsoleBufferConsumed) {
      return "";
    } else {
      const initialConsoleBufferContent = this.initialConsoleBuffer.join("");
      this.initialConsoleBuffer = [];
      this.initialConsoleBufferConsumed = true;
      return initialConsoleBufferContent;
    }
  }
}
