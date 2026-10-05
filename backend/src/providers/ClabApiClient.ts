import WebSocket from "ws";

export interface ClabApiClientOptions {
  apiUrl: string;
  username: string;
  password: string;
  tlsInsecure?: boolean;
  tokenDurationMs?: number;
}

export interface TerminalSessionInfo {
  sessionId: string;
}

export interface ClabContainerInfo {
  name?: string;
  container_id?: string;
  image?: string;
  kind?: string;
  state?: string;
  status?: string;
  ipv4_address?: string;
  lab_name?: string;
}

const DEFAULT_TOKEN_DURATION_MS = 60 * 60 * 1000;
// Expire the cached token 5s before its actual expiry to avoid racing the server.
const TOKEN_EXPIRY_MARGIN_MS = 5000;

export default class ClabApiClient {
  private readonly baseUrl: string;
  private readonly username: string;
  private readonly password: string;
  private readonly tlsInsecure: boolean;
  private readonly tokenDurationMs: number;
  private token: string | null = null;
  private tokenExpiresAt = 0;

  constructor(options: ClabApiClientOptions) {
    this.baseUrl = options.apiUrl.replace(/\/+$/, "");
    this.username = options.username;
    this.password = options.password;
    this.tlsInsecure = options.tlsInsecure ?? false;
    this.tokenDurationMs = options.tokenDurationMs ?? DEFAULT_TOKEN_DURATION_MS;
  }

  async getToken(): Promise<string> {
    if (this.token !== null && Date.now() < this.tokenExpiresAt) {
      return this.token;
    }
    const response = await fetch(`${this.baseUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: this.username,
        password: this.password,
      }),
    });
    if (!response.ok) {
      throw new Error(
        `ClabApiClient login failed with status ${response.status}`,
      );
    }
    const body = (await response.json()) as { token?: string };
    if (typeof body.token !== "string" || body.token.length === 0) {
      throw new Error("ClabApiClient login response contained no token");
    }
    this.token = body.token;
    this.tokenExpiresAt =
      Date.now() + this.tokenDurationMs - TOKEN_EXPIRY_MARGIN_MS;
    return this.token;
  }

  async getLab(labName: string): Promise<ClabContainerInfo[]> {
    const response = await this.authedFetch(
      `/api/v1/labs/${encodeURIComponent(labName)}`,
      { method: "GET" },
    );
    return (await response.json()) as ClabContainerInfo[];
  }

  async listLabs(): Promise<Record<string, ClabContainerInfo[]>> {
    const response = await this.authedFetch("/api/v1/labs", { method: "GET" });
    return (await response.json()) as Record<string, ClabContainerInfo[]>;
  }

  async createWorkspaceDirectory(path: string): Promise<void> {
    await this.authedFetch("/api/v1/labs/workspace/directory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
  }

  async putWorkspaceFile(path: string, content: string): Promise<void> {
    await this.authedFetch(
      `/api/v1/labs/workspace/file?path=${encodeURIComponent(path)}`,
      { method: "PUT", body: content },
    );
  }

  async deployLabByPath(labName: string, topologyPath: string): Promise<void> {
    await this.authedFetch(
      `/api/v1/labs/${encodeURIComponent(labName)}/deploy?path=${encodeURIComponent(topologyPath)}`,
      { method: "POST" },
    );
  }

  async deleteLab(labName: string): Promise<void> {
    await this.authedFetch(`/api/v1/labs/${encodeURIComponent(labName)}`, {
      method: "DELETE",
    });
  }

  async createTerminalSession(
    labName: string,
    fullContainerName: string,
    cols: number,
    rows: number,
  ): Promise<TerminalSessionInfo> {
    const response = await this.authedFetch(
      `/api/v1/labs/${encodeURIComponent(labName)}/nodes/${encodeURIComponent(fullContainerName)}/terminal-sessions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ protocol: "shell", cols, rows }),
      },
    );
    return (await response.json()) as TerminalSessionInfo;
  }

  async connectTerminalStream(sessionId: string): Promise<WebSocket> {
    const token = await this.getToken();
    const wsBaseUrl = this.baseUrl
      .replace(/^https:/, "wss:")
      .replace(/^http:/, "ws:");
    const url = `${wsBaseUrl}/api/v1/terminal-sessions/${encodeURIComponent(sessionId)}/stream`;
    const wsOptions: WebSocket.ClientOptions = {
      headers: { Authorization: `Bearer ${token}` },
    };
    if (this.baseUrl.startsWith("https:")) {
      wsOptions.rejectUnauthorized = !this.tlsInsecure;
    }
    return new WebSocket(url, wsOptions);
  }

  private async authedFetch(
    path: string,
    init: RequestInit,
  ): Promise<Response> {
    const doFetch = (authToken: string): Promise<Response> =>
      fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: { ...init.headers, Authorization: `Bearer ${authToken}` },
      });
    let response = await doFetch(await this.getToken());
    if (response.status === 401) {
      this.token = null;
      this.tokenExpiresAt = 0;
      response = await doFetch(await this.getToken());
      if (response.status === 401) {
        throw new Error(
          `ClabApiClient request to ${path} failed with status 401 after re-authentication`,
        );
      }
    }
    if (!response.ok) {
      throw new Error(
        `ClabApiClient request to ${path} failed with status ${response.status}`,
      );
    }
    return response;
  }
}
