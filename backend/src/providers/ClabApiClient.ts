import { Agent, fetch as undiciFetch } from "undici";
import type { Dispatcher, RequestInit as UndiciRequestInit } from "undici";
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

// models.SSHAccessResponse from the clab-api-server swagger spec
export interface SSHAccessResponse {
  command?: string;
  expiration?: string;
  host: string;
  port: number;
  username: string;
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
// Hard cap for every REST request against the clab-api-server so a hung
// connection cannot stall the provider (merged with caller-provided signals).
const REQUEST_TIMEOUT_MS = 10_000;

/** Error thrown for non-OK clab-api-server responses; carries the HTTP status. */
export class ClabApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ClabApiError";
  }
}

/** Reads (a truncated form of) an error response body, tolerating unreadable ones. */
async function describeErrorResponse(
  path: string,
  response: Response,
): Promise<string> {
  const base = `ClabApiClient request to ${path} failed with status ${response.status}`;
  let bodyText = "";
  try {
    bodyText = (await response.text()).trim();
  } catch {
    // body unreadable — fall back to the status-only message
  }
  if (bodyText.length === 0) {
    return base;
  }
  return `${base}: ${bodyText.slice(0, 200)}`;
}

export default class ClabApiClient {
  private readonly baseUrl: string;
  private readonly username: string;
  private readonly password: string;
  private readonly tlsInsecure: boolean;
  private readonly tokenDurationMs: number;
  private readonly insecureDispatcher: Dispatcher | null;
  private token: string | null = null;
  private tokenExpiresAt = 0;

  constructor(options: ClabApiClientOptions) {
    this.baseUrl = options.apiUrl.replace(/\/+$/, "");
    this.username = options.username;
    this.password = options.password;
    this.tlsInsecure = options.tlsInsecure ?? false;
    this.tokenDurationMs = options.tokenDurationMs ?? DEFAULT_TOKEN_DURATION_MS;
    // Node's global fetch (undici) has no per-request TLS bypass, so insecure
    // REST calls go through an undici Agent with rejectUnauthorized: false.
    this.insecureDispatcher = this.tlsInsecure
      ? new Agent({ connect: { rejectUnauthorized: false } })
      : null;
  }

  /** Base URL of the clab API (without trailing slash). */
  get apiUrl(): string {
    return this.baseUrl;
  }

  async getToken(): Promise<string> {
    if (this.token !== null && Date.now() < this.tokenExpiresAt) {
      return this.token;
    }
    const response = await this.doFetch(`${this.baseUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: this.username,
        password: this.password,
      }),
    });
    if (!response.ok) {
      throw new ClabApiError(
        await describeErrorResponse("login", response),
        response.status,
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

  async createNodeSshAccess(
    labName: string,
    nodeName: string,
  ): Promise<SSHAccessResponse> {
    const response = await this.authedFetch(
      `/api/v1/labs/${encodeURIComponent(labName)}/nodes/${encodeURIComponent(nodeName)}/ssh`,
      { method: "POST" },
    );
    return (await response.json()) as SSHAccessResponse;
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

  private doFetch(url: string, init: RequestInit): Promise<Response> {
    // Hard cap for every request; a caller-provided abort signal is merged in
    // and its abort wins alongside the timeout.
    const requestSignal = init.signal
      ? AbortSignal.any([init.signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)])
      : AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    const initWithTimeout: RequestInit = { ...init, signal: requestSignal };
    if (this.insecureDispatcher === null) {
      return fetch(url, initWithTimeout);
    }
    return undiciFetch(url, {
      ...initWithTimeout,
      dispatcher: this.insecureDispatcher,
    } as unknown as UndiciRequestInit) as unknown as Promise<Response>;
  }

  private async authedFetch(
    path: string,
    init: RequestInit,
  ): Promise<Response> {
    const attempt = (authToken: string): Promise<Response> =>
      this.doFetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: { ...init.headers, Authorization: `Bearer ${authToken}` },
      });
    let response = await attempt(await this.getToken());
    if (response.status === 401) {
      this.token = null;
      this.tokenExpiresAt = 0;
      response = await attempt(await this.getToken());
      if (response.status === 401) {
        throw new ClabApiError(
          `ClabApiClient request to ${path} failed with status 401 after re-authentication`,
          401,
        );
      }
    }
    if (!response.ok) {
      throw new ClabApiError(
        await describeErrorResponse(path, response),
        response.status,
      );
    }
    return response;
  }
}
