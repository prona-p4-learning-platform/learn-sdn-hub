# Per-Assignment Environment Files Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every assignment is defined in its own file under `backend/src/assignments/environments/`; `Configuration.ts` becomes a loader that registers them at boot, so student demo-assignment PRs add new files only and stop conflicting on `Configuration.ts`.

**Architecture:** `Configuration.ts` keeps its exact export surface (default `Map<string, EnvironmentDescription>`, `updateEnvironments`, `updateEnvironment`) so the four consumers (`MongoDBPersister.ts`, `routes/admin.ts`, `routes/environment.ts`, `routes/user.ts`) stay untouched. A directory scan replaces the static `environments.set(...)` calls. Lab-sheet strings are NOT re-resolved: `routes/environment.ts:176` resolves `path.resolve(__dirname, assignmentLabSheet)` relative to `backend/src/routes/`, independent of where the definition file lives — values are copied verbatim.

**Tech Stack:** TypeScript (CommonJS, `esModuleInterop: true`, target ES2020, strict, noUnusedLocals), ts-node runtime (all start scripts run from `src/`), Jest + ts-jest, ESLint.

**Spec:** `docs/superpowers/specs/2026-11-06-per-assignment-environments-design.md`

## Global Constraints

- Assignment registration order becomes **alphabetical by filename** — the one intentional behavior change (API listing order only).
- `assignmentLabSheet` values copied **verbatim** from `Configuration.ts` (e.g. `"../assignments/network-basics.md"`).
- Each assignment file: `import type { EnvironmentDescription } from "../../Environment";` + `export const name` + `export const environment`.
- No changes to `Environment.ts`, `MongoDBPersister.ts`, `routes/*`, or the frontend.
- All 27 assignments migrate; no second registration style remains.
- Gates: `cd backend && npm run lint`, `npm run type-check`, `npm test` (all 54 existing tests pass unchanged).
- Conventional Commits; English only; no new runtime dependencies.

## Review Focus

- **Lab-sheet resolution:** if any per-assignment file *rewrites* the `assignmentLabSheet` string (e.g. adds/loses `../`), serving breaks silently at runtime → pinned by equivalence check on all fields (Task 3) and smoke run of one lab sheet (Task 5).
- **Duplicate assignment names** from parallel student PRs → boot must fail fast with filename in the message → pinned by loader unit test (Task 3).
- **Invalid/missing exports** in a student file (no `name` or no `environment`) → boot must fail fast, not silently drop the assignment → pinned by loader unit test (Task 3).
- **MongoDB override path:** `updateEnvironments()` clears the map and replaces it with DB docs — per-file defaults must still be the boot-time fallback; pin by asserting loader output is independent of and compatible with `updateEnvironments` (Task 3 existing tests cover the flow).
- **Registration order:** alphabetical; assert the set of names is identical and count matches the fixture (Task 3).

---

### Task 1: Baseline equivalence fixture

**Files:**
- Create: `backend/test/unit/configuration-baseline.json` (fixture, committed)

**Interfaces:**
- Produces: JSON fixture — array of `{ "name": string, "environment": <serialized EnvironmentDescription> }`, sorted by `name`, one entry per registered assignment.

- [ ] **Step 1: Write and run a throwaway serialization script**

```ts
// scripts/serialize-environments.ts (throwaway, delete after Task 1)
import environments from "../src/Configuration";
import { writeFileSync } from "fs";
const sorted = Array.from(environments.entries())
  .map(([name, environment]) => ({ name, environment }))
  .sort((a, b) => a.name.localeCompare(b.name));
writeFileSync("test/unit/configuration-baseline.json", JSON.stringify(sorted, null, 2));
console.log("entries:", sorted.length);
```

Run: `cd backend && npx ts-node scripts/serialize-environments.ts`
Expected: `entries: 27`

- [ ] **Step 2: Sanity-check the fixture**

Run: `node -e "const f=require('./test/unit/configuration-baseline.json'); console.log(f.length, f[0].name, f.at(-1).name)"`
Expected: `27 Containerlab-Dnsmasq-TopologyUrl vCluster-test` (alphabetical first/last)

- [ ] **Step 3: Commit**

```bash
git add backend/test/unit/configuration-baseline.json
git commit -m "test(backend): baseline fixture of registered environments before per-assignment refactor"
```

### Task 2: Extract all 27 assignment blocks into per-assignment files

