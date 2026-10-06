# Containerlab Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the stale `containerlab` branch on `develop`/`master`, then add interactive node terminals (#326) and topology-file staging from URLs (#323) on top.

**Architecture:** Stage 1 rebases the existing `ContainerlabProvider` work onto current `master`. Stage 2 adds `ClabApiClient` (single owner of clab-api-server auth/REST/WS), a `DockerConsole` implementing the existing `Console` interface over clab-api-server's terminal-sessions WebSocket, and a real `createServer`/`deleteServer` with file staging into the clab-api-server workspace.

**Tech Stack:** TypeScript/Node, `ws` (already a backend dependency), jest/ts-jest (unit tests in `backend/test/unit`), clab-api-server REST + WebSocket API (HTTPS :8090, Bearer JWT).

**Spec:** `docs/superpowers/specs/2026-10-05-containerlab-completion-design.md`

## Global Constraints

- Branch sequence: rebase `containerlab` onto `master` (Stage 1) → PR to `develop`; feature branch `containerlab-console-deploy` off Stage-1 `containerlab` (Stage 2) → PR to `develop`; `develop` → `master` after acceptance testing.
- Backend lint (`npm run lint`), type-check (`npm run type-check`), and unit tests (`npm test`) must pass with zero errors/skips in `backend/`; frontend build must succeed. CI enforces lint.
- Env vars (exact names): `CLAB_USERNAME`, `CLAB_PASSWORD`, `CLAB_APIURL` (normalize: must end with exactly one trailing slash), `CLAB_MAX_INSTANCE_LIFETIME_MINUTES`, `CLAB_TOKEN_DURATION_IN_MINUTES` (default 60), `CLAB_LAB_PREFIX` (optional, default `""`), `CLAB_API_TLS_INSECURE` (new, default `false` = strict TLS).
- Lab naming formula (all tasks): `labName = ${CLAB_LAB_PREFIX}${environmentId}-${groupNumber}-${username}`.
- clab-api-server endpoints used verbatim: `POST /login`, `GET /api/v1/labs`, `GET /api/v1/labs/{labName}`, `DELETE /api/v1/labs/{labName}`, `POST /api/v1/labs/workspace/directory` `{path}`, `PUT /api/v1/labs/workspace/file?path=<p>`, `POST /api/v1/labs/{labName}/deploy?path=<p>`, `GET /api/v1/labs/topology/files`, `POST /api/v1/labs/{labName}/nodes/{nodeName}/terminal-sessions` `{protocol:"shell", cols, rows}` → response `TerminalSessionInfo` (session id field: `sessionId`), `GET /api/v1/terminal-sessions/{sessionId}/stream` (WebSocket; client→server JSON `{type:"input"|"resize"|"close"}`, server→client `{type:"ready"|"output"|"exit"}`; `output.data` carries bytes).
- No new runtime dependencies. `ws`, `js-yaml`, `toad-scheduler`, `ssh2` already in backend `package.json`.
- Do not modify frontend code (ConsoleHandler and XTerm flow work unchanged); verify this assumption in Task 7's integration step.
- `DockerShell` config type: `{type:"DockerShell", name, containerName}` — no `executable`/`params`/`provideTty`.

## Review Focus

- **Topology URL with query string or missing slash** (e.g. `https://host/labs/lab.clab.yml?raw=1`): directory join must strip the query and produce `https://host/labs/server1/dnsmasq.conf`. Pinned by `resolves file URLs relative to the topology directory, ignoring query strings` (Task 3).
- **Concurrent same-assignment deployments by two groups**: lab names must differ. Pinned by `derives unique lab name per group/user` (Task 4).
- **Missing referenced file at URL**: `createServer` rejects with an error naming the exact failed URL and does NOT leave a deployed or half-deployed lab. Pinned by `rejects with the missing file URL and cleans up` (Task 4).
- **Node container exits/restarts mid-session** (WS `exit` frame or abrupt close): console emits `close`, registered console is removed from `activeConsoles`, browser gets "Remote tty has gone." — no zombie console. Pinned by `emits close on server exit and abrupt WS close` (Task 5).
- **Output arriving before the browser websocket attaches**: buffered via `consumeInitialConsoleBuffer()`, not lost. Pinned by `buffers pre-attach output` (Task 5).

