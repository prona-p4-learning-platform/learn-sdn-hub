# Automata Stage 6 — Grading, Catch-up, Administration and Deployment Implementation Plan

> **Refine before execution:** task-level plan; expand into step-level detail against the code after Stage 5.

**Goal:** Game assignments become gradable (`WorldQuery` step checks, submission into the existing submission storage), idle worlds catch up on reload, admins manage worlds (Worlds tab, archiving, reset, kick, delete), sandboxes expire, and the world server is deployable via Docker Compose and Helm.

**Spec:** `docs/superpowers/specs/2026-11-13-automata-design.md` (sections *Catch-up*, *Grading and submission*, *Admin*, *Deployment*).

**Depends on:** Stage 5 merged.

## Global Constraints

- Catch-up never writes throughput metrics; grading uses live simulation only.
- Submissions go through the existing `persister.SubmitUserEnvironment` — no new submission storage, admin "Submission Overview" unchanged.
- Admin endpoints only behind `AdminRoleMiddleware`; world server internal API only reachable from the backend.

## Review Focus

- **Grading integrity:** a sandbox cannot be used for graded checks unless listed in `gradedWorldTypes`; `scope: "own"` counts only the caller's group in course worlds (tests).
- **Catch-up correctness:** catch-up vs. full tick simulation over 10 simulated minutes for reference factories — every buffer within one craft cycle (property test).
- **Destructive admin actions** (reset, delete) require confirmation in the UI and are logged with admin username.

---

### Task 1: `WorldQuery` evaluation (server)

**Files:** `automata/server/src/world/queries.ts`, internal route `POST /internal/worlds/:id/query`, tests.

- [ ] Queries: `throughput` (from `automata_metrics`, window minutes), `entityCount` (optionally only powered/running), `stored` (containers/tanks of owner); `scope: own | world`.
- [ ] Works for idle worlds (metrics/entities from the store without loading the runtime) and active ones.
- [ ] Tests for each query and scope.

### Task 2: Backend test and submit routes

**Files:** `backend/src/routes/game.ts`, `backend/src/Environment.ts` (`WorldQuery` already typed in Stage 1), tests.

- [ ] `POST /api/game/:assignment/test` `{ worldId, stepIndex }` → access check, `gradedWorldTypes` check, evaluate tests, return `TestResult` (same shape and `gradualAssistance` behaviour as `Environment.test`; reuse the hint logic rather than copying if it can be extracted without touching unrelated code — otherwise document the duplication).
- [ ] `POST /api/game/:assignment/submit` `{ worldId }` → run all steps, compute bonus points as for normal assignments, `SubmitUserEnvironment(..., [], [{ fileName: "automata-report.json", fileContent }], bonusPoints)`.
- [ ] Extend `Automata-Intro` with two steps (iron ingots 30/min; powered smelters ≥ 2).
- [ ] Tests (supertest, mocked world server client).

### Task 3: Goals panel and submit in the client

**Files:** `frontend/src/automata/ui/{GoalsPanel.tsx,SubmitDialog.tsx}`, vitest tests.

- [ ] Steps with "Check" button and result/hint display; submit dialog; graded/ungraded world indicator.

### Task 4: Catch-up (core + server)

**Files:** `automata/core/src/sim/catchUp.ts`, `automata/server/src/WorldRuntime.ts`, tests.

- [ ] `measureRates()` over the last 60 s stored on unload; on load, event-driven piecewise-linear advance (buffer full/empty, fuel out) with subgraph rate recomputation (backpressure, power ratio, network constraints); caps at `archiveAt` and `AUTOMATA_CATCHUP_MAX_DAYS`.
- [ ] Property test vs. tick simulation (reference factories: linear chain, splitter tree, power-limited chain, fluid + gas chain, storage-full stop).
- [ ] Server: catch-up runs before the first player is admitted; duration logged.

### Task 5: Admin API and Worlds tab

**Files:** internal routes (`reset`, `status`, `kick`, `DELETE`, list), `backend/src/routes/admin.ts` proxies, `frontend/src/views/Administration.tsx` (new tab "Worlds"), `frontend/src/components/WorldsOverview.tsx`, tests.

- [ ] List with type, assignment, status, players, entity count, last activity; actions reset, read-only/archive with optional `archiveAt` (date picker), kick, delete (confirmation dialogs), join as spectator.
- [ ] Scheduled jobs in the world server: switch to read-only at `archiveAt`; delete sandboxes idle > `AUTOMATA_SANDBOX_TTL_DAYS` (daily).
- [ ] Tests: admin-only access, scheduled transitions (fake timers).

### Task 6: Deployment

**Files:** `helm/learn-sdn-hub/templates/{deployment-automata-server.yaml,service-automata-server.yaml}`, `helm/learn-sdn-hub/values.yaml` (`automataServer.enabled`, image, resources, token secret ref), backend deployment env (`AUTOMATA_SERVER_URL`, `AUTOMATA_INTERNAL_TOKEN` from secret), `README.md`, `helm/learn-sdn-hub/README.md`.

- [ ] ClusterIP service only, not in `ingress.yaml`; 1 replica; token via Kubernetes secret (never in values defaults).
- [ ] `helm template` renders with the feature enabled and disabled.

### Task 7: Final verification

- [ ] All gates in all four workspaces; manual end-to-end: build the intro chain, check steps, submit, see the submission in the admin overview; leave world idle (shortened unload timeout), reload, verify catch-up filled storage but throughput check still needs live production; archive and reset via Worlds tab.
- [ ] PR description with gate output and AI-usage note.

## Acceptance Criteria

- `Automata-Intro` is gradable end to end, catch-up property tests green, admin operations work, Helm chart renders.
