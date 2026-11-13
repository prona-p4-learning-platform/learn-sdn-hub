# Automaton Stage 5 — Energy, Fluids and Gases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Refine before execution:** task-level plan; expand into step-level detail against the code after Stage 4.

**Goal:** The remaining three resource kinds: power grids (generators, poles, batteries, consumers throttled by satisfaction ratio), fluid pipe networks (wells, pumps, tanks, bottleneck-limited flow), gas networks (vents, pressure, compressors). Machines now require power.

**Spec:** `docs/superpowers/specs/2026-11-13-automaton-design.md` (section *Simulation*).

**Depends on:** Stage 4 merged.

## Global Constraints

- One generic network component layer (connected components with incremental union-find, component rebuild on removal) shared by power, fluid and gas.
- All amounts in integer milli-units; no floating point in solvers.
- Fluids and gases never mix: a network has at most one resource; connecting two networks with different resources is rejected at build time.

## Review Focus

- **Conservation:** for fluid and gas networks, `produced − consumed − Δstored = 0` every tick (property test).
- **Power fairness:** all consumers in a grid run at the same satisfaction ratio; ratio = min(1, supply / demand) (test).
- **Topology updates:** removing a pipe/pole that splits a network distributes stored contents proportionally to volume (test).

---

### Task 1: Network component layer (core)

**Files:** `automaton/core/src/sim/networks/{components.ts}`, tests.

- [ ] Nodes = network-carrying entities (pole connections, pipe segments, machine ports), union-find on add, local rebuild on remove; stable component ids for replication.
- [ ] Tests: add/remove sequences vs. full recomputation (property test).

### Task 2: Power

**Files:** `automaton/core/src/sim/networks/power.ts`, entities `generator-coal`, `generator-fuel`, `geothermal-generator`, `battery`, `pole` (wire range), tests.

- [ ] Per tick: supply (generators with fuel, geothermal on vents), demand (machines), batteries charge/discharge, satisfaction ratio applied to machine progress.
- [ ] Generators consume solids/fluids/gas via ports.
- [ ] Tests: undersupply throttles evenly, batteries bridge gaps, fuel consumption matches power output.

### Task 3: Fluids

**Files:** `automaton/core/src/sim/networks/fluids.ts`, entities `pump` (on wells), `pipe` tiers, `tank`, fluid ports on machines, tests.

- [ ] Per tick: network capacity = bottleneck pipe tier; producers push, consumers pull, tanks buffer; proportional allocation when constrained.
- [ ] Tests: conservation, bottleneck, tank fill/drain, recipe with fluid input (e.g. `water + coal → steam` for a later generator).

### Task 4: Gases

**Files:** `automaton/core/src/sim/networks/gases.ts`, entities `gas-extractor` (on vents), gas `pipe`, `gas-tank`, `compressor`, tests.

- [ ] Network volume = Σ pipe + tank volumes; pressure = stored / volume (fixed-point); producers stop at their max pressure; consumers need min pressure; compressor moves gas between two networks up to a target pressure, consuming power.
- [ ] Tests: conservation, pressure equalisation, compressor behaviour, consumer starvation below min pressure.

### Task 5: Replication and client UI

**Files:** protocol (`NetworkState` per component: ratio / pressure / fill), `frontend/src/automaton/ui/{PowerPanel.tsx,NetworkInspector.tsx}`, renderers for poles/wires/pipes.

- [ ] Client replica includes networks (same core), inspector overlay shows supply/demand, pressure, fill levels, bottleneck.
- [ ] Manual: build a powered smelter chain, a water network with tank, a gas network with compressor; disconnect a generator and watch throttling.

### Task 6: Verification

- [ ] Re-run Stage 4 benchmark with networks (5 000 entities incl. 500 network components), all gates.

## Acceptance Criteria

- All four resource kinds usable in one factory; conservation and fairness tests green; benchmark within budget.
