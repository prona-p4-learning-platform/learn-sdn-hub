import { EventEmitter } from "events";
import type WebSocket from "ws";
import type ClabApiClient from "../providers/ClabApiClient";
import type { Console } from "./SSHConsole";

export default class DockerConsole extends EventEmitter implements Console {
  public command: string;
  public args: Array<string>;
  public cwd: string;
  public initialConsoleBuffer: Array<string> = [];
  public initialConsoleBufferConsumed = false;

  private client: ClabApiClient;
  private labName: string;
  private containerName: string;
  private managementAddresses: Record<string, string>;
  private initialCols: number;
  private initialRows: number;
  private ws?: WebSocket;
  private closeEmitted = false;

  constructor(
    environmentId: string,
    consoleName: string,
    username: string,
    groupNumber: number,
    sessionId: string | undefined,
    client: ClabApiClient,
    labName: string,
    containerName: string,
    managementAddresses: Record<string, string>,
    initialCols: number,
    initialRows: number,
  ) {
    super();
    this.command = "";
    this.args = [];
    this.cwd = "";
    this.client = client;
    this.labName = labName;
    this.containerName = containerName;
    this.managementAddresses = managementAddresses;
    this.initialCols = initialCols;
    this.initialRows = initialRows;
    void environmentId;
    void consoleName;
    void username;
    void groupNumber;
    void sessionId;
    this.connect().catch((err: unknown) => {
      console.error(err);
      this.emit("error", err);
    });
  }

  private async connect(): Promise<void> {
    const fullContainerName = this.resolveFullContainerName();
    const { sessionId } = await this.client.createTerminalSession(
      this.labName,
      fullContainerName,
      this.initialCols,
      this.initialRows,
    );
    const ws = await this.client.connectTerminalStream(sessionId);
    this.ws = ws;
    ws.on("message", (data: WebSocket.RawData) => {
      const text =
        Array.isArray(data)
          ? Buffer.concat(data).toString()
          : data instanceof ArrayBuffer
            ? Buffer.from(new Uint8Array(data)).toString()
            : data.toString();
      this.handleMessage(text);
    });
    ws.on("close", () => {
      this.emitCloseOnce();
    });
    ws.on("error", (err: Error) => {
      console.error(err);
      this.emit("error", err);
    });
    ws.on("open", () => {
      this.emit("ready");
    });
  }

  private resolveFullContainerName(): string {
    if (this.containerName in this.managementAddresses) {
      return this.containerName;
    }
    const suffixMatches = Object.keys(this.managementAddresses).filter((key) =>
      key.endsWith(`-${this.containerName}`),
    );
    if (suffixMatches.length === 1) {
      return suffixMatches[0];
    }
    throw new Error(
      `No unique container matching "${this.containerName}" in managementAddresses`,
    );
  }

  private handleMessage(message: string): void {
    let frame: { type?: string; data?: string; encoding?: string; exitCode?: number; error?: string };
    try {
      frame = JSON.parse(message) as typeof frame;
    } catch {
      return;
    }
    switch (frame.type) {
      case "output":
        if (frame.data === undefined) {
          return;
        }
        if (frame.encoding === "base64") {
          const decoded = Buffer.from(frame.data, "base64").toString();
          if (this.initialConsoleBufferConsumed) {
            this.emit("data", decoded);
          } else {
            this.initialConsoleBuffer.push(decoded);
            while (this.initialConsoleBuffer.length > 1000) {
              this.initialConsoleBuffer.shift();
            }
          }
        } else if (this.initialConsoleBufferConsumed) {
          this.emit("data", frame.data);
        } else {
          this.initialConsoleBuffer.push(frame.data);
          while (this.initialConsoleBuffer.length > 1000) {
            this.initialConsoleBuffer.shift();
          }
        }
        break;
      case "exit":
        console.debug(
          `DockerConsole: terminal session exited (exitCode: ${frame.exitCode ?? "unknown"}, error: ${frame.error ?? "none"})`,
        );
        this.emitCloseOnce();
        break;
      default:
        break;
    }
  }

  private emitCloseOnce(): void {
    if (this.closeEmitted) {
      return;
    }
    this.closeEmitted = true;
    this.emit("close");
  }

  public write(data: string): void {
    this.ws?.send(JSON.stringify({ type: "input", data }));
  }

  public writeLine(data: string): void {
    this.write(`${data}\n`);
  }

  public resize(columns: number, lines: number): void {
    this.ws?.send(JSON.stringify({ type: "resize", cols: columns, rows: lines }));
  }

  public consumeInitialConsoleBuffer(): string {
    this.initialConsoleBufferConsumed = true;
    const buffered = this.initialConsoleBuffer.join("");
    this.initialConsoleBuffer = [];
    return buffered;
  }

  public close(): void {
    this.ws?.send(JSON.stringify({ type: "close" }));
    this.ws?.terminate();
    this.emitCloseOnce();
  }
}
