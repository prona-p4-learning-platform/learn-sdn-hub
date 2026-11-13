# Automaton — Design

**Status:** approved in chat, 2026-11-13 (design discussion; implementation not started)
**Branch:** `feature/lax-trauty-automaton` (from `develop`)
**Goal:** A new task type `"game"` for learn-sdn-hub: **Automaton**, a multiplayer engineering/automation game (resource extraction, logistics, production chains) in a shared, persistent 3D world, rendered with WebGPU in the browser. Assignments define goals ("deliver 30 iron ingots/min") that are checked and submitted through the platform like any other assignment.

## Decisions (from the design discussion)

| Topic | Decision |
|---|---|
| Integration | New `EnvironmentType` **`"game"`** — follows the `k8s` / `k8s-vcluster` precedent (own list section, own routes, own view). **No provider instance** is deployed. |
| View | Own route `/game/:assignment`, **full assignment area** WebGPU canvas; lab sheet, goals (steps) and submit as in-game overlays. |
| Server | Separate long-running service **`automaton-server`** (own process/container), **not** in the backend process and **not** a provider instance. |
| Access | Browser → backend WebSocket proxy (JWT + authorization) → world server. World server is internal only. |
| Worlds | One server process hosts many worlds on a worker-thread pool. World types: **course world, group world, personal sandbox**. Start screen in-game lists worlds the backend allows. |
| Terrain | Smooth, **static** (not editable), generated deterministically from a seed: 3D density (surface + caves), meshed client-side (surface nets). |
| Resources | **Fixed, infinite deposits** generated from the seed: ore clusters, resource wells, vents — on the surface and in caves. Purity sets the extraction rate. |
| Resource kinds | `solid`, `fluid`, `gas`, `energy`. |
| Building | World-aligned 1 m grid, 90° rotations, foundations as the base for machines, per-entity ownership, group plots in course worlds. |
| Simulation | Server-authoritative fixed tick (20 Hz), integer-only, deterministic; shared core runs on server and client. |
| Idle worlds | Unloaded when empty; **event-driven catch-up** at measured rates on reload. |
| Archiving | Manual (admin) **plus** optional `archiveAt` per world; sandboxes auto-deleted after N idle days. |
| WASM | **Not in v1.** Shared TypeScript core behind a narrow interface; a Rust/WASM port stays possible if profiling demands it. |

## Non-goals (v1)

- Terrain editing of any kind.
- Finite/respawning deposits.
- Structural physics, combat, creatures, day/night gameplay effects.
- Embedding the game as a terminal tab in normal assignments (possible later via a `Game` terminal type).
- Exam mode (`isExam`) for game assignments — the loader rejects the combination.
- Multiple world-server processes (sharding). The design keeps it possible (`worldId → server` mapping), but v1 runs exactly one.

## Architecture

```
┌────────────── browser ──────────────┐
│ /game/:assignment (React view)      │
│  ├─ WebGPU renderer (main thread)   │
│  ├─ terrain worker (density+mesh)   │
│  ├─ sim worker (client-side replica)│
│  └─ overlays: start screen, HUD,    │
│     build menu, lab sheet, goals    │
└──────┬───────────────────┬──────────┘
       │ REST /api/game/*  │ WS /ws/game/:assignment/:worldId
┌──────▼───────────────────▼──────────┐
│ backend (existing)                  │
│  routes/game.ts   websocket/        │
│  game/worldAccess  GameHandler.ts   │  JWT, course/group checks,
│  game/WorldServerClient.ts          │  world creation params
└──────┬───────────────────┬──────────┘
       │ internal HTTP     │ internal WS (token)
┌──────▼───────────────────▼──────────┐
│ automaton-server (new service)      │
│  main thread: HTTP/WS I/O, routing  │
│  WorkerPool ─ worker N: WorldRuntime│──── MongoDB (automaton_* collections)
│                 (tick, sim, AOI)    │     or in-memory store
└─────────────────────────────────────┘
```

### Repository layout

