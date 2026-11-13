# Automaton Stage 1 — Platform Plumbing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A game assignment (`type: "game"`) appears in the assignment list with a "Play" button, opens a full-area `/game/:assignment` view, shows a start screen with the allowed worlds, and connects through the backend proxy to a running `automaton-server`. Two users in the same world see each other move on a flat placeholder plane. No terrain, building or simulation yet.

**Architecture:** see `docs/superpowers/specs/2026-11-13-automaton-design.md` (sections *Architecture*, *Task type*, *World types and ids*, *Access flow*, *World server*).

**Tech Stack:** TypeScript (CommonJS for backend/server, ESM/Vite for frontend), ts-node, `ws`, `worker_threads`, Jest + ts-jest, React 18 + MUI, raw WebGPU, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-13-automaton-design.md`

## Global Constraints

- Branch: `feature/lax-trauty-automaton`. Conventional Commits, English only.
- New runtime deps only `ws` and `mongodb` in `automaton/server` (already used by backend); dev deps `@webgpu/types`, `vitest`, `@testing-library/react`, `jsdom` in frontend. **Get agreement before adding** (AGENTS.md).
- `automaton/core` must not import Node or DOM APIs (enforced by its `tsconfig` `lib: ["ES2022"]`, `types: []`).
- No changes to the deploy path of existing assignment types; no reformatting of unrelated files.
- Gates at the end of every task that touches a workspace: `npm test`, `npm run lint`, `npm run type-check` (backend, core, server); `npm run lint`, `npm run build`, `npx vitest run` (frontend). Quote the output.

## Review Focus

- **Authorization:** a user must never reach a world id that `worldAccess` did not return for them — enforced again in `GameHandler` (not only in the REST list). Pinned by `GameHandler` unit test (Task 7).
- **Internal token:** never sent to the browser, never logged. Pinned by grep in Task 9 and test of the upstream hello (Task 7).
- **Existing assignments unaffected:** loader count test changes from 26 to 27 only because of the new example assignment; `/api/environment/create` rejects `type: "game"` (Task 3).
- **Workspace linking:** ts-node must compile `@learn-sdn-hub/automaton-core` sources through the workspace symlink (Task 1 verifies before anything depends on it).

---

### Task 1: Workspace scaffolding for `automaton/core` and `automaton/server`

**Files:**
- Create: `automaton/core/package.json`, `automaton/core/tsconfig.json`, `automaton/core/jest.config.cjs`, `automaton/core/eslint.config.mjs`, `automaton/core/src/index.ts`, `automaton/core/test/smoke.test.ts`
- Create: `automaton/server/package.json`, `automaton/server/tsconfig.json`, `automaton/server/jest.config.cjs`, `automaton/server/eslint.config.mjs`, `automaton/server/src/main.ts`
- Modify: `package.json` (root `workspaces`)

- [ ] **Step 1:** Add `"automaton/core"` and `"automaton/server"` to root `workspaces`.
- [ ] **Step 2:** `automaton/core/package.json`: name `@learn-sdn-hub/automaton-core`, `"main": "src/index.ts"`, `"types": "src/index.ts"`, scripts `test`, `lint`, `type-check` mirroring `backend/package.json`. `tsconfig.json`: `strict`, `target ES2020`, `lib ["ES2022"]`, `types []` (no Node/DOM), `noUnusedLocals`.
- [ ] **Step 3:** `src/index.ts` exports `export const AUTOMATON_PROTOCOL_VERSION = 1;`. Smoke test asserts it equals 1.
- [ ] **Step 4:** `automaton/server/package.json`: name `@learn-sdn-hub/automaton-server`, deps `ws`, `mongodb` (same versions as backend), `@learn-sdn-hub/automaton-core: "*"`; scripts `start: ts-node src/main.ts`, `dev: nodemon src/main.ts`, `test`, `test:integration`, `lint`, `type-check`. ESLint config copied from backend's.
- [ ] **Step 5:** `src/main.ts` imports `AUTOMATON_PROTOCOL_VERSION` from the core package and logs it.
- [ ] **Step 6: Verify workspace linking under ts-node**

Run: `npm install && cd automaton/server && npx ts-node src/main.ts`
Expected: prints `automaton protocol 1` and exits. If ts-node refuses to compile the core `.ts` (ignored as `node_modules`), add `"ts-node": { "ignore": ["/node_modules/(?!@learn-sdn-hub/)"] }` to `automaton/server/tsconfig.json` and re-run. Record the outcome in the PR.

- [ ] **Step 7:** Gates in both packages (`npm test`, `npm run lint`, `npm run type-check`).
- [ ] **Step 8: Commit** `chore(automaton): scaffold core and server workspaces`

### Task 2: Core — world ids and protocol v1 (presence)

**Files:**
- Create: `automaton/core/src/worldId.ts`, `automaton/core/src/protocol/{types.ts,codec.ts,index.ts}`
- Test: `automaton/core/test/worldId.test.ts`, `automaton/core/test/protocol.test.ts`

**Interfaces:**
- `type WorldType = "course" | "group" | "sandbox"`
- `formatWorldId({ type, key, assignment }): string` → `course:<courseId>:<assignment>` etc.; `parseWorldId(id): { type, key, assignment } | null` (rejects unknown types, empty parts, `:` inside key).
- Messages (binary, little-endian, `u8` type tag): `Hello{protocolVersion}`, `Welcome{protocolVersion, worldId, playerId, tick}`, `Move{seq, x, y, z, yaw}` (positions `i32` in 1/256 m, yaw `u16`), `PlayerStates{tick, entries[{playerId, x, y, z, yaw}]}`, `PlayerJoined{playerId, username}`, `PlayerLeft{playerId}`, `Notice{code, text}`.
- `encode(msg): Uint8Array`, `decode(bytes): Message` (throws `ProtocolError` on unknown tag, truncated payload, oversize > 64 KiB).

- [ ] **Step 1:** Write failing tests: id round-trip for all three types; rejection cases; encode/decode round-trip for every message; truncated buffer throws; unknown tag throws; UTF-8 usernames.
- [ ] **Step 2:** Implement with `DataView` + `TextEncoder`/`TextDecoder` (available in Node and browsers without importing either platform's types — declare minimal global types in `src/globals.d.ts` if `lib` lacks them).
- [ ] **Step 3:** Gates (core). **Commit** `feat(automaton): world ids and presence protocol`

### Task 3: Backend — task type `"game"` and loader validation

**Files:**
- Modify: `backend/src/Environment.ts` (`EnvironmentType`, `EnvironmentDescription.game?`, `GameDescription`, `AssignmentStepTestWorldQuery` in the test union)
- Modify: `backend/src/Configuration.ts` (`loadAssignmentEnvironments`: game validation)
- Modify: `backend/src/routes/environment.ts` (`POST /create` rejects `type: "game"` with 400)
- Create: `backend/src/assignments/environments/automaton-intro.ts`, `backend/src/assignments/automaton-intro.md`
- Create: `backend/test/unit/fixtures/loader/game-*/…` (invalid game fixtures)
- Modify: `backend/test/unit/assignment-loader.test.ts` (count 26 → 27, new cases)
- Modify: `frontend/src/hooks.ts` (`EnvironmentSchema` adds `"game"`)

**Interfaces:**

```ts
export interface GameDescription {
  template: string;
  seed: number;
  worldTypes: Array<"course" | "group" | "sandbox">;
  gradedWorldTypes?: Array<"course" | "group" | "sandbox">;
  rules?: { maxPlayers?: number; plots?: { size: number }; worldRadius?: number };
}
```

`WorldQuery` test type is declared now (so loader validation is complete) but only evaluated in Stage 6.

- [ ] **Step 1:** Failing loader tests: valid game fixture loads; game without `game` block throws (message names file); game with non-empty `terminals` throws; game with `isExam` throws; game with `assignmentLabSheetLocation: "instance"` throws; game with `SSHCommand` step throws; normal type with `game` block throws; normal type with `WorldQuery` test throws; empty `worldTypes` throws.
- [ ] **Step 2:** Implement validation as a separate exported function `validateGameAssignment(file, env)` called from the loader (keeps the loader readable; unit-testable).
- [ ] **Step 3:** Example assignment `Automaton-Intro` (template `temperate`, seed `4711`, all three world types, no steps yet) + short lab sheet explaining controls. Update count test to 27.
- [ ] **Step 4:** `POST /api/environment/create` returns 400 `"Game assignments are started from the game view"` for `type: "game"`; unit/route test if route tests exist, otherwise covered by manual check in Task 9.
- [ ] **Step 5:** Gates (backend, frontend build). **Commit** `feat(backend): game task type with loader validation`

### Task 4: Backend — `worldAccess` (pure)

**Files:**
- Create: `backend/src/game/worldAccess.ts`
- Test: `backend/test/unit/worldAccess.test.ts`

**Interfaces:**

```ts
export interface WorldAccessInput {
  user: { username: string; groupNumber: number; role?: string; courses: string[] };
  assignment: string;
  game: GameDescription;
  coursesWithAssignment: string[]; // course ids whose assignment list contains `assignment`
  mongoAvailable: boolean;
}
export interface AllowedWorld { worldId: string; type: WorldType; label: string; graded: boolean }
export function resolveAllowedWorlds(input: WorldAccessInput): AllowedWorld[];
export function isWorldAllowed(input: WorldAccessInput, worldId: string): boolean;
```

Rules: course worlds for `user.courses ∩ coursesWithAssignment` (fallback `course:default:<a>` when `!mongoAvailable`); group world for `user.groupNumber`; sandbox for `user.username`; only types listed in `game.worldTypes`; admins: `isWorldAllowed` true for any well-formed id of this assignment.

- [ ] **Step 1:** Failing tests: each type on/off; user in two matching courses → two course worlds; user in no matching course → no course world; memory fallback; admin override; foreign group/sandbox ids rejected; ids of another assignment rejected; malformed ids rejected.
- [ ] **Step 2:** Implement using `formatWorldId`/`parseWorldId` from core (verifies backend → core import works under ts-node and jest; if jest needs it, add `moduleNameMapper`/`transformIgnorePatterns` for `@learn-sdn-hub/`).
- [ ] **Step 3:** Gates. **Commit** `feat(backend): resolve allowed automaton worlds`

### Task 5: World server — host, worker pool, presence runtime

**Files:**
- Create: `automaton/server/src/config.ts` (env parsing, fail fast on missing `AUTOMATON_INTERNAL_TOKEN`)
- Create: `automaton/server/src/WorldHost.ts` (main thread: world registry, worker assignment, connection routing)
- Create: `automaton/server/src/WorkerPool.ts`, `automaton/server/src/worker/worldWorker.ts`
- Create: `automaton/server/src/WorldRuntime.ts` (presence: players, 20 Hz tick, 10 Hz `PlayerStates` broadcast)
- Create: `automaton/server/src/store/{WorldStore.ts,MemoryWorldStore.ts,MongoWorldStore.ts}` (`automaton_worlds` only in this stage)
- Create: `automaton/server/src/http.ts` (internal HTTP: `GET /internal/worlds?ids=`; bearer token check)
- Modify: `automaton/server/src/main.ts`
- Test: `automaton/server/test/unit/{config,WorldRuntime,WorldHost,http}.test.ts`, `automaton/server/test/integration/MongoWorldStore.test.ts`

**Interfaces:**
- Internal WS endpoint `/internal/ws`; first frame = JSON hello `{ token, worldId, template, seed, rules, username, groupNumber, role }`; afterwards binary protocol frames.
- `WorldStore`: `getOrCreate(meta) → WorldMeta`, `get(ids) → WorldMeta[]`, `markActive(id)`, `markIdle(id, lastTickAt)`.
- Lifecycle: load on first connection; unload after `AUTOMATON_IDLE_UNLOAD_MINUTES` with no players.

- [ ] **Step 1:** Failing tests: config rejects missing token; wrong token → WS closed with 4401 / HTTP 401; two connections to the same world land in the same runtime and receive each other's `PlayerJoined` and `PlayerStates`; connections to different worlds are isolated; world unloads after idle timeout (fake timers) and `markIdle` is called; `GET /internal/worlds?ids=` returns status + player counts; protocol version mismatch → `Notice` + close.
- [ ] **Step 2:** Implement. Unit tests run `WorldRuntime` in-process (no workers); one test spins a real `WorkerPool` with 1 worker to cover the `MessagePort` routing.
- [ ] **Step 3:** Integration test for `MongoWorldStore` with `@shelf/jest-mongodb` (same setup as backend's integration config).
- [ ] **Step 4:** Gates (server, incl. `npm run test:integration`). **Commit** `feat(automaton): world server with worker pool and presence`

### Task 6: Backend — `WorldServerClient` and game REST routes

**Files:**
- Create: `backend/src/game/WorldServerClient.ts` (internal HTTP client; reads `AUTOMATON_SERVER_URL`, `AUTOMATON_INTERNAL_TOKEN`)
- Create: `backend/src/routes/game.ts`
- Modify: `backend/src/Api.ts` (`router.use("/api/game", gameRoutes(persister))`)
- Modify: `README.md` (new env vars `AUTOMATON_SERVER_URL`, `AUTOMATON_INTERNAL_TOKEN`; section "Automaton game server")
- Test: `backend/test/unit/gameRoutes.test.ts` (supertest, mocked client and persister)

**Interfaces:**
- `GET /api/game/:assignment/worlds` (auth) → `{ available: boolean, worlds: Array<AllowedWorld & { status, playersOnline }> }`. `available: false` when `AUTOMATON_SERVER_URL` is unset or the server is unreachable (200, so the UI can explain it). 404 for unknown or non-game assignments.

- [ ] **Step 1:** Failing tests: unknown assignment 404; normal assignment 404; unset URL → `available: false`; status merged; user only sees allowed worlds.
- [ ] **Step 2:** Implement; course membership from `persister.GetUserAccount` + `GetAllCourses` (verify both exist on `MemoryPersister` and `MongoDBPersister`).
- [ ] **Step 3:** Gates. **Commit** `feat(backend): automaton world list route`

### Task 7: Backend — `GameHandler` WebSocket proxy

**Files:**
- Create: `backend/src/websocket/GameHandler.ts`
- Modify: `backend/src/websocket/index.ts` (matcher `/ws/game/:assignment/:worldId`)
- Test: `backend/test/unit/GameHandler.test.ts`

- [ ] **Step 1:** Failing tests (mock upstream `ws` server): disallowed world id → close without upstream connection; allowed → upstream hello contains token, world params from the assignment's `game` block and the JWT identity (never fields supplied by the browser); frames are forwarded both ways byte-identically; closing either side closes the other; upstream unreachable → browser receives text error and close.
- [ ] **Step 2:** Implement. The handler receives the already-verified `TokenPayload` from `index.ts` (same auth handshake as other routes); it never forwards the JWT upstream.
- [ ] **Step 3:** Gates. **Commit** `feat(backend): proxy automaton websocket to world server`

### Task 8: Frontend — assignment list, game route, start screen, presence view

**Files:**
- Create: `frontend/src/components/assignments/GameAssignments.tsx` (section "Automaton" with "Play" → `navigate("/game/" + name)`)
- Modify: `frontend/src/views/Assignments.tsx` (render `GameAssignments` for `type === "game"`)
- Modify: `frontend/src/Routings.tsx` (lazy route `/game/:assignment`)
- Create: `frontend/src/views/Game.tsx`
- Create: `frontend/src/automaton/net/GameConnection.ts` (WS with auth handshake, core codec, reconnect with backoff)
- Create: `frontend/src/automaton/ui/{StartScreen.tsx,NoWebGpu.tsx,LabSheetDrawer.tsx}`
- Create: `frontend/src/automaton/render/{gpu.ts,camera.ts,math.ts,PresenceRenderer.ts}` (device setup, flat plane, one box per player)
- Create: `frontend/src/automaton/input/FirstPersonControls.ts` (pointer lock, WASD, mouse look)
- Create: `frontend/vitest.config.ts`, `frontend/src/automaton/ui/__tests__/StartScreen.test.tsx`, `NoWebGpu.test.tsx`
- Modify: `frontend/package.json` (dev deps, `"test": "vitest run"`), `frontend/tsconfig*.json` (`@webgpu/types`)

- [ ] **Step 1:** Vitest setup (jsdom). Failing tests: start screen lists worlds with type/status/players and calls `onJoin(worldId)`; single world → auto-join; `available: false` → explanatory message; `navigator.gpu` undefined → `NoWebGpu` message.
- [ ] **Step 2:** Implement UI and connection; renderer behind a `canvas` ref, not rendered in tests.
- [ ] **Step 3:** Lab sheet drawer reuses `GET /api/environment/:environment/assignment` and the same Markdown/Mermaid components as `Environment.tsx` (import, do not copy).
- [ ] **Step 4:** Gates (frontend: lint, build, vitest). **Commit** `feat(frontend): automaton game view with start screen and presence`

### Task 9: Local run, compose service, end-to-end verification

**Files:**
- Create: `automaton/server/Dockerfile`
- Modify: `docker-compose.yml`, `docker-compose-build.yml` (service `automaton-server`, internal port 3002, not published)
- Modify: `README.md` (local dev: three processes)

- [ ] **Step 1:** Start server (`AUTOMATON_INTERNAL_TOKEN=dev npm run dev` in `automaton/server`), backend (`AUTOMATON_SERVER_URL=http://localhost:3002 AUTOMATON_INTERNAL_TOKEN=dev …`), frontend.
- [ ] **Step 2:** Manual check with two users in two browser windows: both see "Automaton-Intro" with "Play"; start screen lists course/group/sandbox; joining the group world shows the other player's box moving; joining different sandboxes isolates them; `/api/environment/create` with `Automaton-Intro` returns 400; a normal assignment can be deployed while playing.
- [ ] **Step 3:** `grep -rn "AUTOMATON_INTERNAL_TOKEN" frontend/` → no hits; backend/server logs contain no token.
- [ ] **Step 4:** All gates, quote output in the PR, including AI-usage note (see spec).
- [ ] **Step 5: Commit** `chore(automaton): compose service and local run docs`

## Acceptance Criteria

- All gates green in backend, core, server, frontend.
- Manual two-user check (Task 9 Step 2) passes and is documented with screenshots in the PR.
- Existing assignments and their deploy path behave unchanged.
