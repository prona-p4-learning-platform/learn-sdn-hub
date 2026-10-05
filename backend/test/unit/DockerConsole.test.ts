import { EventEmitter } from "events";
import DockerConsole from "../../src/consoles/DockerConsole";
import type ClabApiClient from "../../src/providers/ClabApiClient";

class FakeWebSocket extends EventEmitter {
  public sent: Array<string> = [];
  public terminated = false;

  send(data: string): void {
    this.sent.push(data);
  }

  terminate(): void {
    this.terminated = true;
  }
}

class MockClabApiClient {
  public createdSessions: Array<{
    labName: string;
    fullContainerName: string;
    cols: number;
    rows: number;
  }> = [];
  public fakeWs = new FakeWebSocket();

  createTerminalSession(
    labName: string,
    fullContainerName: string,
    cols: number,
    rows: number,
  ): Promise<{ sessionId: string }> {
    this.createdSessions.push({ labName, fullContainerName, cols, rows });
    return Promise.resolve({ sessionId: "sess-1" });
  }

  connectTerminalStream(): Promise<FakeWebSocket> {
    setImmediate(() => this.fakeWs.emit("open"));
    return Promise.resolve(this.fakeWs);
  }
}

function createConsole(
  mock: MockClabApiClient,
  containerName: string,
): DockerConsole {
  const managementAddresses = {
    "clab-lab-srl1": "10.0.0.5:22",
    "clab-lab-host1": "10.0.0.6:22",
  };
  return new DockerConsole(
    "env-1",
    "console-1",
    "user",
    1,
    undefined,
    mock as unknown as ClabApiClient,
    "lab",
    containerName,
    managementAddresses,
    80,
    24,
  );
}

describe("DockerConsole", () => {
  it("creates a shell terminal session and emits ready", async () => {
    const mock = new MockClabApiClient();
    const { promise, resolve } = Promise.withResolvers<void>();
    const console = createConsole(mock, "srl1");
    console.once("ready", resolve);
    await promise;

    expect(mock.createdSessions).toEqual([
      { labName: "lab", fullContainerName: "clab-lab-srl1", cols: 80, rows: 24 },
    ]);
  });

  it("buffers pre-attach output", async () => {
    const mock = new MockClabApiClient();
    const { promise, resolve } = Promise.withResolvers<void>();
    const console = createConsole(mock, "srl1");
    console.once("ready", resolve);
    await promise;
    mock.fakeWs.emit(
      "message",
      Buffer.from(
        JSON.stringify({
          type: "output",
          data: Buffer.from("motd").toString("base64"),
          encoding: "base64",
        }),
      ),
    );

    const dataEvents: Array<string> = [];
    console.on("data", (data: string) => dataEvents.push(data));
    expect(console.consumeInitialConsoleBuffer()).toBe("motd");

    mock.fakeWs.emit(
      "message",
      Buffer.from(
        JSON.stringify({
          type: "output",
          data: Buffer.from("hello").toString("base64"),
          encoding: "base64",
        }),
      ),
    );
    expect(dataEvents).toEqual(["hello"]);
    expect(console.consumeInitialConsoleBuffer()).toBe("");
  });

  it("passes through raw output frames without blind base64 decoding", async () => {
    const mock = new MockClabApiClient();
    const { promise, resolve } = Promise.withResolvers<void>();
    const console = createConsole(mock, "srl1");
    console.once("ready", resolve);
    await promise;

    const dataEvents: Array<string> = [];
    console.on("data", (data: string) => dataEvents.push(data));
    console.consumeInitialConsoleBuffer();
    mock.fakeWs.emit(
      "message",
      Buffer.from(JSON.stringify({ type: "output", data: "raw-motd" })),
    );
    expect(dataEvents).toEqual(["raw-motd"]);
  });

  it("write and resize send correct JSON frames", async () => {
    const mock = new MockClabApiClient();
    const { promise, resolve } = Promise.withResolvers<void>();
    const console = createConsole(mock, "srl1");
    console.once("ready", resolve);
    await promise;

    console.write("ls\r");
    console.resize(120, 40);

    expect(JSON.parse(mock.fakeWs.sent[0])).toEqual({ type: "input", data: "ls\r" });
    expect(JSON.parse(mock.fakeWs.sent[1])).toEqual({ type: "resize", cols: 120, rows: 40 });
  });

  it("emits close on server exit and abrupt WS close, exactly once each", async () => {
    const mock1 = new MockClabApiClient();
    const { promise: ready1, resolve: readyResolve1 } = Promise.withResolvers<void>();
    const console1 = createConsole(mock1, "srl1");
    console1.once("ready", readyResolve1);
    await ready1;
    let closeCount1 = 0;
    console1.on("close", () => {
      closeCount1 += 1;
    });
    mock1.fakeWs.emit("message", Buffer.from(JSON.stringify({ type: "exit" })));
    await new Promise(setImmediate);
    expect(closeCount1).toBe(1);

    const mock2 = new MockClabApiClient();
    const { promise: ready2, resolve: readyResolve2 } = Promise.withResolvers<void>();
    const console2 = createConsole(mock2, "srl1");
    console2.once("ready", readyResolve2);
    await ready2;
    let closeCount2 = 0;
    console2.on("close", () => {
      closeCount2 += 1;
    });
    mock2.fakeWs.emit("close");
    await new Promise(setImmediate);
    expect(closeCount2).toBe(1);
  });

  it("resolves container name by exact key or suffix", async () => {
    const mockExact = new MockClabApiClient();
    const { promise: readyExact, resolve: readyResolveExact } = Promise.withResolvers<void>();
    const consoleExact = createConsole(mockExact, "srl1");
    consoleExact.once("ready", readyResolveExact);
    await readyExact;
    expect(mockExact.createdSessions[0].fullContainerName).toBe("clab-lab-srl1");

    const mockSuffix = new MockClabApiClient();
    const { promise: readySuffix, resolve: readyResolveSuffix } = Promise.withResolvers<void>();
    const consoleSuffix = createConsole(mockSuffix, "host1");
    consoleSuffix.once("ready", readyResolveSuffix);
    await readySuffix;
    expect(mockSuffix.createdSessions[0].fullContainerName).toBe("clab-lab-host1");
  });

  it("emits error when no matching container", async () => {
    const mock = new MockClabApiClient();
    const { promise: errored, resolve: errorResolve } = Promise.withResolvers<unknown>();
    const console = createConsole(mock, "nope");
    console.once("error", errorResolve);
    const error = await errored;
    expect(mock.createdSessions).toEqual([]);
    expect(error).toBeDefined();
  });
});