| Path | Package | Content |
|---|---|---|
| `automaton/core/` | `@learn-sdn-hub/automaton-core` | Pure TypeScript, **no Node or DOM APIs**: world ids, binary protocol codec, deterministic noise + density, mesher, deposit generator, grid/placement rules, simulation (belts, machines, networks), catch-up solver. Used by server and frontend. |
| `automaton/server/` | `@learn-sdn-hub/automaton-server` | World server: HTTP/WS entry, worker pool, `WorldRuntime`, persistence stores, internal admin/query API. Runs with `ts-node` like the backend. |
| `backend/src/routes/game.ts` | backend | REST: world list, step checks, submit, admin world operations (proxied). |
| `backend/src/websocket/GameHandler.ts` | backend | WS proxy browser ↔ world server. |
| `backend/src/game/` | backend | `worldAccess.ts` (pure: which worlds may this user join), `WorldServerClient.ts` (internal HTTP client). |
| `frontend/src/views/Game.tsx` | frontend | Route `/game/:assignment`. |
| `frontend/src/components/assignments/GameAssignments.tsx` | frontend | Assignment list section with "Play" button. |
| `frontend/src/automaton/` | frontend | Renderer, workers, networking, input, overlays. |
| `backend/src/assignments/environments/automaton-*.ts` + `backend/src/assignments/automaton-*.md` | backend | Game assignments + lab sheets (per-assignment file convention). |

Root `package.json` workspaces become `["backend", "frontend", "automaton/core", "automaton/server"]`.

### Task type `"game"`

`EnvironmentType` (`backend/src/Environment.ts:143`) and the frontend `EnvironmentSchema` (`frontend/src/hooks.ts:5`) gain `"game"`. A game assignment is a normal per-assignment file:

```ts
// backend/src/assignments/environments/automaton-intro.ts
import type { EnvironmentDescription } from "../../Environment";

export const name = "Automaton-Intro";
export const environment: EnvironmentDescription = {
  type: "game",
  description: "Automaton: first production chain",
  assignmentLabSheet: "../assignments/automaton-intro.md",
  assignmentLabSheetLocation: "backend", // "instance" is rejected for game assignments
  terminals: [],
  editableFiles: [],
  stopCommands: [],
  game: {
    template: "temperate",          // terrain/resource preset in automaton-core
    seed: 4711,
    worldTypes: ["course", "group", "sandbox"],
    gradedWorldTypes: ["course", "group"],
    rules: { maxPlayers: 40, plots: { size: 128 }, worldRadius: 1024 },
  },
  steps: [
    {
      name: "1", label: "Iron ingots",
      tests: [{
        type: "WorldQuery",
        query: { kind: "throughput", resource: "iron-ingot", minPerMinute: 30, windowMinutes: 5, scope: "own" },
        successMessage: "Your factory delivers 30 iron ingots/min.",
        errorHint: "Check that your smelters are powered and supplied.",
      }],
    },
  ],
};
```

