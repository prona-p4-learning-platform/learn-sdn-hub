# Automaton Stage 2 — Terrain, Movement and Deposits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Refine before execution:** this plan is at task level. Before starting, expand each task into step-level detail (failing test → implementation → gates → commit) as in Stage 1, against the code as it exists after Stage 1.

**Goal:** Players walk on smooth, deterministic terrain with caves, generated from the world's seed, and see resource deposits (ore clusters, wells, vents) on the surface and in caves. Server validates movement against the same terrain.

**Spec:** `docs/superpowers/specs/2026-11-13-automaton-design.md` (sections *Terrain*, *Resources and deposits*, *Client*).

**Depends on:** Stage 1 merged.

## Global Constraints

- Everything the server checks uses integer / fixed-point math only (no `Math.sin`, `Math.pow`, float accumulation). Floats are allowed only in client rendering.
- Terrain and deposits are never stored or sent; only `(template, seed)` is.
- Workers exchange transferable `ArrayBuffer`s; no `SharedArrayBuffer`.

## Review Focus

- **Determinism:** golden vectors for `density()` and deposit generation are generated once and committed; any change to them must be deliberate (it changes every existing world).
- **Server/client agreement:** the same core functions run in Node (jest) and in the browser worker; a browser-side self-test compares a few golden values at startup in dev builds.
- **Performance:** chunk generation + meshing ≤ 5 ms per 32³ chunk in the worker (measured, documented in the PR).

---

### Task 1: Deterministic noise (core)

**Files:** `automaton/core/src/terrain/{hash.ts,noise.ts,fixed.ts}`, tests.

- [ ] Integer lattice hash (`Math.imul` mixing), Q16.16 fixed-point helpers, 2D/3D gradient (or value) noise with fixed-point smoothstep interpolation, fractal sum.
- [ ] Tests: golden vectors (committed JSON), range bounds, no `NaN`, identical output across repeated runs; lint rule or test that greps `src/terrain` for `Math.sin|Math.cos|Math.pow|Math.random`.

### Task 2: Density function and templates (core)

**Files:** `automaton/core/src/terrain/{density.ts,templates.ts}`, tests.

- [ ] `density(template, seed, x, y, z): number` (int32): surface heightfield, cave tunnels/chambers below `surface − 6`, bedrock floor, world radius falloff.
- [ ] `surfaceHeight(template, seed, x, z)` and `findGround(template, seed, x, yFrom, z, maxDrop)` helpers for placement and spawn.
- [ ] Template `temperate` (noise parameters + resource table placeholder).
- [ ] Tests: golden vectors, spawn point is on solid ground with air above, caves exist below surface in a sampled area, nothing solid above build ceiling.

### Task 3: Chunk sampling and surface-nets mesher (core)

**Files:** `automaton/core/src/terrain/{chunk.ts,surfaceNets.ts}`, tests.

- [ ] Sample a 32³ chunk (+1 border) into an `Int32Array`; surface-nets mesh → positions, normals (density gradient), indices as typed arrays.
- [ ] Tests: sphere density → closed mesh, vertex count within expected bounds, normals unit length, empty/full chunks produce no geometry, neighbouring chunks share boundary vertices (no cracks).

### Task 4: Deposit generation (core)

**Files:** `automaton/core/src/resources/{registry.ts,deposits.ts}`, tests.

- [ ] Resource registry (initial: `iron-ore`, `copper-ore`, `coal`, `limestone`, `water`, `crude-oil`, `natural-gas`, `geothermal`), deposit types `ore-cluster | well | vent`, purity → rate multiplier.
- [ ] `depositsInRegion(template, seed, rx, rz)`: seeded Poisson-disc on surface and cave floors, flat-footprint and clearance checks, depth-weighted resource choice, ids `dep:<rx>:<rz>:<i>`.
- [ ] Tests: determinism (golden), no two deposits closer than min distance, every deposit has a valid extractor footprint, cave deposits exist, template guarantee (every 128 m plot contains at least iron, copper, coal, water — prerequisite for Stage 3 plots).

### Task 5: Client terrain worker and renderer

**Files:** `frontend/src/automaton/workers/terrainWorker.ts`, `frontend/src/automaton/render/{TerrainRenderer.ts,DepositRenderer.ts,shaders/*.wgsl}`, `ChunkManager.ts`.

- [ ] Worker generates and meshes chunks on request, returns transferable buffers; chunk manager streams chunks in view distance 8, unloads far ones, prioritises by distance.
- [ ] Terrain pipeline: triplanar colouring by slope/depth, simple directional light, cave darkness + player light.
- [ ] Deposits rendered as instanced markers (ore cluster rocks, well heads, vents) per type.
- [ ] Dev-build self-test: compare 8 golden density values in the worker with the committed vectors, log loudly on mismatch.
- [ ] Manual verification: walk around, enter a cave, see deposits; record fps and meshing time.

### Task 6: Movement and collision

**Files:** `automaton/core/src/physics/{capsule.ts}`, `frontend/src/automaton/input/FirstPersonControls.ts`, `automaton/server/src/WorldRuntime.ts`.

- [ ] Capsule vs. density field collision (shared core), gravity, jump, step-up; client prediction with `Move{seq}`.
- [ ] Server: spawn via `findGround`; accept moves within speed and penetration tolerance, otherwise send a correction (new message `PositionCorrection{seq, x, y, z}`; protocol version bump to 2).
- [ ] Tests (core/server): capsule cannot pass through solid, can walk up gentle slopes, server rejects teleport-sized moves.

### Task 7: Verification

- [ ] All gates; two-user manual check: both see identical terrain and deposits at the same coordinates, walking in caves works, server corrections are rare in normal play.

## Acceptance Criteria

- Golden vectors committed and green in core tests.
- Two clients and the server agree on terrain (visual check + dev self-test).
- Performance numbers documented in the PR.
