# AGENTS.md — learn-sdn-hub

> **DRAFT (2026-10-13)** — guardrails for agentic coding tools (student harnesses such as Claude-Code-style CLIs, Cline/Continue, Aider, Copilot agents) **and** a short entry point for humans. Review and adapt before/while merging.

## Purpose

This repository is a web-based teaching and learning platform for network and IT labs (SDN/P4, cloud computing, programming environments). Backend and frontend form a single npm workspace; lab environments are deployed through interchangeable **instance providers** (Docker, Proxmox-LXC, Firecracker, OpenStack, Kubernetes/vcluster, **containerlab** via clab-api-server).

The rules below apply to **all** contributions — hand-written, autocompleted, or agent-generated.

## Setup and commands

```sh
# Requirements: Node.js 22 (.nvmrc), Git, a terminal; for instances Docker or access to a containerlab host
npm install                      # workspaces: backend + frontend

# Backend (one entry point per provider), Docker example:
cd backend
DOCKER_IMAGE=prona/p4-container DOCKER_CMD=-s npm run start:docker
# Alternatives: start:proxmox, start:firecracker, start:openstack,
#               start:localmultiuservm, start:k8s, start:containerlab (requires MONGODB_URL)

# Frontend (Vite, port 3000; proxies /api/* and /ws/* to the backend on :3001)
cd frontend && npm run dev
```

Persistence/authentication: `MONGODB_URL` (MongoDB) or the respective development path with `BACKEND_USERS`/`BACKEND_USER_MAPPING`. `start:containerlab` aborts without `MONGODB_URL`.

## Quality gates (identical to CI)

```sh
# Backend — these three run in CI:
cd backend && npm test            # jest unit tests
cd backend && npm run lint
cd backend && npm run type-check

# Frontend — these two run in CI:
cd frontend && npm run lint
cd frontend && npm run build

# additionally useful locally:
cd backend && npm run test:integration   # needs @shelf/jest-mongodb (starts MongoDB locally)
npm run format:check                     # prettier, per workspace
```

**Before claiming success**, run the relevant gates and quote the actual output. No "should work now" without a run.

## Architecture map

| Directory | Responsibility |
|---|---|
| `backend/src/Api.ts`, `Server.ts`, `Config.ts` | HTTP/WebSocket entry, routing, OIDC configuration |
| `backend/src/Environment.ts` | Core: deploy/stop, consoles, check steps, submissions, exam fields |
| `backend/src/Configuration.ts` | **Assignment definitions** (`environments.set(...)`) — data model, not a place for logic |
| `backend/src/providers/` | Instance providers: `Provider.ts` (interface), `DockerProvider`, `ProxmoxProvider`, `ContainerlabProvider` + `ClabApiClient` + `TopologyFiles` |
| `backend/src/consoles/`, `backend/src/websocket/` | Terminal, lab sheet, LSP, remote desktop paths |
| `backend/src/filehandler/` | File read/write over SSH for the editor |
| `backend/src/database/`, `authentication/`, `service/` | Persistence (memory/MongoDB), auth providers, JWT |
| `backend/src/assignments/*.md` | Lab sheets (Markdown, Mermaid) |
| `frontend/src/{views,components,api,stores}` | React UI, Monaco editor, xterm terminals, API access |
| `examples/` | Example assignments, startup scripts, sample topologies |
| `docs/superpowers/` | Spec/plan artifacts for larger changes |
| `onboarding-german/` | German onboarding material for new student cohorts (intro material only) |
| `dev-stack/k8s/`, `helm/` | Kubernetes deployment |

**Where does my change belong?** New provider → `providers/` plus an `*Application.ts` and a start script in `backend/package.json`. New assignment → `Configuration.ts` plus a lab sheet in `assignments/`. New check logic → `Environment.ts` (test types) with a unit test. UI → `frontend/src/`.

## Conventions

