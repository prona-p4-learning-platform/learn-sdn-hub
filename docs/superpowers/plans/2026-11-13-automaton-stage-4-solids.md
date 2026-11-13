# Automaton Stage 4 — Simulation Core and Solid Logistics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Refine before execution:** task-level plan; expand into step-level detail against the code after Stage 3.

**Goal:** A working production chain for solids: ore cluster → miner → belt → smelter → belt → sink, simulated server-side at 20 Hz, replicated to clients via a client-side simulation replica with checksum-based resync. Sinks record per-minute delivery metrics per owner (used for grading in Stage 6). Machines run without power in this stage (power arrives in Stage 5).

**Spec:** `docs/superpowers/specs/2026-11-13-automaton-design.md` (sections *Simulation*, *Networking*).

**Depends on:** Stage 3 merged.

## Global Constraints

- Simulation is integer-only and deterministic: same commands + same initial state → bit-identical state on server and client.
- Structure-of-arrays storage per entity kind; core exposes only `tick()`, `applyCommand()`, `serializeRegion()`, `loadRegion()`, `checksum()`, `measureRates()` (catch-up comes in Stage 6).
- No per-item network traffic.

## Review Focus

- **Determinism:** the same scripted factory run in two independent `Simulation` instances yields identical checksums every tick for 10 000 ticks (test).
- **Throughput exactness:** a belt tier's nominal rate (e.g. 60 items/min) is achieved exactly over a 1 min window (test).
- **Performance:** tick ≤ 10 ms for a synthetic world with 5 000 entities (benchmark script, numbers in PR).

---

### Task 1: Simulation skeleton and recipes (core)

**Files:** `automaton/core/src/sim/{Simulation.ts,commands.ts,recipes.ts,ids.ts}`, tests.

- [ ] `Simulation` owning SoA stores, entity add/remove via commands, region serialization, FNV-style checksum per region.
- [ ] Recipe table (`iron-ore → iron-ingot`, `copper-ore → copper-ingot`, `iron-ingot → iron-plate`, `limestone → concrete`, …), durations in ticks, power values (unused until Stage 5).

### Task 2: Transport lines (belts)

**Files:** `automaton/core/src/sim/belts.ts`, tests.

- [ ] Belt segments merged into transport lines; items stored as gap list in 1/256-cell units; O(1) amortised update per line per tick; tiers with speeds; insert/extract at line ends; splitting/merging lines on build/remove.
- [ ] Tests: exact throughput per tier, compression, backpressure, line split/merge preserves items.

### Task 3: Machines, extractors, containers, sinks, splitters/mergers

**Files:** `automaton/core/src/sim/{machines.ts,extractors.ts,storage.ts,sinks.ts,routing.ts}`, tests.

- [ ] Machine state machine (input buffers → progress → output buffers), port I/O with belts, output blocking.
- [ ] Extractors: rate = base × purity multiplier from the deposit.
- [ ] Containers with capacity; splitters (round robin) and mergers; sinks record `(owner, resource, minuteBucket) → count`.
- [ ] Tests: chain produces expected output over N ticks; blocked output stops the machine; splitter fairness.

### Task 4: Server integration

**Files:** `automaton/server/src/WorldRuntime.ts`, `automaton/server/src/store/{SimStateRepository.ts,MetricsRepository.ts}`, tests.

- [ ] Runtime ticks `Simulation`; build/remove/configure become sim commands; machine state changes emitted as `MachineState`; `RegionChecksum` every 5 s.
- [ ] Persist sim state (`automaton_sim_state`, every 30 s and on unload) and metrics (`automaton_metrics`, TTL 7 days).
- [ ] Integration test: run factory, unload, reload → state restored (sim pauses while idle in this stage).

### Task 5: Client simulation replica

**Files:** `frontend/src/automaton/workers/simWorker.ts`, `frontend/src/automaton/render/{BeltItemRenderer.ts,MachineStateRenderer.ts}`.

- [ ] Worker runs `Simulation` for subscribed regions, fed by the same commands; renders belt items via instanced draws from line data.
- [ ] On checksum mismatch: request region snapshot + sim state, replace local region.
- [ ] Machine panel overlay (inputs, outputs, progress, recipe selection via `Configure`).
- [ ] Manual: build the full chain, items visibly flow, two clients see identical item positions, forced desync (dev command) recovers.

### Task 6: Benchmark and verification

- [ ] `automaton/core/bench/tick.bench.ts` (5 000 entities), numbers in the PR.
- [ ] All gates.

## Acceptance Criteria

- Production chain works end to end with two clients in sync.
- Determinism, throughput and benchmark results documented.
