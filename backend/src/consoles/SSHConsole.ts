import { EventEmitter } from "events";
import { Client, ClientChannel } from "ssh2";
import fs from "fs";

export interface Console {
  on(
    event: "ready" | "close" | "closed" | "finished",
    listener: () => void,
  ): this;
  on(event: "data", listener: (data: string) => void): this;
  off(
    event: "ready" | "close" | "closed" | "finished",
    listener: () => void,
  ): this;
  off(event: "data", listener: (data: string) => void): this;
  write(data: string): void;
  writeLine(data: string): void;
  close(environmentId: string, groupNumber: number, sessionId?: string): void;
  resize(columns: number, lines: number): void;
  consumeInitialConsoleBuffer(): string;
  command: string;
  args: Array<string>;
  cwd: string;
}

export interface JumpHost {
  ipaddress: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
}

type CustomizedSSHClient = Client & {
  on(
    event: "stdout" | "stderr",
    listener: (data: string) => void,
  ): CustomizedSSHClient;
  on(
    event: "finished",
    listener: (code: string, signal: string) => void,
  ): CustomizedSSHClient;
  ready: boolean;
  environmentId: string;
  username: string;
  groupNumber: number;
  sessionId: string;
  parentJumpHostClient?: Client;
};

export default class SSHConsole extends EventEmitter implements Console {
  public command: string;
  public args: Array<string>;
  public cwd: string;
  private provideTty: boolean;
  private stream?: ClientChannel;
  public initialConsoleBuffer: Array<string>;
  public initialConsoleBufferConsumed = false;
  private static sshConnections: Map<string, CustomizedSSHClient> = new Map();
  public stdout = "";
  public stderr = "";
  public exitCode = "";
  public exitSignal = "";

  // maybe check .emit() calls and close() handlers and remove possibly redundant ones,
  // several of them were added to ensure proper cleanup of ssh connections, otherwise leaking connections could occur

  constructor(
    environmentId: string,
    consoleName: string,
    username: string,
    groupNumber: number,
    sessionId: string | undefined,
    ipaddress: string,
    port: number,
    command: string,
    args: Array<string>,
    cwd: string,
    provideTty: boolean,
    jumpHost?: JumpHost,
  ) {
    super();
    this.command = command;
    //SAL
    this.args = args.map(str => str.replace(/\$\((GROUP_ID)\)/g, groupNumber.toString()));
    // this.args = args;
    this.cwd = cwd;
    this.provideTty = provideTty;
    this.initialConsoleBuffer = new Array<string>();
    let sshConsole: CustomizedSSHClient;
    // sharing connections in the same group would be possible and multiple users can then use the same xterm.js together,
    // however refresh/different console sizes (which is inevitable due to different browser window sizes) etc. will lead to console corruption
    const consoleIdentifier = `${ipaddress}:${port}:${environmentId}:${consoleName}:${username}:${groupNumber}:${sessionId}`;
    const sshConnection = SSHConsole.sshConnections.get(consoleIdentifier);

    if (sshConnection && sshConnection.ready) {
      sshConsole = sshConnection;

      //console.debug("Reusing existing SSH connection " + consoleIdentifier);
      this.setupShellStream(sshConsole);
    } else {
      //console.debug("Creating new SSH connection " + consoleIdentifier);
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
        console.error(err);
        this.emit("error", err);
        if (this.provideTty) {
          SSHConsole.sshConnections.delete(consoleIdentifier);
        }
      });
      sshConsole.on("close", () => {
        console.log("SSHConsole: CLOSE on.close line 122");
        //console.debug("SSH connection closed.");
        sshConsole.ready = false;
        this.stream?.end();
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
      if (jumpHost !== undefined) {
        // console.debug(
        //   "Establishing SSH connection " +
        //     ipaddress +
        //     ":" +
        //     port +
        //     " via jump host " +
        //     jumpHost.ipaddress +
        //     ":" +
        //     jumpHost.port,
        // );
        const sshJumpHostConnection = new Client();
        sshJumpHostConnection
          .on("ready", () => {
            //console.debug("SSH jumphost connection ready, forwarding connection");
            sshJumpHostConnection.forwardOut(
              "127.0.0.1",
              0,
              ipaddress,
              port,
              (err, stream) => {
                if (err) {
                  console.error(
                    "Unable to forward connection on jump host: " + err.message,
                  );
                  sshConsole.end();
                  sshJumpHostConnection.end();
                  //this.emit("error", err);
                } else {
                  sshConsole
                    .on("ready", () => {
                      sshConsole.parentJumpHostClient = sshJumpHostConnection;
                      // console.debug(
                      //   "SSH Client connection via jump host :: ready",
                      // );
                    })
                    .on("close", () => {
                      console.log("SSHConsole: CLOSE on.close line 178");
                      // console.debug(
                      //   "SSH Client connection via jump host :: close",
                      // );
                      stream.end();
                      sshConsole.end();
                      sshJumpHostConnection.end();
                      this.emit("close");
                    })
                    .on("error", (err) => {
                      //console.debug("SSH Client connection via jump host :: error");
                      console.error(err);
                      stream.end();
                      sshConsole.end();
                      sshJumpHostConnection.end();
                      this.emit("error", err);
                    })
                    .connect({
                      sock: stream,
                      username: process.env.SSH_USERNAME,
                      password: process.env.SSH_PASSWORD,
                      privateKey: process.env.SSH_PRIVATE_KEY_PATH
                        ? fs.readFileSync(process.env.SSH_PRIVATE_KEY_PATH)
                        : undefined,
                      readyTimeout: 1000,
                      timeout: 1000,
                    });
                }
              },
            );
          })
          .on("close", () => {
            //console.debug("SSH jumphost connection close");
            console.log("SSHConsole: CLOSE on.close line 211");
            this.stream?.end();
            sshConsole.end();
            sshJumpHostConnection.end();
          })
          .on("error", (err) => {
            //console.debug("SSH jumphost connection error");
            console.error(err);
            this.stream?.end();
            sshConsole.end();
            sshJumpHostConnection.end();
            this.emit("error", err);
          })
          .connect({
            host: jumpHost.ipaddress,
            port: jumpHost.port,
            username: jumpHost.username,
            password: jumpHost.password,
            privateKey: jumpHost.privateKey
              ? fs.readFileSync(jumpHost.privateKey)
              : undefined,
            //debug: (debug) => {
            //  console.debug(debug)
            //},
            readyTimeout: 1000,
            timeout: 1000,
          });
      } else {
        //console.debug("Establishing SSH connection " + ipaddress + ":" + port);
        sshConsole
          .on("ready", function () {
            //console.debug("SSH Client :: ready");
          })
          .on("close", () => {
            console.log("SSHConsole: CLOSE on.close line 245");
            //console.debug("SSH Client :: close");
            this.stream?.end();
            sshConsole.end();
            this.emit("close");
          })
          .on("error", (err) => {
            console.error("SSH console error: ", err);
          })
          .connect({
            host: ipaddress,
            port,
            username: process.env.SSH_USERNAME,
            password: process.env.SSH_PASSWORD,
            privateKey: process.env.SSH_PRIVATE_KEY_PATH
              ? fs.readFileSync(process.env.SSH_PRIVATE_KEY_PATH)
              : undefined,
            readyTimeout: 1000,
            timeout: 1000,
          });
      }
    }
  }

