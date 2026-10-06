import ContainerLabProvider from "../../src/providers/ContainerlabProvider";
import ClabApiClient from "../../src/providers/ClabApiClient";
import { ClabApiError } from "../../src/providers/ClabApiClient";
import type { ClabContainerInfo } from "../../src/providers/ClabApiClient";
import { InstanceNotFoundErrorMessage } from "../../src/providers/Provider";
import { load } from "js-yaml";

// The provider starts a 5-minute prune scheduler in its constructor; mocking it
// keeps jest from being kept alive by the interval timer.
jest.mock("toad-scheduler", () => {
  class ToadScheduler {
    addSimpleIntervalJob(): void {}
  }
  class SimpleIntervalJob {}
  class AsyncTask {}
  return { ToadScheduler, SimpleIntervalJob, AsyncTask };
});

const topologyUrl = "https://host/labs/lab.clab.yml";
const fileUrl = "https://host/labs/server1/dnsmasq.conf";
const labName = "clab-lab-7-alice";

const topologyYaml = `name: original-name
topology:
  nodes:
    server1:
      kind: linux
      image: foo
      binds:
        - server1/dnsmasq.conf:/etc/dnsmasq.conf
`;

const dnsmasqConf = "interface=eth0\ndhcp-range=10.10.10.100,10.10.10.200\n";

type FetchArgs = [input: RequestInfo | URL, init?: RequestInit];

interface MockClient {
  // mirrors the real client's public apiUrl getter
  apiUrl: string;
  getLab: jest.Mock;
  listLabs: jest.Mock;
  getToken: jest.Mock;
  createWorkspaceDirectory: jest.Mock;
  putWorkspaceFile: jest.Mock;
  deployLabByPath: jest.Mock;
  deleteLab: jest.Mock;
  createNodeSshAccess: jest.Mock;
}

function textResponse(status: number, body: string): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body),
  } as unknown as Response;
}

function emptyOkResponse(): Response {
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve(""),
    json: () => Promise.resolve({}),
  } as unknown as Response;
}

function makeClient(): MockClient {
  return {
    apiUrl: "https://clab.example:8090/",
    getLab: jest.fn(),
    listLabs: jest.fn(),
    // constructor fire-and-forget initial auth awaits a promise
    getToken: jest.fn().mockResolvedValue("t0"),
    createWorkspaceDirectory: jest.fn(),
    putWorkspaceFile: jest.fn(),
    deployLabByPath: jest.fn(),
    deleteLab: jest.fn(),
    createNodeSshAccess: jest.fn(),
  };
}

function urlOf(input: RequestInfo | URL): string {
  return typeof input === "string"
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url;
}

// Install a fetch mock that serves the given [url-prefix, response] routes and
// answers anything else with a benign empty 200 (login / prune listing).
function installFetch(routes: Array<[string, Response]>): jest.SpyInstance {
  const fetchMock = jest.spyOn(global, "fetch");
  fetchMock.mockImplementation((input: RequestInfo | URL) => {
    const url = urlOf(input);
    for (const [prefix, response] of routes) {
      if (url.startsWith(prefix)) return Promise.resolve(response);
    }
    return Promise.resolve(emptyOkResponse());
  });
  return fetchMock;
}

function fetchedUrls(fetchMock: jest.SpyInstance): string[] {
  return (fetchMock.mock.calls as unknown as FetchArgs[]).map(([input]) =>
    urlOf(input),
  );
}

