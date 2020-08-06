import { EventEmitter } from "events";
import { Client } from "ssh2";
import fs from "fs";


export interface Console {
  on(event: "ready", listener: () => void): this;
  on(event: "data", listener: (data: string) => void): this;
  on(event: "close", listener: () => void): this;
  write(data: string): void;
  writeLine(data: string): void;
  close(): void;
}

export default class SSHConsole extends EventEmitter implements Console {
  private command: string;
  private console: Client;
  private cwd: string;
  private args: Array<string>;
  private stream: any;

  constructor(
    ipaddress: string,
    port: number,
    command: string,
    args: Array<string>,
    cwd: string
  ) {
    super();
    this.command = command;
    this.args = args;
    this.cwd = cwd;

    this.console = new Client();
    this.console.on("ready", () => {
      this.console.shell((err: any, stream: any) => {
        if (err) throw err;
        this.emit("ready");
        this.stream = stream;
        stream
          .on("close", () => {
            console.log("Stream :: close");
            this.console.end();
            this.emit("close");
          })
          .on("data", (data: any) => {
            //console.log("OUTPUT: " + data);
            this.emit("data", data);
          });
        stream.write("cd " + this.cwd + "\n");
        stream.write(this.command + " " + this.args.join(" ") + "\n");
      });
    });
    this.console.on("error", (err) => {
      console.log(err);
      this.console.end();
      this.emit("close");
    });
    console.log("Establishing SSH connection " + ipaddress + ":" + port);
    this.console
      .on("ready", function () {
        console.log("Client :: ready");
      })
      .connect({
        host: ipaddress,
        port,
        username: "ubuntu",
        privateKey: fs.readFileSync("/home/ubuntu/P4SSHKey"),
        readyTimeout: 60000,
      });
  }

  write(data: string): void {
    console.log(`${this.command}${this.args} writing: `, data);
    this.stream.write(data);
  }

  writeLine(data: string): void {
    console.log(`${this.command}${this.args}`, data);
    this.stream.write(`${data}\n`);
  }

  async close(): Promise<void> {
    this.emit("close");
  }
}