  private setupShellStream(sshConsole: CustomizedSSHClient) {
    if (this.provideTty) {
      sshConsole.shell((err, stream) => {
        //console.debug("setting up shell");
        if (err) throw err;
        this.emit("ready");
        this.stream = stream;
        stream
          .on("close", () => {
            console.log("SSHConsole: CLOSE on.close line 278");
            //console.debug("SSH Stream :: close")
            stream.end();
            this.emit("close");
          })
          .on("error", (err: Error) => {
            stream.end();
            console.error("SSH shell error: ", err);
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
              console.log("SSHConsole: CLOSE on.close line 307");
              //console.debug(
              //  "Stream :: close :: code: " + code + ", signal: " + signal,
              //);
              sshConsole.emit("finished", code, signal);
              sshConsole.ready = false;
              stream.end();
              sshConsole.end();
            })
            .on("data", function (data: string) {
              //console.debug("STDOUT: " + data);
              sshConsole.emit("stdout", data);
            })
            .stderr.on("data", function (data: string) {
              //console.debug("STDERR: " + data);
              sshConsole.emit("stderr", data);
            });
        },
      );
    }
  }

  write(data: string): void {
    //console.debug(`${this.command}${this.args} writing: `, data);
    this.stream?.write(data);
  }

  writeLine(data: string): void {
    //console.debug(`${this.command}${this.args}`, data);
    this.stream?.write(`${data}\n`);
  }

  close(environmentId: string, groupNumber: number): void {
    console.log("SSHConsole: CLOSE on.close line 340");
    //console.debug("SSH console close");
    SSHConsole.sshConnections.forEach((value, key, map) => {
      // if the connection is in the same group and environment, close it
      if (
        value.environmentId === environmentId &&
        value.groupNumber === groupNumber
      ) {
        value.emit("close");
        value.end();
        value.parentJumpHostClient?.end();
        map.delete(key);
      }
    });
  }

  resize(columns: number, lines: number): void {
    this.stream?.setWindow(lines, columns, 0, 0);
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