**Files:**
- Create: `backend/src/assignments/environments/<kebab-name>.ts` for each of the 27 names listed below
- Modify: none (extraction task only — files are added, `Configuration.ts` untouched)

**Interfaces:**
- Consumes: the verbatim `environments.set("<Name>", { ... })` block bodies from `backend/src/Configuration.ts`.
- Produces: for each file — `export const name: string` (the registry key, exactly as in `Configuration.ts`) and `export const environment: EnvironmentDescription`.

Assignment names → filenames (kebab-case, lowercase; `l2_learning_switch` → `l2-learning-switch.ts`):

| # | Name | File |
|---|---|---|
| 1 | Containerlab-Dnsmasq-TopologyUrl | containerlab-dnsmasq-topology-url.ts |
| 2 | Onboarding-Tour | onboarding-tour.ts |
| 3 | Network-Basics | network-basics.ts |
| 4 | System-Detective | system-detective.ts |
| 5 | Change-n-Clear | change-n-clear.ts |
| 6 | Linux-Network-Basics | linux-network-basics.ts |
| 7 | p4basic-with-guacamole | p4basic-with-guacamole.ts |
| 8 | l2_learning_switch | l2-learning-switch.ts |
| 9 | p4calc | p4calc.ts |
| 10 | python-test | python-test.ts |
| 11 | Example0-SDN-Intro | example0-sdn-intro.ts |
| 12 | Beispiel0-SDN-Einfuehrung | beispiel0-sdn-einfuehrung.ts |
| 13 | Example1-Repeater | example1-repeater.ts |
| 14 | Example2-MinimalisticSwitch | example2-minimalistic-switch.ts |
| 15 | Example3-LearningSwitch | example3-learning-switch.ts |
| 16 | Example-p4env | example-p4env.ts |
| 17 | Example5-IPv4Routing | example5-ipv4-routing.ts |
| 18 | Example6-MPLSSwitching | example6-mpls-switching.ts |
| 19 | KommProt-Uebung1b | kommprot-uebung1b.ts |
| 20 | KommProt-Uebung1c | kommprot-uebung1c.ts |
| 21 | KommProt-Uebung3-SDN | kommprot-uebung3-sdn.ts |
| 22 | Test-Uebung3-SDN | test-uebung3-sdn.ts |
| 23 | Containerlab-Test-SAL | containerlab-test-sal.ts |
| 24 | CC-Lab-1 | cc-lab-1.ts |
| 25 | vCluster-test | vcluster-test.ts |
| 26 | CC-Lab-2 | cc-lab-2.ts |

**The table above is provisional (26 known names).** Before extracting, get the authoritative list — the count MUST be 27:

```bash
grep -n 'environments.set(' backend/src/Configuration.ts
```

If any name is missing from the table (e.g. an `Example4-*` block between `Example-p4env` and `Example5-IPv4Routing`), derive its filename with the same kebab-case rule and extract it too. Fail loudly if the count differs from 27.

- [ ] **Step 1: Extract each block verbatim**

For every name: copy the object body from its `environments.set(...)` call into the new file, preserving every field and comment verbatim:

```ts
import type { EnvironmentDescription } from "../../Environment";

export const name = "Network-Basics";
export const environment: EnvironmentDescription = {
  // ...verbatim block body...
};
```

- [ ] **Step 2: Verify compilation and field integrity**

Run: `cd backend && npm run type-check`
Expected: pass (files export consts; no unused-local errors since everything is exported).

Additional throwaway check — every field from the old block survives verbatim:

```bash
node -e "
const files=require('fs').readdirSync('src/assignments/environments');
console.log('files:', files.length);
" 
```

Expected: `files: 27` (26 rows + any extra block found in step-extraction).

- [ ] **Step 3: Commit**

```bash
git add backend/src/assignments/environments/
git commit -m "refactor(backend): extract all assignments into per-assignment files (no loader yet)"
```

### Task 3: Loader rewrite + unit tests + equivalence check

**Files:**
- Modify: `backend/src/Configuration.ts` (replace static sets; keep export surface identical)
- Test: `backend/test/unit/assignment-loader.test.ts`

**Interfaces:**
- Consumes: the per-assignment files from Task 2 (`name`, `environment` exports).
- Produces: unchanged public surface — `export default getEnvironments()` (evaluated `Map`), `export function updateEnvironments(...)`, `export function updateEnvironment(...)`.

- [ ] **Step 1: Write the failing loader tests**