**Loader validation** (fail fast at boot, in `Configuration.ts`'s existing loader): for `type: "game"`, require a `game` block and empty `terminals` / `editableFiles` / `stopCommands`; reject `isExam`, `assignmentLabSheetLocation: "instance"`, provider fields (`providerImage`, …), `submissionPrepareCommand`, and any step test other than `WorldQuery`. For other types, reject a `game` block and `WorldQuery` tests.

**Deploy path:** `/api/environment/create` rejects `type: "game"`. Game assignments never enter `Environment.activeEnvironments`, so the one-environment-per-group rule (`Environment.createEnvironment`) does not apply — students can play while another lab is deployed.

**Lab sheet:** the existing `GET /api/environment/:environment/assignment` already serves `backend` and `database` sheets without an active environment; the game view reuses it.

### World types and ids

| Type | Id | Who can join | Ownership unit |
|---|---|---|---|
| Course world | `course:<courseId>:<assignment>` | users whose `courses[]` contains a course that lists the assignment | group (plots) |
| Group world | `group:<groupNumber>:<assignment>` | members of the group | group |
| Sandbox | `sandbox:<username>:<assignment>` | the user only (quota: 1 per user and assignment) | user |

Ids are deterministic, so worlds are created lazily on first join — nobody creates worlds by hand. A user in several courses that list the assignment sees one course world per course on the start screen (resolves the multi-course ambiguity). Without MongoDB (no courses), the course world falls back to `course:default:<assignment>`. Admins can join any world (spectator by default).

### Access flow

1. `GET /api/game/:assignment/worlds` → backend resolves allowed world ids (`worldAccess.ts`, pure function of user, courses, assignment `game` block) and merges status from the world server (`active | idle | readonly`, players online).
2. One world → client joins directly; several → start screen.
3. Client opens `WS /ws/game/:assignment/:worldId`, first message `auth <jwt> <group>` (same handshake as `websocket/index.ts`).
4. Backend re-checks the world id is allowed, then opens the upstream WS to `AUTOMATON_SERVER_URL` with an internal hello: `{ token: AUTOMATON_INTERNAL_TOKEN, worldId, template, seed, rules, username, groupNumber, role }`. The world server creates the world if missing (using these params) and trusts only this hello.
5. Bytes are piped both ways; either side closing closes the other.

### World server

- **Main thread:** HTTP (internal API) + WS (internal, token-checked), routes messages by `worldId` to the owning worker over a `MessagePort`.
- **Worker pool:** `AUTOMATON_WORKERS` (default: CPU count − 1, min 1). A world is assigned to the least-loaded worker when it loads.
- **`WorldRuntime`** (one per loaded world, inside a worker): tick loop, simulation state, occupancy map, players + area of interest, persistence hooks. No shared state between worlds.
- **Lifecycle:** `(none) → ACTIVE` on first join; `ACTIVE → IDLE` after `AUTOMATON_IDLE_UNLOAD_MINUTES` (default 10) without players (state saved, `lastTickAt` + measured rates stored); `IDLE → ACTIVE` on join (catch-up runs first); `→ ARCHIVED` (read-only) manually or at `archiveAt`; `→ DELETED` only by admin. Sandboxes idle longer than `AUTOMATON_SANDBOX_TTL_DAYS` (default 30) are deleted by a daily job.
- **Limits:** `AUTOMATON_MAX_LOADED_WORLDS` (refuse new loads beyond, message on start screen), `rules.maxPlayers`, world radius, per-player build rate limit (default 10 actions/s), max entities per world (default 20 000), max inbound message size (64 KiB).
- **Persistence:** MongoDB when `MONGODB_URL` is set, otherwise in-memory (dev only, lost on restart).

| Collection | Content |
|---|---|
| `automaton_worlds` | `_id` (worldId), type, assignment, template, seed, rules, status, `archiveAt?`, createdAt, lastActiveAt, lastTickAt, measuredRates |
| `automaton_entities` | worldId, entityId, kind, cell `{x,y,z}`, rotation, owner, config, region key — written in batches (≤ 2 s after change) |
| `automaton_sim_state` | worldId, region key, serialized belt contents / machine buffers / network storage — every 30 s and on unload |
| `automaton_players` | worldId, username, position, inventory, lastSeen |
| `automaton_metrics` | worldId, owner, resource, per-minute delivery buckets (for throughput checks), TTL 7 days |

Terrain and deposits are **never stored** — they are a pure function of `(template, seed)`.

### Internal world-server API (backend only)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/internal/worlds?ids=…` | status + players for the start screen |
| `GET` | `/internal/worlds` | admin list (all worlds) |
| `POST` | `/internal/worlds/:id/query` | evaluate a `WorldQuery` (body: query + caller identity) |
| `POST` | `/internal/worlds/:id/reset` | delete entities, sim state, metrics, players |
| `POST` | `/internal/worlds/:id/status` | `{ status: "active" \| "readonly", archiveAt? }` |
| `POST` | `/internal/worlds/:id/kick` | `{ username }` |
| `DELETE` | `/internal/worlds/:id` | delete world |

All require `Authorization: Bearer $AUTOMATON_INTERNAL_TOKEN`. Admin routes in `backend/src/routes/admin.ts` (behind `AdminRoleMiddleware`) proxy to these.

## Terrain

- **Density:** `density(x, y, z) → int32` (negative = air, positive = solid), sampled on a 1 m lattice. Surface: 2D fractal noise heightfield; caves: 3D noise "worm" tunnels and chambers below `surface − 6`; bedrock floor at `y = −160`; build ceiling `y = +192`; world radius from `rules.worldRadius`.
- **Determinism:** noise uses integer lattice hashing (`Math.imul`-based mixing) and fixed-point (Q16.16) interpolation only — no `Math.sin`/`Math.pow`/floats in anything the server checks. Golden test vectors pin the output.
- **Chunks:** 32³ lattice points. The client generates and meshes chunks in a **terrain worker** (surface nets, normals from the density gradient), view distance 8 chunks horizontally. LOD (with skirts) is a later improvement. WebGPU compute meshing is an optional later optimization for visuals only.
- **Server use:** density sampling for placement validation and movement plausibility only; the server never meshes.
- **Movement:** capsule collision against the density field (client-predicted); server accepts positions within a speed/penetration tolerance and corrects otherwise.
- **Templates:** `temperate` (v1). A template = noise parameters + resource table (which deposits, depth weighting, purity distribution).

## Resources and deposits

- **Kinds:** registry entries `{ id, kind: "solid" | "fluid" | "gas" | "energy", … }` in `automaton-core` (`iron-ore`, `copper-ore`, `coal`, `water`, `crude-oil`, `natural-gas`, `steam`, `power`, …; final list in Stage 4/5 plans).
- **Deposits:** `ore-cluster` (solid), `well` (fluid), `vent` (gas, or energy for `geothermal`). Fields: `{ id, type, resourceId, position, purity: impure|normal|pure }` → rate multiplier 0.5 / 1 / 2.
- **Generation:** per 64 × 64 m region, seeded Poisson-disc sampling (RNG = hash(seed, rx, rz)); candidates on the surface and on cave floors (density sign change with air above); valid only with a flat extractor footprint (corner height spread ≤ 1 m) and clearance. Deeper candidates favour rarer resources. Deterministic ids `dep:<rx>:<rz>:<i>`.
- **Infinite.** Deposits never deplete and are indestructible anchors.

## Building

- **Grid:** integer cells (1 m), entity = `{ kind, cell, rotation (0–3), footprint (w,d,h), ports, owner, config }`.
- **Foundations** (4 × 4 × 1): valid if all four bottom corners have solid terrain within 2 m below and ≤ 50 % of the footprint volume is solid (foundations may sink into slopes).
- **Machines:** must rest fully on foundation tops; volume must be air (cave ceilings) and unoccupied. **Extractors** instead snap to a deposit.
- **Ownership:** entity owner = group (course/group worlds) or user (sandbox). Only the owner (or an admin) can remove or reconfigure.
- **Plots** (course worlds, `rules.plots.size`): each group gets a square plot, allocated on first build in deterministic ring order around spawn; building is allowed only inside the own plot. Deposits are distributed so every plot has a minimum resource set (template guarantees).
- Server validates every action against occupancy map, terrain, plot, ownership, rate limit.

## Simulation

- **Tick:** 20 Hz fixed, integer math (amounts in milli-units, positions in 1/256 cell). Per-world tick budget target ≤ 10 ms for 5 000 entities.
- **Storage:** structure-of-arrays (typed arrays) per entity kind; narrow core interface: `tick()`, `applyCommand(cmd)`, `serializeRegion(key)`, `loadRegion(key, data)`, `measureRates()`, `catchUp(dtTicks)`, `checksum(region)`.
- **Solids:** belts as **transport lines** (item gaps, O(1) per segment per tick), splitters/mergers, containers, machines (input buffers → crafting progress → output buffers), extractors, **sinks** (delivery terminals that record per-minute metrics per owner).
- **Energy:** grid = connected component of poles/wires; per tick compare supply and demand → satisfaction ratio; all consumers in the grid run at that ratio; batteries buffer. Generators consume solids/fluids/gas or use geothermal vents.
- **Fluids:** pipe network = connected component; producers, consumers, tanks; per tick a flow allocation limited by the network's bottleneck pipe tier; proportional sharing. No per-segment pressure.
- **Gases:** same solver, separate network type (never mixed), plus pressure = stored / volume; producers push only below their max pressure, consumers need a minimum pressure, compressors raise pressure between two networks.
- **Topology changes:** incremental connected-component updates (union-find; rebuild of the affected component on removal).
- **Recipes:** data table in core (inputs, outputs, duration, power), mixed kinds allowed; ports typed by kind.

## Networking

Binary WebSocket frames, little-endian, `u8` message type + payload. Protocol version in the hello; mismatch → close with a clear message.

| Direction | Messages |
|---|---|
| server → client | `welcome` (worldId, template, seed, rules, tick, your identity, protocol version), `playerJoined/Left`, `playerStates` (quantized positions/yaw, 10 Hz), `entitySnapshot` (region), `entityAdded/Removed/Updated`, `machineState` (on change), `regionChecksum` (every 5 s), `actionResult` (ack/reject with reason), `notice` (kick, readonly, server shutdown) |
| client → server | `move` (seq, position, velocity, yaw), `build` (seq, kind, cell, rotation, config), `remove` (seq, entityId), `configure` (seq, entityId, config), `subscribeRegions` (AOI) |

- **Area of interest:** regions of 64 × 64 m columns within view distance.
- **Items are never sent individually.** Clients run the same core simulation on subscribed regions for visuals; on checksum mismatch the client requests a fresh `entitySnapshot` + sim state for that region.
- Build/remove: client shows a ghost immediately, server confirms or rejects (`actionResult`).

## Catch-up

On unload the world stores measured per-entity rates over the last 60 s. On load with `dt = now − lastTickAt` (capped at `archiveAt` and `AUTOMATON_CATCHUP_MAX_DAYS`, default 14):

1. Build the production graph from measured rates.
2. Find the next event (a buffer/storage fills or empties, a fuel runs out); advance all inventories linearly to it.
3. Recompute rates for the affected subgraph (backpressure upstream, power satisfaction) and repeat until `dt` is consumed.

Cost is O(events), not O(ticks). **Catch-up never writes throughput metrics** — grading only uses live simulation. Property test: for steady factories, catch-up result ≈ full tick simulation over the same span (tolerance per buffer: ≤ 1 craft cycle).

## Grading and submission

- New step test type `WorldQuery` (`Environment.ts` union) with queries: `throughput` (resource, minPerMinute, windowMinutes), `entityCount` (entity, min, powered?), `stored` (resource, min), each with `scope: "own" | "world"` (`own` = caller's group in course worlds).
- `POST /api/game/:assignment/test` `{ worldId, stepIndex }` → backend checks access and `gradedWorldTypes`, calls `/internal/worlds/:id/query` per test, returns the same `TestResult` shape the normal assignment view uses.
- `POST /api/game/:assignment/submit` `{ worldId }` → runs all step checks, then `persister.SubmitUserEnvironment(username, groupNumber, assignment, [], [{ fileName: "automaton-report.json", fileContent }], bonusPoints)` — the existing submission storage and admin "Submission Overview" work unchanged. The report contains step results, world id, owner stats.

## Admin

New **"Worlds"** tab in `Administration.tsx`: list (type, assignment, status, players online, entities, last activity), reset, read-only/archive with optional `archiveAt`, kick, delete (with confirmation), join as spectator.

## Configuration (documented in `README.md`)

| Variable | Where | Default | Purpose |
|---|---|---|---|
| `AUTOMATON_SERVER_URL` | backend | unset | e.g. `http://localhost:3002`; unset → game assignments show "not available" |
| `AUTOMATON_INTERNAL_TOKEN` | backend + server | — (required on server) | shared secret backend ↔ server |
| `AUTOMATON_PORT` | server | `3002` | internal HTTP/WS port |
| `MONGODB_URL` | server | unset | persistence; unset → in-memory |
| `AUTOMATON_WORKERS` | server | CPUs − 1 | worker threads |
| `AUTOMATON_IDLE_UNLOAD_MINUTES` | server | `10` | unload empty worlds |
| `AUTOMATON_MAX_LOADED_WORLDS` | server | `50` | memory guard |
| `AUTOMATON_SANDBOX_TTL_DAYS` | server | `30` | sandbox cleanup |
| `AUTOMATON_CATCHUP_MAX_DAYS` | server | `14` | catch-up cap |

## Deployment

- **Local dev:** `cd automaton/server && npm run dev` (port 3002) next to backend (3001) and frontend (3000). Vite's existing `^/ws/.*` and `^/api/.*` proxies cover the new paths.
- **Docker Compose:** `automaton-server` service in `docker-compose.yml` / `docker-compose-build.yml`, own `automaton/server/Dockerfile`.
- **Helm:** `deployment-automaton-server.yaml` + `service-automaton-server.yaml` (ClusterIP only, never in the ingress), `automatonServer.enabled` value, **1 replica** (in-memory world state; the backend also runs `replicaCount: 1`).

## Security

- World server is never exposed publicly; only the backend reaches it (internal token + network placement).
- All authorization (course/group membership, admin) happens in the backend; the world server trusts only the internal hello.
- Every client action is validated server-side (bounds, occupancy, plot, ownership, rate limit, message size). Malformed frames close the connection.
- No secrets in logs; the internal token is never sent to the browser.

## Client

- **Renderer:** raw WebGPU (`@webgpu/types` dev-only), own minimal math utilities. Pipelines: terrain (per-chunk vertex buffers, triplanar colouring by slope/depth), instanced entities (one draw per kind), instanced belt items (positions computed from segment data), players. Caves: ambient darkness + player light.
- **Workers:** terrain worker (density + meshing, transferable `ArrayBuffer`s — **no `SharedArrayBuffer`**, which would require COOP/COEP headers that break Guacamole/WebApp embeds), sim worker (client-side replica of subscribed regions).
- **Input:** pointer lock, WASD/space/shift, build mode with grid-snapped ghost, rotate (R), remove (X), fullscreen toggle.
- **Overlays (MUI):** start screen (world list), HUD, build menu, inventory/machine panels, lab sheet drawer (same Markdown/Mermaid rendering as `Environment.tsx`), goals panel (steps + "Check"), submit dialog.
- **No WebGPU:** clear message naming supported browsers; no WebGL fallback in v1.
- **Budgets:** 60 fps at view distance 8 on an integrated GPU; chunk meshing ≤ 5 ms in the worker.

## Dependencies (need agreement per AGENTS.md)

| Package | Workspace | Kind | Why |
|---|---|---|---|
| `ws` | automaton/server | runtime | WS server (already used by backend) |
| `mongodb` | automaton/server | runtime | persistence (already used by backend) |
| `@webgpu/types` | frontend | dev | WebGPU typings |
| `vitest`, `@testing-library/react`, `jsdom` | frontend | dev | frontend tests as prescribed in AGENTS.md (no frontend test setup exists yet) |

No other new runtime dependencies. Noise, math, meshing, protocol codec are written in-repo.

## Testing

| Area | Where | What |
|---|---|---|
| core | `automaton/core/test` (jest) | noise/density golden vectors, mesher invariants (closed surface, no NaN), deposit generation determinism, protocol round-trip, placement rules, belt throughput exactness, recipe timing, power/fluid/gas solvers, catch-up vs. tick simulation |
| server | `automaton/server/test/unit` + `/integration` (jest, `@shelf/jest-mongodb`) | worker routing, lifecycle (idle unload, reload), internal API auth, Mongo store |
| backend | `backend/test/unit` | loader validation for `game`, `worldAccess`, `GameHandler` auth/forwarding (mocked upstream), game routes |
| frontend | `frontend` (vitest + RTL) | start screen, overlays, WebGPU-unavailable message; canvas/renderer skipped (jsdom) |
| manual | running stack | two users in two browsers see each other, build, produce; verified per stage |

## Implementation stages

Each stage is one PR into `feature/lax-trauty-automaton` (later merged towards `develop`/`master`), with its own plan:

1. `docs/superpowers/plans/2026-11-13-automaton-stage-1-platform.md` — task type, packages, world server skeleton, proxy, start screen, presence.
2. `…-stage-2-terrain.md` — deterministic terrain with caves, meshing, rendering, movement, deposits.
3. `…-stage-3-building.md` — grid, foundations, placement, ownership, plots, entity persistence.
4. `…-stage-4-solids.md` — simulation core, extractors, belts, machines, sinks, client replica.
5. `…-stage-5-networks.md` — energy, fluids, gases.
6. `…-stage-6-grading-ops.md` — `WorldQuery`, submit, catch-up, admin tab, archiving, deployment.

## Risks

| Risk | Mitigation |
|---|---|
| ts-node does not compile the workspace-linked core package | Stage 1 Task 1 verifies; fallback: tsconfig `paths` or a `tsc` build of core |
| Non-determinism client/server (float math) | integer/fixed-point only in core; golden vectors; checksums + resync at runtime |
| WebGPU availability on student machines (esp. Linux Firefox) | explicit detection message; document supported browsers in the lab sheet |
| Simulation cost in large course worlds | SoA storage, transport lines, entity cap, per-world tick budget metric |
| Scope | six stages, each independently useful and reviewable |

## AI usage (for the PR description)

- **Tool category:** agentic coding CLI (chat + repository access).
- **Use case:** architecture discussion, spec and plan writing.
- **Manual rework:** design decisions taken by the author in chat (task type, static terrain, fixed deposits, world types, catch-up, archiving, naming); documents generated and to be reviewed.
- **What did not work:** initial recommendations (voxel terrain, `Game` terminal tab inside the 50/50 assignment view, editable terrain) were revised after the author clarified goals; layout constraints of `Environment.tsx` were only identified after reading the view.
