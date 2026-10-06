import ContainerLabProvider from "../../src/providers/ContainerlabProvider";
import ClabApiClient from "../../src/providers/ClabApiClient";
import type { ClabContainerInfo } from "../../src/providers/ClabApiClient";
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
  getLab: jest.Mock;
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
    getLab: jest.fn(),
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
      topology?: { nodes?: Record<string, { image?: string }> };
    };
    expect(staged.topology?.nodes?.jumphost).toMatchObject({
      image: "alpine:latest",
    });
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
});