describe("ContainerLabProvider createServer/deleteServer/getServer", () => {
  let provider: ContainerLabProvider;
  let client: MockClient;

  beforeAll(() => {
    process.env.CLAB_USERNAME = "user";
    process.env.CLAB_PASSWORD = "pass";
    process.env.CLAB_APIURL = "https://clab.example:8090/";
    process.env.CLAB_MAX_INSTANCE_LIFETIME_MINUTES = "60";
  });

  afterAll(() => {
    delete process.env.CLAB_USERNAME;
    delete process.env.CLAB_PASSWORD;
    delete process.env.CLAB_APIURL;
    delete process.env.CLAB_MAX_INSTANCE_LIFETIME_MINUTES;
    delete process.env.CLAB_LAB_PREFIX;
    delete process.env.CLAB_API_TLS_INSECURE;
  });

  beforeEach(() => {
    delete process.env.CLAB_LAB_PREFIX;
    delete process.env.CLAB_API_TLS_INSECURE;
    // silence provider logging; must be installed before construction so the
    // fire-and-forget initial getToken failure is also swallowed
    jest.spyOn(console, "log").mockImplementation(() => {});
    // default benign response (constructor login attempt, prune listing)
    jest.spyOn(global, "fetch").mockResolvedValue(emptyOkResponse());
    client = makeClient();
    provider = new ContainerLabProvider(
      client as unknown as ClabApiClient,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("derives unique lab name per group/user", async () => {
    installFetch([[topologyUrl, textResponse(200, topologyYaml)]]);
    client.createWorkspaceDirectory.mockResolvedValue(undefined);
    client.putWorkspaceFile.mockResolvedValue(undefined);
    client.deployLabByPath.mockResolvedValue(undefined);
    client.getLab.mockResolvedValue([
      {
        name: "server1",
        state: "running",
        status: "Up 5 seconds",
        ipv4_address: "10.10.10.2/24",
      },
    ] as ClabContainerInfo[]);

    const endpoint = await provider.createServer("alice", 7, "clab-lab", {
      clabTopology: topologyUrl,
    });

    expect(client.createWorkspaceDirectory).toHaveBeenCalledWith(labName);
    const putCalls = client.putWorkspaceFile.mock.calls as unknown as Array<
      [string, string]
    >;
    expect(putCalls.length).toBeGreaterThan(0);
    for (const [path] of putCalls) {
      expect(path.startsWith(`${labName}/`)).toBe(true);
    }
    expect(endpoint.instance).toBe(labName);
  });

  test("stages topology and referenced files then deploys by path", async () => {
    const fetchMock = installFetch([
      [topologyUrl, textResponse(200, topologyYaml)],
      [fileUrl, textResponse(200, dnsmasqConf)],
    ]);
    client.createWorkspaceDirectory.mockResolvedValue(undefined);
    client.putWorkspaceFile.mockResolvedValue(undefined);
    client.deployLabByPath.mockResolvedValue(undefined);
    client.getLab.mockResolvedValue([
      {
        name: "server1",
        state: "running",
        status: "Up 5 seconds",
        ipv4_address: "10.10.10.2/24",
      },
    ] as ClabContainerInfo[]);

    await provider.createServer("alice", 7, "clab-lab", {
      clabTopology: topologyUrl,
    });

    // topology and referenced file fetched from their URLs
    const urls = fetchedUrls(fetchMock);
    expect(urls).toContain(topologyUrl);
    expect(urls).toContain(fileUrl);

    // workspace PUTs carry the lab-name base directory
    const putCalls = client.putWorkspaceFile.mock.calls as unknown as Array<
      [string, string]
    >;
    expect(putCalls).toContainEqual([
      `${labName}/${labName}.clab.yml`,
      expect.any(String),
    ]);
    expect(putCalls).toContainEqual([
      `${labName}/server1/dnsmasq.conf`,
      dnsmasqConf,
    ]);

    // staged topology is the renamed one
    const topologyPut = putCalls.find(
      (call) => call[0] === `${labName}/${labName}.clab.yml`,
    );
    expect(topologyPut).toBeDefined();
    expect(load(topologyPut![1])).toMatchObject({ name: labName });

    // order: createWorkspaceDirectory -> both putWorkspaceFile -> deployLabByPath
    const putOrder = client.putWorkspaceFile.mock.invocationCallOrder;
    const wsOrder = client.createWorkspaceDirectory.mock.invocationCallOrder[0];
    const deployOrder = client.deployLabByPath.mock.invocationCallOrder[0];
    expect(wsOrder).toBeLessThan(Math.min(...putOrder));
    expect(Math.max(...putOrder)).toBeLessThan(deployOrder);

    expect(client.deployLabByPath).toHaveBeenCalledWith(
      labName,
      `${labName}/${labName}.clab.yml`,
    );
  });

  test("creates parent directories for nested bind sources", async () => {
    installFetch([
      [topologyUrl, textResponse(200, topologyYaml)],
      [fileUrl, textResponse(200, dnsmasqConf)],
    ]);
    client.createWorkspaceDirectory.mockResolvedValue(undefined);
    client.putWorkspaceFile.mockResolvedValue(undefined);
    client.deployLabByPath.mockResolvedValue(undefined);
    client.getLab.mockResolvedValue([
      {
        name: "server1",
        state: "running",
        status: "Up 5 seconds",
        ipv4_address: "10.10.10.2/24",
      },
    ] as ClabContainerInfo[]);

    await provider.createServer("alice", 7, "clab-lab", {
      clabTopology: topologyUrl,
    });

    const dirCalls = client.createWorkspaceDirectory.mock.calls as Array<
      [string]
    >;
    const dirPaths = dirCalls.map((call) => call[0]);
    expect(dirPaths).toEqual(
      expect.arrayContaining([labName, `${labName}/server1`]),
    );

    // the nested parent directory must exist before the nested file is written
    const dirOrder = client.createWorkspaceDirectory.mock.invocationCallOrder;
    const putCalls = client.putWorkspaceFile.mock.calls as Array<[string]>;
    const putOrder = client.putWorkspaceFile.mock.invocationCallOrder;
    const nestedDirOrder =
      dirOrder[dirCalls.findIndex((call) => call[0] === `${labName}/server1`)];
    const nestedPutOrder =
      putOrder[
        putCalls.findIndex(
          (call) => call[0] === `${labName}/server1/dnsmasq.conf`,
        )
      ];
    expect(nestedDirOrder).toBeLessThan(nestedPutOrder);
    // and the lab directory before every file write
    expect(dirOrder[dirCalls.findIndex((call) => call[0] === labName)]).toBeLessThan(
      Math.min(...putOrder),
    );
  });

  test("injects jumphost into staged topology", async () => {
    installFetch([
      [topologyUrl, textResponse(200, topologyYaml)],
      [fileUrl, textResponse(200, dnsmasqConf)],
    ]);
    client.createWorkspaceDirectory.mockResolvedValue(undefined);
    client.putWorkspaceFile.mockResolvedValue(undefined);
    client.deployLabByPath.mockResolvedValue(undefined);
    client.getLab.mockResolvedValue([
      {
        name: "server1",
        state: "running",
        status: "Up 5 seconds",
        ipv4_address: "10.10.10.2/24",
      },
    ] as ClabContainerInfo[]);

    await provider.createServer("alice", 7, "clab-lab", {
      clabTopology: topologyUrl,
    });

    const putCalls = client.putWorkspaceFile.mock.calls as unknown as Array<
      [string, string]
    >;
    const topologyPut = putCalls.find(
      (call) => call[0] === `${labName}/${labName}.clab.yml`,
    );
    expect(topologyPut).toBeDefined();
    const staged = load(topologyPut![1]) as {
      topology?: {
        nodes?: Record<string, { image?: string; exec?: string[] }>;
      };
    };
    // collision-safe name: user topologies commonly define their own "jumphost"
    expect(staged.topology?.nodes?.["learn-sdn-hub-jumphost"]).toMatchObject({
      image: "alpine:latest",
    });
  });

  test("injected jumphost exec chain daemonizes sshd without interface assumptions", async () => {
    installFetch([
      [topologyUrl, textResponse(200, topologyYaml)],
      [fileUrl, textResponse(200, dnsmasqConf)],
    ]);
    client.createWorkspaceDirectory.mockResolvedValue(undefined);
    client.putWorkspaceFile.mockResolvedValue(undefined);
    client.deployLabByPath.mockResolvedValue(undefined);
    client.getLab.mockResolvedValue([
      {
        name: "server1",
        state: "running",
        status: "Up 5 seconds",
        ipv4_address: "10.10.10.2/24",
      },
    ] as ClabContainerInfo[]);

    await provider.createServer("alice", 7, "clab-lab", {
      clabTopology: topologyUrl,
    });

    const putCalls = client.putWorkspaceFile.mock.calls as unknown as Array<
      [string, string]
    >;
    const topologyPut = putCalls.find(
      (call) => call[0] === `${labName}/${labName}.clab.yml`,
    );
    expect(topologyPut).toBeDefined();
    const staged = load(topologyPut![1]) as {
      topology?: {
        nodes?: Record<string, { exec?: string[] }>;
      };
    };
    const exec = staged.topology?.nodes?.["learn-sdn-hub-jumphost"]?.exec ?? [];
    // first exec failure stops the chain: no interface-dependent commands
    for (const command of exec) {
      expect(command.startsWith("ip addr")).toBe(false);
    }
    // sshd must be started directly (no openrc dependency)
    expect(exec).toContain("/usr/sbin/sshd");
  });

  test("rejects with the missing file URL and cleans up", async () => {
    installFetch([
      [topologyUrl, textResponse(200, topologyYaml)],
      [fileUrl, textResponse(404, "not found")],
    ]);
    client.deleteLab.mockResolvedValue(undefined);

    await expect(
      provider.createServer("alice", 7, "clab-lab", {
        clabTopology: topologyUrl,
      }),
    ).rejects.toThrow(fileUrl);

    expect(client.deleteLab).toHaveBeenCalledWith(labName);
    expect(client.deployLabByPath).not.toHaveBeenCalled();
  });

  test("deletes the lab on failed deploy", async () => {
    installFetch([[topologyUrl, textResponse(200, topologyYaml)]]);
    client.createWorkspaceDirectory.mockResolvedValue(undefined);
    client.putWorkspaceFile.mockResolvedValue(undefined);
    client.deployLabByPath.mockRejectedValue(new Error("deploy failed"));
    client.deleteLab.mockResolvedValue(undefined);

    await expect(
      provider.createServer("alice", 7, "clab-lab", {
        clabTopology: topologyUrl,
      }),
    ).rejects.toThrow("deploy failed");

    expect(client.deleteLab).toHaveBeenCalledWith(labName);
  });

  test("deleteServer calls deleteLab", async () => {
    client.deleteLab.mockResolvedValue(undefined);
    await provider.deleteServer(labName);
    expect(client.deleteLab).toHaveBeenCalledWith(labName);
  });

  test("deleteServer maps a 404 to instance-not-found", async () => {
    client.deleteLab.mockRejectedValue(
      new ClabApiError(
        "ClabApiClient request to /api/v1/labs/clab-lab-7-alice failed with status 404",
        404,
      ),
    );

    await expect(provider.deleteServer(labName)).rejects.toThrow(
      InstanceNotFoundErrorMessage,
    );
  });

  test("deleteServer passes other client errors through", async () => {
    client.deleteLab.mockRejectedValue(
      new ClabApiError(
        "ClabApiClient request to /api/v1/labs/clab-lab-7-alice failed with status 502",
        502,
      ),
    );

    await expect(provider.deleteServer(labName)).rejects.toThrow("502");
  });

  test("prune lists labs via client and deletes only stale ones", async () => {
    client.listLabs.mockResolvedValue({
      "clab-lab-1-bob": [
        {
          name: "n1",
          state: "running",
          status: "Up 61 minutes",
          ipv4_address: "10.10.10.2/24",
        },
      ],
      "clab-lab-2-carol": [
        {
          name: "n2",
          state: "running",
          status: "Up 5 minutes",
          ipv4_address: "10.10.10.3/24",
        },
      ],
    });
    client.deleteLab.mockResolvedValue(undefined);

    await provider.pruneServerInstance();

    expect(client.listLabs).toHaveBeenCalledTimes(1);
    // maxInstanceLifetimeMinutes is 60: only the 61-minute-old lab is pruned
    expect(client.deleteLab).toHaveBeenCalledTimes(1);
    expect(client.deleteLab).toHaveBeenCalledWith("clab-lab-1-bob");
  });

  test("getServer returns jumphost IPAddress", async () => {
    client.getLab.mockResolvedValue([
      {
        name: "server1",
        state: "running",
        status: "Up 5 seconds",
        ipv4_address: "10.10.10.2/24",
      },
      {
        name: `clab-${labName}-jumphost`,
        state: "running",
        status: "Up 5 seconds",
        ipv4_address: "10.10.10.5/24",
      },
    ] as ClabContainerInfo[]);
    client.createNodeSshAccess.mockResolvedValue({
      host: "192.168.78.53",
      port: 2225,
      username: "p4",
    });

    const endpoint = await provider.getServer(labName);

    // transport goes through the clab-api-server node SSH proxy
    expect(client.createNodeSshAccess).toHaveBeenCalledWith(
      labName,
      `clab-${labName}-jumphost`,
    );
    expect(endpoint.IPAddress).toBe("192.168.78.53");
    expect(endpoint.SSHPort).toBe(2225);
    expect(endpoint.instance).toBe(labName);
    // managementAddresses still maps node names for DockerConsole resolution
    expect(endpoint.managementAddresses).toEqual({
      server1: "10.10.10.2:22",
      "clab-clab-lab-7-alice-jumphost": "10.10.10.5:22",
    });
  });

  test("substitutes non-dialable ssh proxy host with the API host", async () => {
    client.getLab.mockResolvedValue([
      {
        name: "server1",
        state: "running",
        status: "Up 5 seconds",
        ipv4_address: "10.10.10.2/24",
      },
      {
        name: `clab-${labName}-jumphost`,
        state: "running",
        status: "Up 5 seconds",
        ipv4_address: "10.10.10.5/24",
      },
    ] as ClabContainerInfo[]);
    client.createNodeSshAccess.mockResolvedValue({
      host: "0.0.0.0",
      port: 2224,
      username: "p4",
    });
    client.apiUrl = "https://192.168.78.53:8090/";
    const logMock = jest.spyOn(console, "log");

    const endpoint = await provider.getServer(labName);

    expect(endpoint.IPAddress).toBe("192.168.78.53");
    expect(endpoint.SSHPort).toBe(2224);
    // the substitution is logged with both addresses
    const logged = (logMock.mock.calls as unknown as string[][])
      .map((call) => call.join(" "))
      .join("\n");
    expect(logged).toContain("0.0.0.0");
    expect(logged).toContain("192.168.78.53");
  });

  test("passes routable ssh proxy host through unchanged", async () => {
    client.getLab.mockResolvedValue([
      {
        name: "server1",
        state: "running",
        status: "Up 5 seconds",
        ipv4_address: "10.10.10.2/24",
      },
      {
        name: `clab-${labName}-jumphost`,
        state: "running",
        status: "Up 5 seconds",
        ipv4_address: "10.10.10.5/24",
      },
    ] as ClabContainerInfo[]);
    client.createNodeSshAccess.mockResolvedValue({
      host: "192.168.78.99",
      port: 2225,
      username: "p4",
    });

    const endpoint = await provider.getServer(labName);

    expect(endpoint.IPAddress).toBe("192.168.78.99");
    expect(endpoint.SSHPort).toBe(2225);
  });

  test("getServer falls back to jumphost mgmt IP when ssh access fails", async () => {
    client.getLab.mockResolvedValue([
      {
        name: "server1",
        state: "running",
        status: "Up 5 seconds",
        ipv4_address: "10.10.10.2/24",
      },
      {
        name: `clab-${labName}-jumphost`,
        state: "running",
        status: "Up 5 seconds",
        ipv4_address: "10.10.10.5/24",
      },
    ] as ClabContainerInfo[]);
    client.createNodeSshAccess.mockRejectedValue(new Error("proxy down"));
    const warnMock = jest.spyOn(console, "warn").mockImplementation(() => {});

    const endpoint = await provider.getServer(labName);

    // fallback: jumphost container management IP, default SSH port
    expect(endpoint.IPAddress).toBe("10.10.10.5");
    expect(endpoint.SSHPort).toBe(22);
    expect(warnMock).toHaveBeenCalledWith(
      expect.stringContaining("clab-clab-lab-7-alice-jumphost"),
    );
  });

  test("getServer maps a 404 status to instance-not-found", async () => {
    client.getLab.mockRejectedValue(
      new ClabApiError(
        "ClabApiClient request to /api/v1/labs/clab-lab-7-alice failed with status 404",
        404,
      ),
    );

    await expect(provider.getServer(labName)).rejects.toThrow(
      InstanceNotFoundErrorMessage,
    );
  });

  test("getServer maps other client errors to a generic failure", async () => {
    client.getLab.mockRejectedValue(
      new ClabApiError(
        "ClabApiClient request to /api/v1/labs/clab-lab-7-alice failed with status 500",
        500,
      ),
    );

    await expect(provider.getServer(labName)).rejects.toThrow(
      "Failed to get server instance",
    );
  });

  test("getServer falls back to jumphost mgmt IP when the ssh access response is malformed", async () => {
    client.getLab.mockResolvedValue([
      {
        name: "server1",
        state: "running",
        status: "Up 5 seconds",
        ipv4_address: "10.10.10.2/24",
      },
      {
        name: `clab-${labName}-jumphost`,
        state: "running",
        status: "Up 5 seconds",
        ipv4_address: "10.10.10.5/24",
      },
    ] as ClabContainerInfo[]);
    client.createNodeSshAccess.mockResolvedValue({
      host: 42,
      port: "2225",
    });
    const warnMock = jest.spyOn(console, "warn").mockImplementation(() => {});

    const endpoint = await provider.getServer(labName);

    expect(endpoint.IPAddress).toBe("10.10.10.5");
    expect(endpoint.SSHPort).toBe(22);
    expect(warnMock).toHaveBeenCalledWith(
      expect.stringContaining("malformed SSH access response"),
    );
  });

  test("createServer tolerates a 404 on early polls", async () => {
    installFetch([[topologyUrl, textResponse(200, topologyYaml)]]);
    client.createWorkspaceDirectory.mockResolvedValue(undefined);
    client.putWorkspaceFile.mockResolvedValue(undefined);
    client.deployLabByPath.mockResolvedValue(undefined);
    client.getLab
      .mockRejectedValueOnce(
        new ClabApiError(
          "ClabApiClient request to /api/v1/labs/clab-lab-7-alice failed with status 404",
          404,
        ),
      )
      .mockResolvedValue([
        {
          name: "server1",
          state: "running",
          status: "Up 5 seconds",
          ipv4_address: "10.10.10.2/24",
        },
      ] as ClabContainerInfo[]);
    const sleepMock = jest
      .spyOn(provider, "sleep")
      .mockResolvedValue(undefined);

    const endpoint = await provider.createServer("alice", 7, "clab-lab", {
      clabTopology: topologyUrl,
    });

    // two polls (one tolerated 404 retry) + the final getServer lookup
    expect(client.getLab).toHaveBeenCalledTimes(3);
    expect(sleepMock).toHaveBeenCalledWith(2000);
    expect(endpoint.instance).toBe(labName);
  });

  test("createServer fails fast and cleans up when a container exits", async () => {
    installFetch([[topologyUrl, textResponse(200, topologyYaml)]]);
    client.createWorkspaceDirectory.mockResolvedValue(undefined);
    client.putWorkspaceFile.mockResolvedValue(undefined);
    client.deployLabByPath.mockResolvedValue(undefined);
    client.getLab.mockResolvedValue([
      {
        name: "server1",
        state: "exited",
        status: "Exited (1) 5 seconds ago",
        ipv4_address: "10.10.10.2/24",
      },
    ] as ClabContainerInfo[]);
    client.deleteLab.mockResolvedValue(undefined);
    const sleepMock = jest
      .spyOn(provider, "sleep")
      .mockResolvedValue(undefined);

    await expect(
      provider.createServer("alice", 7, "clab-lab", {
        clabTopology: topologyUrl,
      }),
    ).rejects.toThrow(/exited/);

    expect(client.deleteLab).toHaveBeenCalledWith(labName);
    // no retry loop: fail fast instead of polling to timeout
    expect(client.getLab).toHaveBeenCalledTimes(1);
    expect(sleepMock).not.toHaveBeenCalled();
  });
});