```ts
describe("assignment loader", () => {
  it("registers all assignments from the directory", () => {
    expect(environments.size).toBeGreaterThan(20);
  });
  it("throws on a duplicate assignment name", () => { /* fixture file with duplicate name -> expect throw from loader function */ });
  it("throws on a file without name or environment export", () => { /* fixture invalid file -> expect throw */ });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest test/unit/assignment-loader.test.ts`
Expected: FAIL (loader not implemented).

- [ ] **Step 3: Implement the loader in Configuration.ts**

```ts
const environmentsDir = path.join(__dirname, "assignments", "environments");
for (const file of fs.readdirSync(environmentsDir).filter(f => f.endsWith(".ts")).sort()) {
  const { name, environment } = require(path.join(environmentsDir, file));
  // validate: non-empty string name, object environment, duplicate throws with filename
  environments.set(name, environment);
}
```

Keep `getEnvironments`, `updateEnvironments`, `updateEnvironment` unchanged below.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npm test`
Expected: all 54 existing tests pass + new loader tests pass.

- [ ] **Step 5: Equivalence check against baseline**

Re-run the Task 1 script (now reading the new loader-driven `Configuration.ts`) into `configuration-after.json`, then diff with sorted names normalized:

```bash
node -e "
const a=require('./test/unit/configuration-baseline.json');
const b=require('/tmp/configuration-after.json');
const key=o=>JSON.stringify(o);
const mapA=new Map(a.map(o=>[o.name,o.environment]));
const mapB=new Map(b.map(o=>[o.name,o.environment]));
console.log('names equal:', mapA.size===mapB.size && [...mapA.keys()].every(k=>mapB.has(k)));
const diffs=[...mapA].filter(([k,v])=>key(v)!==key(mapB.get(k)));
console.log('field diffs:', diffs.length);
"
```

Expected: `names equal: true`, `field diffs: 0`.

- [ ] **Step 6: Commit**

```bash
git add backend/src/Configuration.ts backend/test/unit/assignment-loader.test.ts
git commit -m "refactor(backend): auto-load per-assignment environment files with fail-fast validation"
```

### Task 4: Documentation updates

**Files:**
- Modify: `README.md` — "Assignment Configuration" section (~line 289) and mount examples (lines 61–67): describe per-assignment files under `backend/src/assignments/environments/`, note MongoDB override stays an option.
- Modify: `AGENTS.md` — "Where does my change belong?" table: new assignment → `backend/src/assignments/environments/<name>.ts` + lab sheet in `backend/src/assignments/`.
- Modify: `onboarding-german/assignments/onboarding-tour-german.md`, `onboarding-german/slides/code-tour.md`, `onboarding-german/README.md`, `onboarding-german/runbook-setup.md` — update `Configuration.ts` references to the new per-assignment file layout (keep German; files keep `-german` convention).

**Interfaces:** none (docs only).

- [ ] **Step 1: Update README and AGENTS.md**
- [ ] **Step 2: Update the 4 onboarding-german files** (lines found via grep: onboarding-tour-german.md:4,18,53,62,73,81; code-tour.md:61,86,289,333,359; README.md:14; runbook-setup.md:97)
- [ ] **Step 3: Commit**

```bash
git add README.md AGENTS.md onboarding-german/
git commit -m "docs: per-assignment environment files — README, AGENTS.md, onboarding-german"
```

### Task 5: Full gates + smoke run

**Files:** none (verification only)

- [ ] **Step 1: Run all backend gates**

Run: `cd backend && npm run lint && npm run type-check && npm test`
Expected: lint clean, type-check clean, all tests pass.

- [ ] **Step 2: Smoke run — boot with a start script and fetch a lab sheet**

Run: `cd backend && DOCKER_IMAGE=prona/p4-container DOCKER_CMD=-s timeout 15 npm run start:docker 2>&1 | head -30` (or the available start script)
Expected: boot log shows environments registered (alphabetical list); no duplicate/invalid-file errors.

Then hit the lab-sheet route for one assignment (e.g. `Network-Basics`, whose sheet is served from `backend`) and confirm the markdown content resolves — this pins the `path.resolve(__dirname, ...)` behavior from `routes/environment.ts:176`.

- [ ] **Step 3: Delete throwaway scripts**

Remove `scripts/serialize-environments.ts` and any temp files from Task 1/3.

- [ ] **Step 4: Final commit (if anything remaining) and push branch**
