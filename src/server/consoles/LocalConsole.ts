import { EventEmitter } from "events";
import { IPty } from "node-pty";
const pty = require("node-pty");

export interface Console {
  on(event: "ready", listener: () => void): this;
  on(event: "data", listener: (data: string) => void): this;
  on(event: "close", listener: () => void): this;
  write(data: string): void;
  close(): void;
}

export class SimpleConsole extends EventEmitter implements Console {
  private console: IPty;
  private command: string;
  private args: Array<string>;
  
  constructor(command: string, args: Array<string>, cwd: string) {
    super();
    this.command = command;
    this.args = args;
    this.console = pty.spawn(command, args, { cwd });
    this.console.on("data", (data) => {
      console.log(`${command}${args} stdout: ${data}`);
    });
    let ready = false;

    this.console.on("data", (data: string) => {
      if (ready === false) {
        ready = true;
        this.emit("ready");
      }
      this.emit("data", data);
    });
    this.console.on("exit", (code) => {
      console.log(`child process exited with code ${code}`);
      this.emit("close");
    });
  }

  write(data: string): void {
    console.log(`${this.command}${this.args} writing: `, data);
    this.console.write(data);
  }

  async close(): Promise<void> {
    this.emit("close");
    this.console.kill("SIGINT");
  }
}
