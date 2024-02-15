import { EventEmitter } from "events";
import { IPty } from "node-pty";
import pty from "node-pty";

export interface Console {
  on(event: "ready" | "close", listener: () => void): this;
  on(event: "data", listener: (data: string) => void): this;
  write(data: string): void;
  close(): void;
}

export class SimpleConsole extends EventEmitter implements Console {
  private console: IPty;

  constructor(command: string, args: Array<string>, cwd: string) {
    super();

    this.console = pty.spawn(command, args, { cwd });
    this.console.onData((data) => {
      console.log(`${command}${args.join(" ")} stdout: ${data}`);
    });
    let ready = false;

    this.console.onData((data) => {
      if (!ready) {
        ready = true;
        this.emit("ready");
      }
      this.emit("data", data);
    });
    this.console.onExit((code) => {
      console.log(`child process exited with code ${code.exitCode}`);
      this.emit("close");
    });
  }

  write(data: string): void {
    //console.log(`${this.command}${this.args} writing: `, data);
    this.console.write(data);
  }

  close(): void {
    this.emit("close");
    this.console.kill("SIGINT");
  }
}
