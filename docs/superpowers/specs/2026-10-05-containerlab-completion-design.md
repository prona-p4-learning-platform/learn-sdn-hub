# Finish Containerlab Support — Design

Date: 2026-10-05
Status: Approved (design), pending spec review
Scope: Issues #326 (console connections) and #323 (dnsmasq/file staging), plus landing the stale `containerlab` branch on `master` via `develop`.

## Problem

The `containerlab` branch implements a working `ContainerlabProvider` against a
[clab-api-server](https://github.com/srl-labs/clab-api-server), but:

1. It forked from `master` at `64aac01` and is 344 commits behind.
2. Students cannot open interactive terminals to lab nodes (#326): the only
   terminal type is `Shell` (SSH), and containerlab node images typically do
   not run sshd.
3. Topologies deployed from a URL that reference side files (e.g. dnsmasq
   configs used as bind mounts) fail, because a URL deploy only materializes
   the `.clab.yml` on the host (#323).

## Goals

- Land the containerlab work on `master` (via `develop`) with CI green.
- Interactive xterm.js terminals to containerlab nodes for all students.
- Topologies deployed from URLs get their referenced files staged
  automatically.
- End state: branch merged into `develop` and `master`.

## Non-Goals

- Docker console support for the local `DockerProvider` (unrelated flow).
- Kubernetes provider changes.
- GUI changes beyond wiring a new terminal type through the existing flow.

## Context (agreed understanding)

- Deployment: clab-api-server deploys labs on a remote host; `learn-sdn-hub`
  authenticates with username/password to `/login` and uses Bearer tokens
  (implemented on the branch in `ContainerlabProvider.getToken`).
- `endpoint.IPAddress` returned by `getServer` is the clab host's management
  address of a representative container; `managementAddresses` maps container
  names to `<ip>:22`.
- Terminal transport decision: bridge to clab-api-server's
  **terminal-sessions API** (`shell` protocol = server-side PTY-backed
  `docker exec -it <container>`), not SSH→`docker exec` from the backend.
- File URL convention (#323): files referenced by relative bind mounts are
  fetched relative to the topology URL (same directory), no extra config.

## Architecture

### 1. Shared API client

New module `backend/src/providers/ClabApiClient.ts`:

- Owns token login, expiry tracking and single re-auth retry (moved out of
  `ContainerlabProvider`).
- REST helpers for the endpoints below.
- WebSocket connect for terminal streams; self-signed TLS accepted when
  `CLAB_API_TLS_INSECURE=true` (default: strict).

Used by `ContainerlabProvider` and `DockerConsole`.

### 2. Console bridge (#326)

New `backend/src/consoles/DockerConsole.ts` implementing the existing
`Console` interface (`data`/`close` events, `write`, `writeLine`, `resize`,
`consumeInitialConsoleBuffer`, `close`) so `ConsoleHandler` and the frontend
XTerm flow work unchanged.

- Session creation: `POST /api/v1/labs/{labName}/nodes/{fullContainerName}/
  terminal-sessions` with `{protocol: "shell", cols, rows}`.
- Stream: WS to `/api/v1/terminal-sessions/{sessionId}/stream`.
- Repacking: server JSON `{type:"output", data}` → `data` event; browser stdin
  bytes → `{type:"input", data}`; resize (parsed by `ConsoleHandler` →
  `resize(cols, rows)`) → `{type:"resize", cols, rows}`; `exit` → `close`.
- Initial console buffer: output before browser attach is buffered and
  flushed via `consumeInitialConsoleBuffer()` (same pattern as SSHConsole).
- Node name resolution: assignments use short node names; full container
  names (`clab-<lab>-<node>`) are resolved against the lab's container list
  (from `getServer`'s `managementAddresses` / lab inspect), because the lab
  name prefix is unique per group.
- Cleanup: closing the console closes the WS. Stale server-side sessions
  expire via clab-api-server's own session limits.

Environment wiring:

- `TerminalType` gains `DockerShell`: `{type: "DockerShell", name, containerName}`.
  No `executable`/`params` (the API server selects the command) and no
  `provideTty` (sessions are always PTY-backed).
- `case "DockerShell"` in `Environment` creates a `DockerConsole` and registers
  it in the **existing** `activeConsoles` map. The sketch's parallel
  `activeDockerConsoles` map is dropped; `ConsoleHandler` needs no changes.

### 3. Deploy staging & provider completion (#323)

- Environment config gains optional `topologyUrl`; `Environment.start` passes
  it into `createServer` options. Without it, clab environments remain
  attach-only (`getServer`).
- `ContainerlabProvider.createServer(username, groupNumber, environmentId,
  options)`:
  1. `getTopology(topologyUrl)` → parse → `changeTopologyName` to the
     per-group unique lab name (honoring `CLAB_LAB_PREFIX`).
  2. Collect every **relative bind source** in the topology; fetch each from
     `<dirname(topologyUrl)>/<relativePath>`. Generalized beyond dnsmasq.
     Absolute host paths and named volumes are skipped. Any missing URL
     rejects with an error naming that URL.
  3. Stage into the clab-api-server workspace: `POST /api/v1/labs/workspace/
     directory {path: "<labName>"}` (idempotent), then `PUT /api/v1/labs/
     workspace/file?path=<labName>/<relPath>` for the rewritten topology YAML
     and each fetched file.
  4. `POST /api/v1/labs/{labName}/deploy?path=<labName>/<lab>.clab.yml`;
     poll `GET /api/v1/labs/{labName}` until containers run (bounded
     timeout); resolve `getServer(labName)`.
- `deleteServer(labName)`: `DELETE /api/v1/labs/{labName}` (destroy, keep
  workspace files). Wired into the existing `Environment.stop` provider path.
- `getServer` unchanged (incl. `managementAddresses` for name resolution).
- Error handling: token expiry mid-flow → one re-auth and retry; deploy
  timeout → error surfaced, no persister entry until endpoint resolves.

## Delivery plan (two-stage landing)

Stage 1 — rebase:

- Rebase `containerlab` onto current `master` (cherry-pick alternative if it
  yields fewer conflicts). Conflict hotspots: `Environment.ts`,
  `Configuration.ts`, `package.json`/lock, `ProxmoxProvider.ts`. Master wins
  everywhere except containerlab work files.
- Fix branch-local debt while rebasing: remove `eslint-disable` pile and
  debug logs in `ContainerlabProvider.ts`, drop `providerInstance = this`,
  verify `ContainerLabApplication.ts` wiring against current `Server.ts`/
  `Api.ts`.
- PR → `develop`. The extra merged PRs (#336 topology-from-URL, #344
  mgmt-addresses, #319/#320 prune/get-lab) ride along as part of the provider.

Stage 2 — features:

- Branch `containerlab-console-deploy` off Stage 1; implement sections 1–3.
- PR → `develop`.

Finish: `develop` → `master` after acceptance testing.

Superseded: the two commits on `326-establish-console-connection-to-docker-
container-nodes-new` (SSH-based `DockerConsole` sketch, parallel
`activeDockerConsoles` map) are abandoned; branch kept as reference only.

Docs/examples:

- `examples/containerlab-provider/`: sample config with `topologyUrl` +
  `DockerShell` terminals.
- README: clab provider env vars — `CLAB_USERNAME`, `CLAB_PASSWORD`,
  `CLAB_APIURL`, `CLAB_MAX_INSTANCE_LIFETIME_MINUTES`, `CLAB_LAB_PREFIX`,
  `CLAB_API_TLS_INSECURE`.

## Testing

Unit tests (backend, existing `backend/test` conventions):

- `ClabApiClient`: token acquisition/expiry/re-auth-retry, headers, TLS flag.
- File-reference extraction: relative binds collected; absolute/volume
  skipped; URL joining edge cases (nested dirs, `./`).
- `DockerConsole` bridge against an in-process mock terminal API: output →
  `data`; `write` → `input` frames; `resize` frames; `exit` → `close`;
  pre-attach buffering.
- `createServer` against a mocked API server: stage → deploy → `getServer`
  sequence, per-group naming, failure paths (missing file URL named in error).

Integration verification (manual, real clab-api-server):

1. Deploy sample topology from URL incl. `server1/dnsmasq.conf` → lab runs,
   dnsmasq node functional.
2. Browser `DockerShell` terminal: output, typing, resize, close/reopen, two
   terminals on two nodes simultaneously.
3. Stop environment → lab gone from `GET /api/v1/labs`.
4. Two groups deploying the same assignment simultaneously → distinct lab
   names.

Regression gate per PR: backend lint + tests + frontend build (CI enforces
lint).

## Risks

- Terminal-session API is versioned with clab-api-server; pin minimum server
  version in README.
- `deploy?path=` and workspace file endpoints must exist in the deployed
  clab-api-server release; the spec documents the exact endpoints so a
  version mismatch is detectable at integration time.
