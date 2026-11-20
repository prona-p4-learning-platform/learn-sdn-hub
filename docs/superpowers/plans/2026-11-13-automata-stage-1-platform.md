# Automata Stage 1 — Platform Plumbing Implementation Plan

**Goal:** A game assignment (`type: "game"`) appears in the assignment list with a "Play" button, opens a full-area `/game/:assignment` view, shows a start screen with the allowed worlds, and connects through the backend proxy to a running `automata-server`. Two users in the same world see each other move on a flat placeholder plane. No terrain, building or simulation yet.

**Architecture:** see `docs/superpowers/specs/2026-11-13-automata-design.md` (sections *Architecture*, *Task type*, *World types and ids*, *Access flow*, *World server*).

**Tech Stack:** TypeScript (CommonJS for backend/server, ESM/Vite for frontend), ts-node, `ws`, `worker_threads`, Jest + ts-jest, React 18 + MUI, raw WebGPU, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-13-automata-design.md`

## Global Constraints

- Branch: `feature/lax-trauty-automata`. Conventional Commits, English only.
- New runtime deps only `ws` and `mongodb` in `automata/server` (already used by backend); dev deps `@webgpu/types`, `vitest`, `@testing-library/react`, `jsdom` in frontend. **Get agreement before adding** (AGENTS.md).
- `automata/core` must not import Node or DOM APIs (enforced by its `tsconfig` `lib: ["ES2022"]`, `types: []`).
- No changes to the deploy path of existing assignment types; no reformatting of unrelated files.
- Gates at the end of every task that touches a workspace: `npm test`, `npm run lint`, `npm run type-check` (backend, core, server); `npm run lint`, `npm run build`, `npx vitest run` (frontend). Quote the output.

## Review Focus

- **Authorization:** a user must never reach a world id that `worldAccess` did not return for them — enforced again in `GameHandler` (not only in the REST list). Pinned by `GameHandler` unit test (Task 7).
- **Internal token:** never sent to the browser, never logged. Pinned by grep in Task 9 and test of the upstream hello (Task 7).
- **Existing assignments unaffected:** loader count test changes from 26 to 27 only because of the new example assignment; `/api/environment/create` rejects `type: "game"` (Task 3).
- **Workspace linking:** ts-node must compile `@learn-sdn-hub/automata-core` sources through the workspace symlink (Task 1 verifies before anything depends on it).

---

### Task 1: Workspace scaffolding for `automata/core` and `automata/server`

**Files:**
- Create: `automata/core/package.json`, `automata/core/tsconfig.json`, `automata/core/jest.config.cjs`, `automata/core/eslint.config.mjs`, `automata/core/src/index.ts`, `automata/core/test/smoke.test.ts`
- Create: `automata/server/package.json`, `automata/server/tsconfig.json`, `automata/server/jest.config.cjs`, `automata/server/eslint.config.mjs`, `automata/server/src/main.ts`
- Modify: `package.json` (root `workspaces`)

- [ ] **Step 1:** Add `"automata/core"` and `"automata/server"` to root `workspaces`.
- [ ] **Step 2:** `automata/core/package.json`: name `@learn-sdn-hub/automata-core`, `"main": "src/index.ts"`, `"types": "src/index.ts"`, scripts `test`, `lint`, `type-check` mirroring `backend/package.json`. `tsconfig.json`: `strict`, `target ES2020`, `lib ["ES2022"]`, `types []` (no Node/DOM), `noUnusedLocals`.
- [ ] **Step 3:** `src/index.ts` exports `export const AUTOMATA_PROTOCOL_VERSION = 1;`. Smoke test asserts it equals 1.
- [ ] **Step 4:** `automata/server/package.json`: name `@learn-sdn-hub/automata-server`, deps `ws`, `mongodb` (same versions as backend), `@learn-sdn-hub/automata-core: "*"`; scripts `start: ts-node src/main.ts`, `dev: nodemon src/main.ts`, `test`, `test:integration`, `lint`, `type-check`. ESLint config copied from backend's.
- [ ] **Step 5:** `src/main.ts` imports `AUTOMATA_PROTOCOL_VERSION` from the core package and logs it.
- [ ] **Step 6: Verify workspace linking under ts-node**

Run: `npm install && cd automata/server && npx ts-node src/main.ts`
Expected: prints `automata protocol 1` and exits. If ts-node refuses to compile the core `.ts` (ignored as `node_modules`), add `"ts-node": { "ignore": ["/node_modules/(?!@learn-sdn-hub/)"] }` to `automata/server/tsconfig.json` and re-run. Record the outcome in the PR.

- [ ] **Step 7:** Gates in both packages (`npm test`, `npm run lint`, `npm run type-check`).
- [ ] **Step 8: Commit** `chore(automata): scaffold core and server workspaces`

### Task 2: Core — world ids and protocol v1 (presence)

**Files:**
- Create: `automata/core/src/worldId.ts`, `automata/core/src/protocol/{types.ts,codec.ts,index.ts}`
- Test: `automata/core/test/worldId.test.ts`, `automata/core/test/protocol.test.ts`

**Interfaces:**
- `type WorldType = "course" | "group" | "sandbox"`
- `formatWorldId({ type, key, assignment }): string` → `course:<courseId>:<assignment>` etc.; `parseWorldId(id): { type, key, assignment } | null` (rejects unknown types, empty parts, `:` inside key).
- Messages (binary, little-endian, `u8` type tag): `Hello{protocolVersion}`, `Welcome{protocolVersion, worldId, playerId, tick}`, `Move{seq, x, y, z, yaw}` (positions `i32` in 1/256 m, yaw `u16`), `PlayerStates{tick, entries[{playerId, x, y, z, yaw}]}`, `PlayerJoined{playerId, username}`, `PlayerLeft{playerId}`, `Notice{code, text}`.
- `encode(msg): Uint8Array`, `decode(bytes): Message` (throws `ProtocolError` on unknown tag, truncated payload, oversize > 64 KiB).

- [ ] **Step 1:** Write failing tests: id round-trip for all three types; rejection cases; encode/decode round-trip for every message; truncated buffer throws; unknown tag throws; UTF-8 usernames.
- [ ] **Step 2:** Implement with `DataView` + `TextEncoder`/`TextDecoder` (available in Node and browsers without importing either platform's types — declare minimal global types in `src/globals.d.ts` if `lib` lacks them).
- [ ] **Step 3:** Gates (core). **Commit** `feat(automata): world ids and presence protocol`

### Task 3: Backend — task type `"game"` and loader validation

**Files:**
- Modify: `backend/src/Environment.ts` (`EnvironmentType`, `EnvironmentDescription.game?`, `GameDescription`, `AssignmentStepTestWorldQuery` in the test union)
- Modify: `backend/src/Configuration.ts` (`loadAssignmentEnvironments`: game validation)
- Modify: `backend/src/routes/environment.ts` (`POST /create` rejects `type: "game"` with 400)
- Create: `backend/src/assignments/environments/automata-intro.ts`, `backend/src/assignments/automata-intro.md`
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
- [ ] **Step 3:** Example assignment `Automata-Intro` (template `temperate`, seed `4711`, all three world types, no steps yet) + short lab sheet explaining controls. Update count test to 27.
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
- [ ] **Step 3:** Gates. **Commit** `feat(backend): resolve allowed automata worlds`

### Task 5: World server — host, worker pool, presence runtime

**Files:**
- Create: `automata/server/src/config.ts` (env parsing, fail fast on missing `AUTOMATA_INTERNAL_TOKEN`)
- Create: `automata/server/src/WorldHost.ts` (main thread: world registry, worker assignment, connection routing)
- Create: `automata/server/src/WorkerPool.ts`, `automata/server/src/worker/worldWorker.ts`
- Create: `automata/server/src/WorldRuntime.ts` (presence: players, 20 Hz tick, 10 Hz `PlayerStates` broadcast)
- Create: `automata/server/src/store/{WorldStore.ts,MemoryWorldStore.ts,MongoWorldStore.ts}` (`automata_worlds` only in this stage)
- Create: `automata/server/src/http.ts` (internal HTTP: `GET /internal/worlds?ids=`; bearer token check)
- Modify: `automata/server/src/main.ts`
- Test: `automata/server/test/unit/{config,WorldRuntime,WorldHost,http}.test.ts`, `automata/server/test/integration/MongoWorldStore.test.ts`

**Interfaces:**
- Internal WS endpoint `/internal/ws`; first frame = JSON hello `{ token, worldId, template, seed, rules, username, groupNumber, role }`; afterwards binary protocol frames.
- `WorldStore`: `getOrCreate(meta) → WorldMeta`, `get(ids) → WorldMeta[]`, `markActive(id)`, `markIdle(id, lastTickAt)`.
- Lifecycle: load on first connection; unload after `AUTOMATA_IDLE_UNLOAD_MINUTES` with no players.

- [ ] **Step 1:** Failing tests: config rejects missing token; wrong token → WS closed with 4401 / HTTP 401; two connections to the same world land in the same runtime and receive each other's `PlayerJoined` and `PlayerStates`; connections to different worlds are isolated; world unloads after idle timeout (fake timers) and `markIdle` is called; `GET /internal/worlds?ids=` returns status + player counts; protocol version mismatch → `Notice` + close.
- [ ] **Step 2:** Implement. Unit tests run `WorldRuntime` in-process (no workers); one test spins a real `WorkerPool` with 1 worker to cover the `MessagePort` routing.
- [ ] **Step 3:** Integration test for `MongoWorldStore` with `@shelf/jest-mongodb` (same setup as backend's integration config).
- [ ] **Step 4:** Gates (server, incl. `npm run test:integration`). **Commit** `feat(automata): world server with worker pool and presence`

### Task 6: Backend — `WorldServerClient` and game REST routes

**Files:**
- Create: `backend/src/game/WorldServerClient.ts` (internal HTTP client; reads `AUTOMATA_SERVER_URL`, `AUTOMATA_INTERNAL_TOKEN`)
- Create: `backend/src/routes/game.ts`
- Modify: `backend/src/Api.ts` (`router.use("/api/game", gameRoutes(persister))`)
- Modify: `README.md` (new env vars `AUTOMATA_SERVER_URL`, `AUTOMATA_INTERNAL_TOKEN`; section "Automata game server")
- Test: `backend/test/unit/gameRoutes.test.ts` (supertest, mocked client and persister)

**Interfaces:**
- `GET /api/game/:assignment/worlds` (auth) → `{ available: boolean, worlds: Array<AllowedWorld & { status, playersOnline }> }`. `available: false` when `AUTOMATA_SERVER_URL` is unset or the server is unreachable (200, so the UI can explain it). 404 for unknown or non-game assignments.

- [ ] **Step 1:** Failing tests: unknown assignment 404; normal assignment 404; unset URL → `available: false`; status merged; user only sees allowed worlds.
- [ ] **Step 2:** Implement; course membership from `persister.GetUserAccount` + `GetAllCourses` (verify both exist on `MemoryPersister` and `MongoDBPersister`).
- [ ] **Step 3:** Gates. **Commit** `feat(backend): automata world list route`

### Task 7: Backend — `GameHandler` WebSocket proxy

**Files:**
- Create: `backend/src/websocket/GameHandler.ts`
- Modify: `backend/src/websocket/index.ts` (matcher `/ws/game/:assignment/:worldId`)
- Test: `backend/test/unit/GameHandler.test.ts`

- [ ] **Step 1:** Failing tests (mock upstream `ws` server): disallowed world id → close without upstream connection; allowed → upstream hello contains token, world params from the assignment's `game` block and the JWT identity (never fields supplied by the browser); frames are forwarded both ways byte-identically; closing either side closes the other; upstream unreachable → browser receives text error and close.
- [ ] **Step 2:** Implement. The handler receives the already-verified `TokenPayload` from `index.ts` (same auth handshake as other routes); it never forwards the JWT upstream.
- [ ] **Step 3:** Gates. **Commit** `feat(backend): proxy automata websocket to world server`

### Task 8: Frontend — assignment list, game route, start screen, presence view

**Files:**
- Create: `frontend/src/components/assignments/GameAssignments.tsx` (section "Automata" with "Play" → `navigate("/game/" + name)`)
- Modify: `frontend/src/views/Assignments.tsx` (render `GameAssignments` for `type === "game"`)
- Modify: `frontend/src/Routings.tsx` (lazy route `/game/:assignment`)
- Create: `frontend/src/views/Game.tsx`
- Create: `frontend/src/automata/net/GameConnection.ts` (WS with auth handshake, core codec, reconnect with backoff)
- Create: `frontend/src/automata/ui/{StartScreen.tsx,NoWebGpu.tsx,LabSheetDrawer.tsx}`
- Create: `frontend/src/automata/render/gpu.ts` (adapter/device/context setup, canvas resize to CSS size × `devicePixelRatio`)
- Create: `frontend/src/automata/render/Renderer.ts` (frame loop; draws a list of `RenderLayer`s — `{ draw(pass), destroy() }` — one per pipeline; later stages add terrain, entities, belt items as layers)
- Create: `frontend/src/automata/render/layers/{TriangleLayer.ts,PresenceLayer.ts}`, `frontend/src/automata/render/shaders/*.wgsl` (loaded with Vite `?raw`)
- Create: `frontend/src/automata/render/{camera.ts,math.ts}` (flat plane, one box per player)
- Create: `frontend/src/automata/input/FirstPersonControls.ts` (pointer lock, WASD, mouse look)
- Create: `frontend/vitest.config.ts`, `frontend/src/automata/ui/__tests__/StartScreen.test.tsx`, `NoWebGpu.test.tsx`
- Modify: `frontend/package.json` (dev deps, `"test": "vitest run"`), `frontend/tsconfig*.json` (`@webgpu/types`)

- [x] **Step 0: WebGPU smoke test (done first, before Task 1 — frontend only, no dependency on Tasks 1–7).** Add `@webgpu/types`, `gpu.ts`, `Renderer.ts`, `TriangleLayer.ts` + `shaders/triangle.wgsl`, `NoWebGpu.tsx`, `views/Game.tsx` (full-area canvas; stops the frame loop and destroys layers on unmount) and the `/game/:assignment` route. Done when a coloured triangle renders and keeps its aspect on resize, a browser without WebGPU shows `NoWebGpu`, and frontend lint + build pass. `TriangleLayer` is replaced by `PresenceLayer` in Step 2. **Commit** `feat(frontend): webgpu renderer skeleton with triangle layer`
- [ ] **Step 1:** Vitest setup (jsdom). Failing tests: start screen lists worlds with type/status/players and calls `onJoin(worldId)`; single world → auto-join; `available: false` → explanatory message; `navigator.gpu` undefined → `NoWebGpu` message.
- [ ] **Step 2:** Implement UI and connection; renderer behind a `canvas` ref, not rendered in tests.
- [ ] **Step 3:** Lab sheet drawer reuses `GET /api/environment/:environment/assignment` and the same Markdown/Mermaid components as `Environment.tsx` (import, do not copy).
- [ ] **Step 4:** Gates (frontend: lint, build, vitest). **Commit** `feat(frontend): automata game view with start screen and presence`

### Task 9: Local run, compose service, end-to-end verification

**Files:**
- Create: `automata/server/Dockerfile`
- Modify: `docker-compose.yml`, `docker-compose-build.yml` (service `automata-server`, internal port 3002, not published)
- Modify: `README.md` (local dev: three processes)

- [ ] **Step 1:** Start server (`AUTOMATA_INTERNAL_TOKEN=dev npm run dev` in `automata/server`), backend (`AUTOMATA_SERVER_URL=http://localhost:3002 AUTOMATA_INTERNAL_TOKEN=dev …`), frontend.
- [ ] **Step 2:** Manual check with two users in two browser windows: both see "Automata-Intro" with "Play"; start screen lists course/group/sandbox; joining the group world shows the other player's box moving; joining different sandboxes isolates them; `/api/environment/create` with `Automata-Intro` returns 400; a normal assignment can be deployed while playing.
- [ ] **Step 3:** `grep -rn "AUTOMATA_INTERNAL_TOKEN" frontend/` → no hits; backend/server logs contain no token.
- [ ] **Step 4:** All gates, quote output in the PR, including AI-usage note (see spec).
- [ ] **Step 5: Commit** `chore(automata): compose service and local run docs`

## Acceptance Criteria

- All gates green in backend, core, server, frontend.
- Manual two-user check (Task 9 Step 2) passes and is documented with screenshots in the PR.
- Existing assignments and their deploy path behave unchanged.
