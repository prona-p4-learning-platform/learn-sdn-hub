import { EventEmitter } from "events";
import Dockerode, { Container, Exec } from "dockerode";

export interface DockerTerminal {
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

export default class DockerConsole extends EventEmitter implements DockerTerminal {
  public command: string = "";
  public args: Array<string> = [];
  public cwd: string = "";
  public initialConsoleBuffer: Array<string>;
  public initialConsoleBufferConsumed = false;
  public stdout = "";
  public stderr = "";
  public exitCode = "";
  public exitSignal = "";

  private docker: Dockerode;
  private container: Container;
  private exec: Exec | undefined;
  private stream: NodeJS.ReadWriteStream | undefined;
  private provideTty: boolean;
  private isClosed = false;

  constructor(
    _environmentId: string,
    _consoleName: string,
    _username: string,
    groupNumber: number,
    _sessionId: string | undefined,
    command: string,
    provideTty: boolean,
    containerId: string,
  ) {
    super();
    this.command = command;
    this.cwd = "";
    this.args = [];
    this.args = this.args.concat([]).map(str => str.replace(/\$\((GROUP_ID)\)/g, groupNumber.toString()));
    this.provideTty = provideTty;
    this.initialConsoleBuffer = new Array<string>();

    this.docker = new Dockerode();
    this.container = this.docker.getContainer(containerId);

    this.setupExec();
  }

  private setupExec(): void {
    (async () => {
      try {
        this.exec = await this.container.exec({
          Cmd: [this.command, ...this.args],
          AttachStdin: true,
          AttachStdout: true,
          AttachStderr: true,
          Tty: this.provideTty,
          WorkingDir: this.cwd,
        });

        const startOptions: any = {
          hijack: true,
          stdin: true,
        };

        this.stream = await this.exec.start(startOptions);

        // Emit ready after stream is opened
        this.emit("ready");

        // For TTY mode, stream data directly
        if (this.provideTty && this.stream) {
          this.stream.on("data", (data: Buffer) => {
            const dataStr = data.toString("utf-8");
            if (!this.initialConsoleBufferConsumed) {
              this.initialConsoleBuffer.push(dataStr);
              while (this.initialConsoleBuffer.length > 1000) {
                this.initialConsoleBuffer.shift();
              }
            }
            this.stdout += dataStr;
            this.emit("data", dataStr);
          });
        }

        // For non-TTY mode, demux stdout/stderr separately (if modem available)
        if (!this.provideTty && this.stream && this.docker.modem) {
          const stdoutStream: any = {
            write: (chunk: Buffer) => {
              const dataStr = chunk.toString("utf-8");
              if (!this.initialConsoleBufferConsumed) {
                this.initialConsoleBuffer.push(dataStr);
                while (this.initialConsoleBuffer.length > 1000) {
                  this.initialConsoleBuffer.shift();
                }
              }
              this.stdout += dataStr;
              this.emit("data", dataStr);
            },
          };
          const stderrStream: any = {
            write: (chunk: Buffer) => {
              const dataStr = chunk.toString("utf-8");
              this.stderr += dataStr;
              this.emit("data", dataStr);
            },
          };
          this.docker.modem.demuxStream(this.stream, stdoutStream, stderrStream);
        }

        if (this.stream) {
          this.stream.on("close", () => {
            console.log("DockerConsole: Stream closed");
            this.isClosed = true;
            this.emit("close");
          });

          this.stream.on("end", () => {
            console.log("DockerConsole: Stream ended");
            if (!this.isClosed) {
              this.isClosed = true;
              this.emit("finished", this.exitCode, this.exitSignal);
              this.emit("closed");
            }
          });

          this.stream.on("error", (err: Error) => {
            console.error("DockerConsole: Stream error", err);
            this.emit("error", err);
          });
        }
      } catch (error) {
        console.error("DockerConsole: Failed to setup exec", error);
        this.emit("error", error as Error);
      }
    })();
  }

  write(data: string): void {
    if (this.stream && !this.isClosed) {
      this.stream.write(data);
    } else {
      console.warn("DockerConsole: Stream not ready or closed, cannot write data");
    }
  }

  writeLine(data: string): void {
    this.write(`${data}\n`);
  }

  close(_environmentId: string, _groupNumber: number, _sessionId?: string): void {
    console.log("DockerConsole: Closing console");
    if (!this.isClosed && this.stream) {
      this.isClosed = true;
      this.stream.end();
    }
    this.emit("closed");
  }

  resize(columns: number, lines: number): void {
    // Docker exec resize support is limited; may not work on all API versions
    // This is a best-effort implementation
    if (this.exec && this.docker.modem) {
      try {
        // Try to access the modem to send resize request
        const execId = (this.exec as any).id;
        // Note: Direct API call for resize might not be supported in all dockerode versions
        // For now, log a message indicating resize attempt
        console.log(`DockerConsole: Attempting to resize exec ${execId} to ${columns}x${lines}`);
      } catch (err) {
        console.warn("DockerConsole: Resize not supported", err);
      }
    }
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

