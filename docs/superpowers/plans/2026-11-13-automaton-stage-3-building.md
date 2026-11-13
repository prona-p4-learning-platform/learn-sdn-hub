# Automaton Stage 3 — Building, Ownership and Plots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Refine before execution:** task-level plan; expand into step-level detail against the code after Stage 2.

**Goal:** Players place and remove foundations and (still inert) machines on a 1 m grid, snapped to terrain and deposits, with server-side validation, ownership and group plots. Entities persist across server restarts and are replicated to all players in range.

**Spec:** `docs/superpowers/specs/2026-11-13-automaton-design.md` (sections *Building*, *Networking*, *World server → Persistence*).

**Depends on:** Stage 2 merged.

## Global Constraints

- Server is authoritative for every placement; the client only shows ghosts.
- Entity definitions (footprint, ports, kind) live in core as data, shared by client and server.
- Persistence writes are batched (≤ 2 s after a change); no per-action database round trip on the hot path.

## Review Focus

- **Ownership/plots:** a group can never remove or place in another group's plot; admins can. Pinned by server unit tests.
- **Occupancy consistency:** after any sequence of build/remove the occupancy map equals a full rebuild from the entity list (property test).
- **Persistence:** world reload restores exactly the same entities (round-trip test with Mongo integration).

---

### Task 1: Entity catalogue and grid model (core)

**Files:** `automaton/core/src/grid/{cells.ts,entities.ts,occupancy.ts}`, tests.

- [ ] Cell coordinates, rotation (0–3), footprint rotation, port positions/directions after rotation.
- [ ] Entity kinds for this stage: `foundation` (4×4×1), `miner`, `pump`, `gas-extractor`, `smelter`, `constructor`, `container`, `sink`, `belt` (straight/curve, 1×1), `pipe`, `pole` — data only (no behaviour yet).
- [ ] Occupancy map (sparse, keyed by region) with add/remove/query; property test against full rebuild.

### Task 2: Placement rules (core)

**Files:** `automaton/core/src/grid/placement.ts`, tests.

- [ ] Foundation rule (corners on ground within 2 m, ≤ 50 % solid volume), machine rule (fully on foundation tops, volume air and free), extractor rule (snap to matching deposit type, one extractor per deposit), belts/pipes may run on foundations or terrain-free air with supports later (v1: on foundations only).
- [ ] World radius, build ceiling, bedrock checks.
- [ ] Tests for each rule with crafted terrain/deposit fixtures.

### Task 3: Ownership and plots (core + server)

**Files:** `automaton/core/src/grid/plots.ts`, `automaton/server/src/world/Ownership.ts`, tests.

- [ ] Plot allocation in deterministic ring order around spawn (`rules.plots.size`), stored in `automaton_worlds.plots`; allocated on a group's first build.
- [ ] Rules: course world → build only inside own plot; group world and sandbox → anywhere; remove/configure only by owner; admin overrides.
- [ ] Tests: allocation order stable, two groups never share a plot, owner/admin/foreign cases.

### Task 4: Protocol and server actions

**Files:** `automaton/core/src/protocol/*` (version bump), `automaton/server/src/WorldRuntime.ts`, `automaton/server/src/world/EntityStore.ts`.

- [ ] Messages: `Build`, `Remove`, `Configure`, `ActionResult`, `SubscribeRegions`, `EntitySnapshot`, `EntityAdded/Removed/Updated`.
- [ ] Area of interest: clients subscribe to regions within view distance; server sends snapshots on subscribe and deltas afterwards.
- [ ] Rate limit (10 actions/s per player), max entities per world, read-only worlds reject all actions.
- [ ] Tests: valid build broadcast to subscribers only; invalid build rejected with reason; rate limit; read-only.

### Task 5: Entity persistence

**Files:** `automaton/server/src/store/{EntityRepository.ts,MongoEntityRepository.ts,MemoryEntityRepository.ts}`, tests (unit + integration).

- [ ] `automaton_entities` with region key index; batched writes; load per region on world load.
- [ ] Integration test: build N entities, unload world, reload, identical entity set and occupancy.

### Task 6: Client build mode

**Files:** `frontend/src/automaton/build/{BuildMode.ts,GhostRenderer.ts}`, `frontend/src/automaton/render/EntityRenderer.ts`, `frontend/src/automaton/ui/{BuildMenu.tsx,Hud.tsx}`.

- [ ] Build menu (MUI overlay), ghost snapped to grid / deposit with valid (green) / invalid (red, reason tooltip) state using the same core placement rules; R rotates, X removes, click places.
- [ ] Instanced entity rendering (one draw per kind), simple placeholder meshes defined in code.
- [ ] Vitest: build menu lists catalogue entries, selection callback.
- [ ] Manual: two users build in their own plots, cannot build in the other's plot, see each other's buildings appear live; restart server → buildings persist.

## Acceptance Criteria

- All gates green incl. server integration tests.
- Manual two-user check documented in the PR.