---

### Task 1: Rebase `containerlab` onto `master` (Stage 1)

**Files:**
- Modify (conflict resolution): `backend/src/Environment.ts`, `backend/src/Configuration.ts`, `backend/src/ProxmoxProvider.ts`, `backend/src/ConsoleHandler` consumers (`backend/src/websocket/ConsoleHandler.ts`), `package.json`, `package-lock.json`
- Unmodified from branch: `backend/src/providers/ContainerlabProvider.ts`, `backend/src/ContainerLabApplication.ts`, `examples/containerlab-provider/`, provider docs

**Interfaces:**
- Produces: branch `containerlab` based on `master` tip (`060ddf6`), containing `ContainerlabProvider` (with `managementAddresses?` on `VMEndpoint` from branch's `Provider.ts`), `ContainerLabApplication`, examples. Stage 2 branches off this.

- [ ] **Step 1: Run the rebase**

```bash
git fetch origin
git rebase master containerlab
```

Resolution policy: for all conflicts outside containerlab work files, take master's side (`git checkout --theirs` semantics: `git checkout master -- <file>` for tracked-content files where master wins). Note rebase direction: during rebase, "ours" is the commit being replayed (containerlab), "theirs" is master.

- [ ] **Step 2: Fix provider lint debt in `backend/src/providers/ContainerlabProvider.ts`**

Remove the block of `/* eslint-disable ... */` at the file head, fix the resulting lint errors, remove `this.providerInstance = this` (replace `providerInstance.x` reads with `this.x`), remove the debug `console.log(labName)` in `deleteServer`. Typed-token and URL-normalization fixes follow the pattern on `origin/268-create-delete-lab-function` (numeric `issued_at`/`expires_at` in ms; normalize `CLAB_APIURL` to end with one slash).

- [ ] **Step 3: Verify `ContainerLabApplication.ts` wiring against master's current `Server.ts`/`Api.ts`**

Compare the branch's `ContainerLabApplication.ts` against master's `DockerApplication.ts` (nearest analog). Update constructor args if `api(persister, authProviders, provider)` or `serverCreator` signatures changed since the fork.

- [ ] **Step 4: Verify**

```bash
cd backend && npm run lint && npm run type-check && npm test
cd ../frontend && npm run build
```

Expected: lint/type-check/tests clean, frontend build succeeds.

- [ ] **Step 5: Continue rebase, push, open PR**

```bash
git rebase --continue   # after each conflict round
git push origin containerlab --force-with-lease
```

Open PR `containerlab` → `develop` titled "Containerlab provider (rebased)". Note in the PR description that #336/#344/#319/#320 content rides along.

### Task 2: `ClabApiClient` — auth, REST helpers, WebSocket connect

**Files:**
- Create: `backend/src/providers/ClabApiClient.ts`
- Test: `backend/test/unit/ClabApiClient.test.ts`

**Interfaces:**
- Consumes: nothing new (uses `fetch`, `ws`).
- Produces (used by Tasks 4, 5):

```ts
export interface ClabApiClientOptions {
  apiUrl: string;        // e.g. "https://clab-host:8090/"
  username: string;
  password: string;
  tlsInsecure?: boolean; // default false
}
export interface TerminalSessionInfo { sessionId: string }
export interface ClabContainerInfo {
  name?: string; container_id?: string; image?: string; kind?: string;
  state?: string; status?: string; ipv4_address?: string; lab_name?: string;
}
export default class ClabApiClient {
  constructor(options: ClabApiClientOptions)
  getToken(): Promise<string>
  getLab(labName: string): Promise<ClabContainerInfo[]>
  listLabs(): Promise<Record<string, ClabContainerInfo[]>>
  createWorkspaceDirectory(path: string): Promise<void>
  putWorkspaceFile(path: string, content: string): Promise<void>
  deployLabByPath(labName: string, topologyPath: string): Promise<void>
  deleteLab(labName: string): Promise<void>
  createTerminalSession(labName: string, fullContainerName: string,
    cols: number, rows: number): Promise<TerminalSessionInfo>
  connectTerminalStream(sessionId: string): Promise<WebSocket>  // ws.WebSocket
}
```

Semantics: `getToken` logs in via `POST /login`, caches token with expiry (`CLAB_TOKEN_DURATION_IN_MINUTES`, default 60), and transparently re-authenticates once when called after expiry. All REST helpers attach `Authorization: Bearer <token>`; on a 401 they re-auth once and retry. `connectTerminalStream` opens a WS to `wss(s)://<apiUrl host>/api/v1/terminal-sessions/{sessionId}/stream` with the Bearer token (via `ws`'s `headers` option) and `rejectUnauthorized: !tlsInsecure` on `https` URLs.

- [ ] **Step 1: Write the failing tests** in `backend/test/unit/ClabApiClient.test.ts`, mocking global `fetch` with `jest.spyOn(global, "fetch")` and using a `LocalServer`-free WS fake (mock the `ws` module's `WebSocket` constructor to capture options):
  - `logs in and caches the token` — first `getToken()` → POST `/login` with `{username, password}`, returns `.token` from response body; second `getToken()` does not re-POST.
  - `re-authenticates after expiry` — simulate expiry (token stored with short duration via injected now/expiry or private field access through a test seam: expose `getToken()` only, trigger expiry by setting internal token to expired — acceptable via `(client as any)` in tests) → next `getToken()` POSTs `/login` again.
  - `attaches bearer token and retries once on 401` — `getLab` gets 401 then 200 after a second `/login` call; assert exactly 2 login POSTs total.
  - `rejects after two consecutive 401s` — error message contains the status.
  - `connectTerminalStream passes bearer header and tlsInsecure` — fake WebSocket constructed with `headers: { Authorization: "Bearer t" }` and `rejectUnauthorized: false` when `tlsInsecure: true` and https apiUrl.
  - `createTerminalSession posts protocol shell with cols/rows` — POST to `/api/v1/labs/<lab>/nodes/<container>/terminal-sessions` body `{protocol: "shell", cols, rows}`, resolves `.sessionId` from response.
- [ ] **Step 2: Run to verify failure**

Run: `npx jest --config test/unit/jest.config.cjs test/unit/ClabApiClient.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `ClabApiClient`** per the interface above.

- [ ] **Step 4: Run to verify pass** — same command, all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/providers/ClabApiClient.ts backend/test/unit/ClabApiClient.test.ts
git commit -m "feat(provider): add ClabApiClient with token auth, REST and terminal WS helpers"
```

### Task 3: Topology file-reference extraction (#323 core)

**Files:**
- Create: `backend/src/providers/TopologyFiles.ts`
- Test: `backend/test/unit/TopologyFiles.test.ts`

**Interfaces:**
- Consumes: parsed topology object (js-yaml result).
- Produces (used by Task 4):

```ts
// Collect bind-mount sources that must be staged for a URL-deployed topology.
// Only relative sources are returned (absolute paths and named volumes are
// skipped). Path is normalized (no leading "./"), POSIX separators.
export function collectReferencedBindSources(topology: object): string[]
// Join a base topology URL with a relative file path, stripping any query
// string from the base. Returns the absolute file URL.
export function resolveFileUrl(topologyUrl: string, relativePath: string): string
```

Bind syntax handled: `<source>:<target>` in node `binds` arrays; bind sources may be string entries. Skip entries whose source starts with `/` or matches `^[A-Za-z]:` or is not a two-part bind (also covers `config` blocks — those use different syntax; leave for later).

- [ ] **Step 1: Write the failing tests** in `backend/test/unit/TopologyFiles.test.ts`:
  - `collects relative bind sources from all nodes` — topology with two nodes with binds `["server1/dnsmasq.conf:/etc/dnsmasq.conf", "configs/hosts:/etc/hosts"]` and a third node without binds → returns `["server1/dnsmasq.conf", "configs/hosts"]`.
  - `skips absolute paths, volumes and malformed binds` — binds `["/etc/localtime:/etc/localtime", "myvolume:/data", "just-a-string"]` → returns `[]`.
  - `normalizes ./ prefixes` — `"./server1/dnsmasq.conf:/etc/dnsmasq.conf"` → `"server1/dnsmasq.conf"`.
  - `resolves file URLs relative to the topology directory, ignoring query strings` — `resolveFileUrl("https://host/labs/lab.clab.yml?raw=1", "server1/dnsmasq.conf")` === `"https://host/labs/server1/dnsmasq.conf"`; `resolveFileUrl("https://host/labs/", "a.conf")` === `"https://host/labs/a.conf"`.
- [ ] **Step 2: Run to verify failure**

Run: `npx jest --config test/unit/jest.config.cjs test/unit/TopologyFiles.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `TopologyFiles.ts`** — pure functions, no I/O.

- [ ] **Step 4: Run to verify pass** — same command, PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/providers/TopologyFiles.ts backend/test/unit/TopologyFiles.test.ts
git commit -m "feat(provider): collect bind-source files and resolve their URLs from topology"
```

### Task 4: `createServer` with file staging + real `deleteServer`

**Files:**
- Modify: `backend/src/providers/ContainerlabProvider.ts` (replace the `createServer`/`deleteServer` stubs; `getServer` gains the jumphost-IP fix from `origin/268-create-delete-lab-function`), `backend/src/providers/Provider.ts` (`createServer` options gain `clabTopology?: string | object`)
- Test: `backend/test/unit/ContainerlabProvider.test.ts`

**Interfaces:**
- Consumes: `ClabApiClient` (Task 2), `collectReferencedBindSources`/`resolveFileUrl` (Task 3), branch's existing `getTopology`, `changeTopologyName`.
- Produces: working `createServer(username, groupNumber, environment, options)` → `Promise<VMEndpoint>`; working `deleteServer(instance)`. `getServer` returns `IPAddress` = jumphost container IP (`clab-<labName>-jumphost`) and `managementAddresses` map.

`createServer` flow (reference implementation shape: `origin/266-create-deploylab-function-create-lab` commit `d0b267f` + spec §3): 
1. If `options.clabTopology` is a string URL: `getTopology(url)`; if an object: use directly. Reject on parse failure.
2. `changeTopologyName(topology, labName)` with the Global-Constraints naming formula.
3. For URL sources: for each `collectReferencedBindSources(topology)` entry, `fetch(resolveFileUrl(topologyUrl, entry))` → reject with the exact URL on any failure.
4. `createWorkspaceDirectory(labName)`; `putWorkspaceFile("<labName>/<fileBaseName>.clab.yml", dump(topology))` (js-yaml `dump`); `putWorkspaceFile("<labName>/<entry>", fileContent)` per staged file.
5. `deployLabByPath(labName, "<labName>/<fileBaseName>.clab.yml")`; poll `getLab(labName)` every 2 s until containers report running state, bounded by 10 attempts; on failure → `deleteLab(labName)` then reject.
6. Resolve with `getServer(labName)`.

`deleteServer(instance)`: `deleteLab(instance)` via the client (destroy; workspace files kept).

- [ ] **Step 1: Write the failing tests** in `backend/test/unit/ContainerlabProvider.test.ts`, injecting a mock `ClabApiClient` (constructor seam: pass an options object plus an optional `client` override, or extract provider construction — one reasonable approach: constructor gains an optional last parameter `client?: ClabApiClient` used by tests):
  - `derives unique lab name per group/user` — spy on client calls; `createServer("alice", 7, "clab-lab", {clabTopology: <url>})` → workspace PUT path starts with `"clab-lab-7-alice/"` (with default empty prefix).
  - `stages topology and referenced files then deploys by path` — topology URL `https://host/labs/lab.clab.yml` with bind `server1/dnsmasq.conf:/etc/dnsmasq.conf`; assert: topology fetched, file fetched from `https://host/labs/server1/dnsmasq.conf`, three client calls in order: `createWorkspaceDirectory("clab-lab-7-alice")`, two `putWorkspaceFile`, `deployLabByPath` with path ending `.clab.yml`.
  - `rejects with the missing file URL and cleans up` — file fetch returns 404 → rejects with message containing `https://host/labs/server1/dnsmasq.conf`; `deleteLab` called with the lab name; `deployLabByPath` never called.
  - `deletes the lab on failed deploy` — `deployLabByPath` throws → `deleteLab` called, error surfaced.
  - `deleteServer calls deleteLab` — `deleteServer("clab-lab-7-alice")` → client `deleteLab("clab-lab-7-alice")` awaited.
  - `getServer returns jumphost IPAddress` — client `getLab` returns containers incl. `name: "clab-clab-lab-7-alice-jumphost", ipv4_address: "10.10.10.5/24"` → resolved endpoint `IPAddress === "10.10.10.5"` and `managementAddresses` maps node names.
- [ ] **Step 2: Run to verify failure**

Run: `npx jest --config test/unit/jest.config.cjs test/unit/ContainerlabProvider.test.ts`
Expected: FAIL (stubs never resolve / no client seam).

- [ ] **Step 3: Implement** per flow above; keep the existing prune scheduler and token handling intact.

- [ ] **Step 4: Run to verify pass** — same command, PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/providers/ContainerlabProvider.ts backend/src/providers/Provider.ts backend/test/unit/ContainerlabProvider.test.ts
git commit -m "feat(provider): implement containerlab createServer with file staging and deleteServer"
```

### Task 5: `DockerConsole` — terminal-session WS bridge (#326)

**Files:**
- Create: `backend/src/consoles/DockerConsole.ts`
- Test: `backend/test/unit/DockerConsole.test.ts`

**Interfaces:**
- Consumes: `ClabApiClient.createTerminalSession`/`connectTerminalStream` (Task 2); `Console` interface from `backend/src/consoles/SSHConsole.ts`.
- Produces (used by Task 6):

```ts
export default class DockerConsole extends EventEmitter implements Console {
  constructor(
    environmentId: string,
    consoleName: string,
    username: string,
    groupNumber: number,
    sessionId: string | undefined,
    client: ClabApiClient,
    labName: string,
    containerName: string,        // short node name from assignment config
    managementAddresses: Record<string, string>,  // for full-name resolution
    initialCols: number,
    initialRows: number,
  )
  // Console interface: on/off ("data", "close"|"ready"|"closed"|"finished"),
  // write(data), writeLine(data), resize(columns, lines),
  // consumeInitialConsoleBuffer(): string, close(environmentId, groupNumber,
  // sessionId?), public fields command/args/cwd ("" for all)
}
```

Behavior: constructor resolves the full container name — exact key in `managementAddresses`, else the unique key ending in `-${containerName}`; resolves lazily in an async `connect()` triggered from the constructor (events pattern of SSHConsole: emit `ready` after session created and WS open; emit `error` on failure; emit `close` on server `exit` or WS close). Server `{type:"output", data}` → emit `data`; `write(data)` → WS send `{type:"input", data}`; `resize(cols, lines)` → WS send `{type:"resize", cols, lines}`; `close()` → WS send `{type:"close"}` and terminate WS. Output received before `consumeInitialConsoleBuffer()` is buffered (same pattern as SSHConsole).

- [ ] **Step 1: Write the failing tests** in `backend/test/unit/DockerConsole.test.ts`, injecting a mock `ClabApiClient` whose `createTerminalSession` returns `{sessionId: "sess-1"}` and whose `connectTerminalStream` returns a fake `ws`-like `EventEmitter` (capture `send` calls):
  - `creates a shell terminal session and emits ready` — `createTerminalSession` called with `{labName, fullContainerName: <resolved>, protocol implied by client, cols, rows}`; after fake WS emits `open` then `{"type":"ready"}`, console emits `ready`.
  - `buffers pre-attach output` — fake WS emits `{"type":"output","data":"motd"}` before consumer calls `consumeInitialConsoleBuffer()` → returns `"motd"`, subsequent `data` events flow directly.
  - `write and resize send correct JSON frames` — `console.write("ls\r")` → last WS send parses to `{type:"input", data:"ls\r"}`; `console.resize(120, 40)` → `{type:"resize", cols:120, rows:40}`.
  - `emits close on server exit and abrupt WS close` — fake WS emits `{"type":"exit"}` on one console → `close` emitted once; on another, abrupt WS `close` event → `close` emitted once.
  - `resolves container name by exact key or suffix` — `managementAddresses {"clab-lab-srl1": "10.0.0.5:22", "clab-lab-host1": "10.0.0.6:22"}` with `containerName: "srl1"` → session created for `clab-lab-srl1`; with `containerName: "host1"` → `clab-lab-host1`.
  - `emits error when no matching container` — `containerName: "nope"` → `error` event.
- [ ] **Step 2: Run to verify failure**

Run: `npx jest --config test/unit/jest.config.cjs test/unit/DockerConsole.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `DockerConsole`** per behavior above.

- [ ] **Step 4: Run to verify pass** — same command, PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/consoles/DockerConsole.ts backend/test/unit/DockerConsole.test.ts
git commit -m "feat(console): add DockerConsole bridging xterm.js to clab-api-server terminal sessions"
```

### Task 6: Environment and Configuration wiring (`DockerShell`)

**Files:**
- Modify: `backend/src/Environment.ts` (add `DockerShell` to `TerminalType`; add `case "DockerShell"` to the subterminal switch in the deploy path; pass `topologyUrl` into `createServer` options), `backend/src/Configuration.ts` (EnvironmentDescription-equivalent gains `topologyUrl?: string`; example entries unchanged on master — only the type changes)
- Test: `backend/test/unit/EnvironmentDockerShell.test.ts`

**Interfaces:**
- Consumes: `DockerConsole` (Task 5), provider `createServer` options `clabTopology` (Task 4).
- Produces: assignments can declare `terminals: [[{type:"DockerShell", name:"srl1", containerName:"srl1"}]]` and `topologyUrl`; `Environment` opens a `DockerConsole` registered in `activeConsoles` under the terminal alias.

- [ ] **Step 1: Write the failing test** in `backend/test/unit/EnvironmentDockerShell.test.ts` — Environment is heavy to instantiate; test the switch seam instead: export a small factory from `Environment.ts`:

```ts
export function createConsoleForSubterminal(
  subterminal: TerminalType, endpoint: VMEndpoint, client: ClabApiClient,
  environmentId: string, username: string, groupNumber: number,
  sessionId: string | undefined, labName: string,
): Console
```

  (the existing `case "Shell"` and new `case "DockerShell"` both route through it; Task implements the extraction plus the two cases). Test: a `DockerShell` subterminal with a fake client returns a `DockerConsole` instance with the right `labName`/`containerName`; a `Shell` subterminal still returns an `SSHConsole`.
- [ ] **Step 2: Run to verify failure**

Run: `npx jest --config test/unit/jest.config.cjs test/unit/EnvironmentDockerShell.test.ts`
Expected: FAIL — factory not exported.

- [ ] **Step 3: Implement** — extract the factory, add the `DockerShell` case (registers in `activeConsoles` under `subterminal.name` on `ready`, deletes on `close`; Environment passes `labName: endpoint.instance` — the lab is already deployed or just created via `clabTopology`), extend `createServer` options construction in `Environment.start` with `clabTopology: this.configuration.topologyUrl` (only present for clab-configured environments), add `topologyUrl?: string` to the environment description type in `Configuration.ts`.

- [ ] **Step 4: Run to verify pass** — same command, PASS; then full backend suite `npm test` still green.

- [ ] **Step 5: Commit**

```bash
git add backend/src/Environment.ts backend/src/Configuration.ts backend/test/unit/EnvironmentDockerShell.test.ts
git commit -m "feat(env): wire DockerShell terminals and topologyUrl into Environment"
```

### Task 7: Examples and docs

**Files:**
- Create: `examples/containerlab-provider/sample-assignment-topologyurl.ts` (Configuration snippet with `topologyUrl` + `DockerShell` terminals)
- Modify: `README.md` (containerlab provider section: env vars incl. new `CLAB_API_TLS_INSECURE`, minimum clab-api-server version note, URL-deploy + staging explanation)

**Interfaces:**
- Consumes: all prior tasks' produced config surface.

- [ ] **Step 1: Write the example snippet** — mirror `examples/containerlab-provider/sample-topology-with-mgmt-host.clab.yml`'s lab (dnsmasq node) as an assignment: `topologyUrl: "https://<webhost>/labs/sample.clab.yml"`, one `DockerShell` terminal (`name: "dnsmasq-host", containerName: "server1"`), one `Shell` terminal to the jumphost for comparison.

- [ ] **Step 2: Verify config parses** — `cd backend && npm run type-check` (the example file is referenced in README, kept outside tsconfig; run `npx ts-node --transpile-only examples/containerlab-provider/sample-assignment-topologyurl.ts` expecting clean exit).

- [ ] **Step 3: Update README** with the env-var table additions and a "Deploying from a URL with referenced files" subsection (staging behavior, failure behavior: deploy fails naming the missing URL).

- [ ] **Step 4: Commit**

```bash
git add examples/containerlab-provider/sample-assignment-topologyurl.ts README.md
git commit -m "docs(containerlab): topologyUrl + DockerShell example and provider docs"
```

### Task 8: Integration verification (real clab-api-server)

**Files:** none (verification only; uses `examples/containerlab-provider/` assets and a dev clab host)

**Interfaces:**
- Consumes: everything above, running against a real clab-api-server with the sample topology (and `server1/dnsmasq.conf`) served by a static web server.

- [ ] **Step 1: Start the backend** with the clab env vars (`CLAB_APIURL=https://<host>:8090/`, credentials, `CLAB_API_TLS_INSECURE=true` for self-signed) via `ContainerLabApplication.ts`.

- [ ] **Step 2: Deploy the sample assignment from URL** → lab appears in `GET /api/v1/labs`, dnsmasq node runs with its staged config (verify dnsmasq answers on the lab).

- [ ] **Step 3: Open a DockerShell terminal in the browser** → output flows, typing works, resize works, close and reopen works, two terminals on two nodes simultaneously.

- [ ] **Step 4: Stop the environment** → lab gone from `GET /api/v1/labs`; backend logs show the DELETE call.

- [ ] **Step 5: Deploy the same assignment from two groups simultaneously** → distinct lab names, no cross-talk.

- [ ] **Step 6: Record results** in the PR description (screenshots of terminals; failure-path screenshot for a missing file URL).

### Task 9: Merge-out

**Files:** none (git/PR operations)

- [ ] **Step 1: Final gates** — backend `npm run lint && npm run type-check && npm test`, frontend `npm run build` on the feature branch tip.

- [ ] **Step 2: PR `containerlab-console-deploy` → `develop`**, linking the spec and this plan, including Task 8 evidence.

- [ ] **Step 3: After review/acceptance** — merge `develop` → `master` (maintainer decision per spec's delivery plan).

- [ ] **Step 4: Close out** — comment on issues #326 and #323 referencing the merged PR; the containerlab branch is fully absorbed and can be deleted after the merge.