- **Commits:** Conventional Commits (`feat(backend): …`, `fix(frontend): …`, `chore: …`, `docs: …`).
- **Branches:** `feature/<issue>-<short-description>` or `fix/<issue>-…`. PR target: `master` or `feature/**` — **PRs against `develop` do not trigger the existing CI** (see `.github/workflows/build-push-images.yaml`); a lightweight `ci-checks.yaml` covering `develop` without image builds is planned, until then run the gates locally and document them in the PR.
- **Formatting/linting:** Prettier and ESLint are configured; do not reformat unrelated files. Only add new `eslint-disable` comments with a justification/TODO (as done elsewhere in the repo).
- **No unsolicited refactorings**, no repo-wide renames, no "cleanup on the side" — separate PRs.
- **No new runtime dependencies** without agreement (the backend already ships `ws`, `js-yaml`, `toad-scheduler`, `ssh2`).
- **Keep docs current:** document new environment variables in `README.md`, document assignment fields as comments in `Configuration.ts`.
- **Language:** code, comments and repository-facing docs are English. German is reserved for onboarding material aimed at German-speaking student cohorts and must be marked with a `-german` suffix (e.g. `onboarding-german/`, `backend/src/assignments/onboarding-tour-german.md`).

## How agents should work

1. **Plan before coding** — mandatory for anything beyond a trivial change. Record goal, acceptance criteria and affected files **before** implementing; the tool is up to you (`spec-kit`, `superpowers`-style skills, or a plain chat plan):
   - *small change:* a plan paragraph in the issue or PR description;
   - *larger change:* spec + task plan as files (convention: `docs/superpowers/specs/…-design.md` + `docs/superpowers/plans/…-implementation.md` with checkbox tasks).
   The choice depends on the scope of the task and the available token budget; the reviewer only checks that a plan existed and matches the result.
2. **Small and reviewable:** small, thematically closed PRs; one goal per PR.
3. **Copy existing patterns** instead of introducing new ones (provider structure, test structure, comment style).
4. **Verification is mandatory:** run the gates above, quote the output; for UI changes, verify the behaviour in the running frontend.
5. **State assumptions explicitly** instead of guessing; ask in the issue when in doubt.
6. **No invented APIs:** only use functions/endpoints that exist in the repository or in the documented API of the counterpart.
7. **Test behaviour, not implementation:** `backend/test/unit` for pure logic (jest), `backend/test/integration` for persistence/SSH paths, `frontend/` with **Vitest + React Testing Library** (keep the scope small: jsdom renders no canvas, so skip or mock xterm/Monaco; see `onboarding-german/tasks/frontend-tests.md`).

## Security rules (binding)

- **Never expose secrets** in code, commits, PRs, prompts or logs: `.env`, `kubeconfig`, certificates, tokens, Proxmox/OpenStack/MongoDB/`CLAB_*` credentials.
- **No destructive commands on shared hosts:** no `clab destroy`/`clab prune` for labs you do not own, no deleting containers/VMs/namespaces outside your own lab. On a shared clab-api-server, **set `CLAB_LAB_PREFIX`** — with an empty prefix the periodic prune treats *all* labs on that server as its own and may delete foreign labs.
- **No force-push** to shared branches, no rewriting published history.
- **No network or file actions outside your own working area** (no scanning foreign hosts, no tunnels to foreign instances).
- When in doubt: stop and ask in the issue.

## Containerlab specifics

- Requires a **clab-api-server ≥ v0.7.0** (workspace file endpoints, `deploy?path=`, terminal sessions API).
- Required variables: `CLAB_USERNAME`, `CLAB_PASSWORD`, `CLAB_APIURL`, `CLAB_MAX_INSTANCE_LIFETIME_MINUTES`; optional: `CLAB_TOKEN_DURATION_IN_MINUTES`, `CLAB_LAB_PREFIX`, `CLAB_API_TLS_INSECURE`.
- Lab naming scheme: `${CLAB_LAB_PREFIX}${environmentId}-${groupNumber}-${username}` — do not change it; isolation depends on it.
- Terminals: `DockerShell` (API-server terminal sessions, no `sshd` inside the image) or `Shell` (SSH to the jump host container).
- Topologies can be deployed via `topologyUrl`; relatively referenced files (e.g. `server1/dnsmasq.conf`) are fetched and staged into the workspace — keep references relative **inside** the topology directory.
- Locally: `containerlab tools api-server` or the clab-api-server container image; on SR Linux, gNMI is TLS-only (57400). Use `clab deploy --reconfigure` when re-provisioning an existing lab working directory.

## Documenting AI usage

For every notable AI-assisted change, note in the PR (brief, tool-agnostic):

- **tool/tool category** (e.g. Copilot, local LLM, chat assistant, agent),
- **use case** (spec, code generation, debugging, docs, architecture),
- **degree of manual rework** (used as proposed / adjusted / discarded).

Additionally: one line about what did **not** work (hallucinations, wrong assumptions) — that feeds the project's reflection.
