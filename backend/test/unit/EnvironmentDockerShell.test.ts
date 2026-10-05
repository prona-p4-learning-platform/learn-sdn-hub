import { EventEmitter } from "events";
import DockerConsole from "../../src/consoles/DockerConsole";
import type ClabApiClient from "../../src/providers/ClabApiClient";
import type { VMEndpoint } from "../../src/providers/Provider";
import type { TerminalType } from "../../src/Environment";
import {
  createConsoleForSubterminal,
  resetClabApiClient,
  getClabApiClient,
} from "../../src/Environment";

jest.mock("../../src/consoles/SSHConsole", () => {
  const MockSSHConsole = jest.fn(function (
    ...args: Array<unknown>
  ): unknown {
    const instance = new EventEmitter();
    Object.assign(instance, { constructorArgs: args });
    return instance;
  });
  return { __esModule: true as const, default: MockSSHConsole };
});

import SSHConsole from "../../src/consoles/SSHConsole";

const MockSSHConsole = SSHConsole as unknown as jest.Mock;

class MockClabApiClient {
  public createTerminalSessionCalls: Array<{
    labName: string;
    fullContainerName: string;
    cols: number;
    rows: number;
  }> = [];

  createTerminalSession(
    labName: string,
    fullContainerName: string,
    cols: number,
    rows: number,
  ): Promise<{ sessionId: string }> {
    this.createTerminalSessionCalls.push({
      labName,
      fullContainerName,
      cols,
      rows,
    });
    return Promise.resolve({ sessionId: "term-1" });
  }

  connectTerminalStream(): Promise<unknown> {
    const ws = new EventEmitter();
    // never opens: the test only observes the session request parameters
    return Promise.resolve(ws);
  }
}

function makeEndpoint(managementAddresses?: Record<string, string>): VMEndpoint {
  return {
    IPAddress: "10.0.0.1",
    SSHPort: 22,
    instance: "lab-1",
    managementAddresses,
  } as unknown as VMEndpoint;
}

describe("createConsoleForSubterminal", () => {
  beforeEach(() => {
    MockSSHConsole.mockClear();
    resetClabApiClient();
  });

  it("creates a DockerConsole wired with labName, containerName and 80x24", async () => {
    const client = new MockClabApiClient();
    const subterminal = { type: "DockerShell", name: "srl1", containerName: "srl1" } as const;

    const result = createConsoleForSubterminal(
      subterminal,
      makeEndpoint({ "clab-lab-1-srl1": "10.0.0.5:22" }),
      client as unknown as ClabApiClient,
      "env-1",
      "user",
      1,
      undefined,
      "lab-1",
    );

    expect(result).toBeInstanceOf(DockerConsole);
    await Promise.resolve();
    await Promise.resolve();
    expect(client.createTerminalSessionCalls).toEqual([
      {
        labName: "lab-1",
        fullContainerName: "clab-lab-1-srl1",
        cols: 80,
        rows: 24,
      },
    ]);
  });

  it("still creates an SSHConsole for a Shell subterminal", () => {
    const subterminal = {
      type: "Shell",
      name: "shell",
      executable: "/bin/bash",
      cwd: "/",
      params: ["-l"],
      provideTty: true,
    } satisfies TerminalType;

    const result = createConsoleForSubterminal(
      subterminal,
      makeEndpoint(),
      new MockClabApiClient() as unknown as ClabApiClient,
      "env-1",
      "user",
      1,
      undefined,
      "lab-1",
    );

    expect(result).toBeDefined();
    expect(MockSSHConsole).toHaveBeenCalledTimes(1);
    const args = MockSSHConsole.mock.calls[0] as unknown as Array<unknown>;
    expect(args[0]).toBe("env-1");
    expect(args[5]).toBe("10.0.0.1");
    expect(args[6]).toBe(22);
    expect(args[7]).toBe("/bin/bash");
  });

  it("throws on unsupported subterminal types", () => {
    const subterminal = { type: "WebApp", name: "app", url: "http://x" } as const;
    expect(() =>
      createConsoleForSubterminal(
        subterminal,
        makeEndpoint(),
        new MockClabApiClient() as unknown as ClabApiClient,
        "env-1",
        "user",
        1,
        undefined,
        "lab-1",
      ),
    ).toThrow(/WebApp/);
  });
});

describe("getClabApiClient", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    resetClabApiClient();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it("builds a ClabApiClient from CLAB_* env vars and caches the instance", () => {
    process.env.CLAB_APIURL = "https://clab.example/";
    process.env.CLAB_USERNAME = "admin";
    process.env.CLAB_PASSWORD = "secret";
    process.env.CLAB_API_TLS_INSECURE = "true";
    process.env.CLAB_TOKEN_DURATION_IN_MINUTES = "30";

    const first = getClabApiClient();
    const second = getClabApiClient();
    expect(second).toBe(first);
    // casts to inspect the private fields set from env
    expect((first as unknown as { baseUrl: string }).baseUrl).toBe(
      "https://clab.example",
    );
    expect(
      (first as unknown as { tokenDurationMs: number }).tokenDurationMs,
    ).toBe(30 * 60 * 1000);
    expect((first as unknown as { tlsInsecure: boolean }).tlsInsecure).toBe(
      true,
    );
  });

  it("throws when CLAB_APIURL is missing", () => {
    delete process.env.CLAB_APIURL;
    process.env.CLAB_USERNAME = "admin";
    process.env.CLAB_PASSWORD = "secret";
    expect(() => getClabApiClient()).toThrow(/CLAB_APIURL/);
  });
});
