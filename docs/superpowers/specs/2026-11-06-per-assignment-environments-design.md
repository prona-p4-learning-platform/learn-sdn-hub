# Per-Assignment Environment Files — Design

**Status:** approved in chat, 2026-11-06
**Goal:** Students add demo assignments as **new files only**. No shared file edits → no recurring merge conflicts in `backend/src/Configuration.ts` (three conflicting student PRs merged this week: System-Detective #428, Change-n-Clear #430, Linux-Network-Basics #429).

## Problem

Every assignment is registered by appending an `environments.set(...)` block to `backend/src/Configuration.ts`. Parallel student PRs append at the same spot, so every demo-assignment PR conflicts with every other one and with master. This is structural: the conflicts are caused by the code layout, not by carelessness.

## Design

### 1. Layout

New directory `backend/src/assignments/environments/` — one `.ts` file per assignment:

```ts
import type { EnvironmentDescription } from "../../Environment";

export const name = "Linux-Network-Basics";
export const environment: EnvironmentDescription = {
  // moved verbatim from Configuration.ts
};
```

`import type` keeps the loader-time require of each assignment file from pulling `Environment.ts`'s runtime dependencies.

All 27 existing assignments migrate; `Configuration.ts` becomes a pure loader (~80 lines). No second registration style remains.

### 2. Loader

`Configuration.ts` scans the directory once at module load:

```ts
const environmentsDir = path.join(__dirname, "assignments", "environments");

for (const file of fs.readdirSync(environmentsDir).filter(f => f.endsWith(".ts")).sort()) {
  const { name, environment } = require(path.join(environmentsDir, file));
  // validate below
  environments.set(name, environment);
}
```

- All runtimes execute from `src/` via `ts-node` (all `package.json` start scripts; Dockerfile `CMD npm run start:k8s`); no compiled `dist/` runtime exists, so dynamic `require()` of sibling `.ts` files works.
- Registration order becomes **alphabetical by filename** (sorted `readdirSync`). Today's order is source declaration order. This affects only API listing order — no logic depends on Map iteration order. This is the one intentional behavior change.

### 3. Preserved exports (consumers unchanged)

`Configuration.ts`'s public surface stays identical, so these four consumers need **no changes**:

- `backend/src/database/MongoDBPersister.ts` — `import environments, { updateEnvironments, updateEnvironment }`
- `backend/src/routes/admin.ts`, `routes/environment.ts`, `routes/user.ts` — `import environments`

- Default export: evaluated `Map<string, EnvironmentDescription>` (unchanged).
- `getEnvironments()`: clone + `updateEnvironment` bonus-point normalization — runs over all entries, dynamic ones included (it iterates the map, not static code).
- `updateEnvironments()`: MongoDB override path. It clears the map and replaces it with DB documents. **Per-file definitions are intentionally replaced** — this is today's behavior for the static registrations too (MongoDB content wins at runtime). The per-file sources remain the fallback/default on every boot.
- `updateEnvironment()`: unchanged.

### 4. Error handling — fail fast at boot

`require` of an assignment file throws at startup with the filename in the message when:

- `name` is not a non-empty string,
- `environment` is not an object,
- a duplicate `name` is already registered.

A typo'd student file aborts boot with a clear error instead of silently dropping an assignment.

### 5. Student workflow (the goal)

A demo-assignment PR now adds exactly:

1. `backend/src/assignments/environments/<name>.ts` — the environment definition;
2. `backend/src/assignments/<name>.md` — the lab sheet.

No shared file is touched. Documented in `README.md` (new env vars: none; new section: "adding an assignment") and in `AGENTS.md` ("Where does my change belong?" row).

### 6. Verification plan

- **Gates:** `backend && npm run lint`, `npm run type-check`, `npm test` (all 54 existing tests must pass unchanged).
- **Before/after equivalence check (stronger than tests alone):** before the refactor, serialize the current default-export Map from master (`JSON.stringify([...getEnvironmentsMap().entries()])`) to a fixture file; after migration, serialize again and diff. Sort both serialized sets by environment name before diffing (registration order intentionally changes to alphabetical); the diff must show zero field differences.
- **Smoke run:** boot one application (`start:docker` with a test image or `start:openstack` dry config) and confirm the assignment list logs/loads all environments, including a duplicate-name negative test (temp file, expect boot failure with clear message).
- **New unit test:** loader registers all expected environments from the directory; a fixture duplicate/invalid file makes it throw.

### 7. Out of scope

- No changes to `Environment.ts` interfaces.
- No MongoDB schema changes (`updateEnvironments` path untouched).
- No frontend changes (assignment listing already comes from the API).
- Lab-sheet files stay where they are (`backend/src/assignments/*.md`), referenced by relative path as today.
