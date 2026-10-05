import ClabApiClient from "../../src/providers/ClabApiClient";
import type { ClabContainerInfo } from "../../src/providers/ClabApiClient";

interface FetchInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

type FetchArgs = [url: string, init: FetchInit];

interface RecordedWsCall {
  url: string;
  options: { headers?: Record<string, string>; rejectUnauthorized?: boolean };
}

const mockWsCalls: RecordedWsCall[] = [];

jest.mock("ws", () => {
  class MockWebSocket {
    constructor(url: string, options: RecordedWsCall["options"]) {
      mockWsCalls.push({ url, options });
    }
  }
  return MockWebSocket;
});

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

function loginResponse(token: string): Response {
  return jsonResponse(200, { token });
}

function loginCalls(calls: FetchArgs[]): FetchArgs[] {
  return calls.filter(
    ([url, init]) => url.endsWith("/login") && init.method === "POST",
  );
}

describe("ClabApiClient", () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    mockWsCalls.length = 0;
    fetchMock = jest.fn();
    jest.spyOn(global, "fetch").mockImplementation(fetchMock);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function makeClient(apiUrl = "https://clab.example:8090/"): ClabApiClient {
    return new ClabApiClient({
      apiUrl,
      username: "user1",
      password: "secret1",
      tlsInsecure: true,
    });
  }

  test("logs in and caches the token", async () => {
    const client = makeClient("https://clab.example:8090///");
    fetchMock.mockResolvedValueOnce(loginResponse("t1"));

    const token = await client.getToken();

    expect(token).toBe("t1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calls = fetchMock.mock.calls as unknown as FetchArgs[];
    const [url, init] = calls[0];
    expect(url).toBe("https://clab.example:8090/login");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body ?? "{}")).toEqual({
      username: "user1",
      password: "secret1",
    });

    await client.getToken();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("re-authenticates after expiry", async () => {
    const client = makeClient();
    fetchMock.mockResolvedValueOnce(loginResponse("t1"));
    await client.getToken();

    const tokenState = client as unknown as { tokenExpiresAt: number };
    tokenState.tokenExpiresAt = Date.now() - 1;

    fetchMock.mockResolvedValueOnce(loginResponse("t2"));
    expect(await client.getToken()).toBe("t2");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("attaches bearer token and retries once on 401", async () => {
    const client = makeClient();
    fetchMock
      .mockResolvedValueOnce(loginResponse("t1"))
      .mockResolvedValueOnce(jsonResponse(401, { error: "unauthorized" }))
      .mockResolvedValueOnce(loginResponse("t2"))
      .mockResolvedValueOnce(
        jsonResponse(
          200,
          [{ name: "n1", lab_name: "lab1" }] satisfies ClabContainerInfo[],
        ),
      );

    const lab = await client.getLab("lab1");

    expect(lab).toEqual([{ name: "n1", lab_name: "lab1" }]);
    const calls = fetchMock.mock.calls as unknown as FetchArgs[];
    expect(calls).toHaveLength(4);
    expect(loginCalls(calls)).toHaveLength(2);
    expect(calls[1][1].headers?.Authorization).toBe("Bearer t1");
    expect(calls[3][0]).toBe("https://clab.example:8090/api/v1/labs/lab1");
    expect(calls[3][1].headers?.Authorization).toBe("Bearer t2");
  });

  test("rejects after two consecutive 401s", async () => {
    const client = makeClient();
    fetchMock.mockResolvedValueOnce(loginResponse("t1"));
    await client.getToken();
    fetchMock.mockResolvedValue(jsonResponse(401, { error: "unauthorized" }));

    await expect(client.getLab("lab1")).rejects.toThrow(/401/);
    const calls = fetchMock.mock.calls as unknown as FetchArgs[];
    expect(calls).toHaveLength(3);
    // initial login + the re-authentication attempt that also got a 401
    expect(loginCalls(calls)).toHaveLength(2);
    expect(calls[1][0]).toBe("https://clab.example:8090/api/v1/labs/lab1");
  });

  test("connectTerminalStream passes bearer header and tlsInsecure", async () => {
    const client = makeClient();
    fetchMock.mockResolvedValueOnce(loginResponse("t"));

    const socket = await client.connectTerminalStream("sess-1");

    expect(socket).toBeDefined();
    expect(mockWsCalls).toHaveLength(1);
    expect(mockWsCalls[0].url).toBe(
      "wss://clab.example:8090/api/v1/terminal-sessions/sess-1/stream",
    );
    expect(mockWsCalls[0].options.headers).toEqual({
      Authorization: "Bearer t",
    });
    expect(mockWsCalls[0].options.rejectUnauthorized).toBe(false);
  });

  test("createTerminalSession posts protocol shell with cols/rows", async () => {
    const client = makeClient();
    fetchMock
      .mockResolvedValueOnce(loginResponse("t1"))
      .mockResolvedValueOnce(
        jsonResponse(200, { sessionId: "s-9", protocol: "shell" }),
      );

    const info = await client.createTerminalSession(
      "lab1",
      "clab-lab1-node1",
      120,
      40,
    );

    expect(info.sessionId).toBe("s-9");
    const calls = fetchMock.mock.calls as unknown as FetchArgs[];
    expect(calls).toHaveLength(2);
    const [url, init] = calls[1];
    expect(url).toBe(
      "https://clab.example:8090/api/v1/labs/lab1/nodes/clab-lab1-node1/terminal-sessions",
    );
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body ?? "{}")).toEqual({
      protocol: "shell",
      cols: 120,
      rows: 40,
    });
    expect(init.headers?.Authorization).toBe("Bearer t1");
  });
});
