# Grade Points for Exams Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exams carry **grade points** (exam score) and **bonus points** (e.g. from previous labs) independently. Both are stored and shown for the examiner. The UI never calls exam points "bonus points" when the assignment is an exam.

**Architecture:** Two new optional fields flow through the existing points pipeline: `AssignmentStep.points` (per-step grade points) → `maxGradePoints` (auto-computed in `Configuration.ts`, same clamp logic as `maxBonusPoints`) → `Submission.gradePoints` (earned at submission, alongside `bonusPoints`). Persisters store both; API routes expose both; the frontend branches on `isExam` for wording and shows two award fields for exams. The existing `Submission.points` field is NOT renamed (deferred; see spec "Terminology").

**Tech Stack:** TypeScript (backend, ts-node runtime, Jest + ts-jest), React + Vite + Vitest + React Testing Library (frontend, jsdom), zod validators, MongoDB (optional field → no migration).

**Spec:** `docs/superpowers/specs/2026-11-20-grade-points-design.md`

## Global Constraints

- `Submission.points` keeps its meaning (bonus points) — do not rename it anywhere in these tasks.
- All new fields are **optional**; old documents/submissions without them must keep working (no migration).
- Non-exam assignments must behave **exactly** as today: no `gradePoints` values, no wording changes.
- Never merge bonus + grade points into one number; they are stored and displayed separately.
- Lab naming, routes, and existing API paths unchanged; only payload shapes extended.
- PR split: Tasks 1–6 = backend PR, Tasks 7–10 = frontend PR (depends on backend API shape).
- Gates: `cd backend && npm test`, `npm run lint`, `npm run type-check`; `cd frontend && npm run lint`, `npm run build`. Quote actual output in the PR.
- Conventional Commits; English only; no new runtime dependencies.

## Review Focus

- **Optional-field safety:** every persister/API consumer must handle missing `gradePoints`/`maxGradePoints` (old submissions, old assignments) — pinned by tests in Tasks 3 and 4.
- **point-limits shape change:** `GET /user/point-limits` value changes from `number` to an object — a breaking change; frontend validator must be updated in the same PR series (Task 8) and no other consumer of that endpoint may exist (check with grep).
- **Word correctness:** exam UI must never show "bonus points" for the exam score, and non-exam UI must keep today's wording — pinned by AssignmentItem tests (Task 9).
- **Sum/clamp parity:** `maxGradePoints` computation must mirror `maxBonusPoints` logic exactly (Configuration.ts l. 73–78) — pinned by unit test (Task 3).

---

## PR 1 — Backend

### Task 1: Extend types and example assignment

**Files:**
- Modify: `backend/src/Environment.ts` (AssignmentStep l. 72–77, EnvironmentDescription l. 177–214, Submission l. 125–129)
- Modify: `backend/src/assignments/environments/example-exam.ts`
- Modify: `backend/src/Configuration.ts` (maxBonusPoints normalization l. 73–78)

**Interfaces:**
- `AssignmentStep.points?: number` — grade points awarded for passing this step.
- `EnvironmentDescription.maxGradePoints?: number`
- `Submission.gradePoints?: number`

- [ ] **Step 1: Add the three optional fields with comments**

```ts
export interface AssignmentStep {
  name: string;
  label: string;
  tests: Array<AssignmentStepTestType>;
  bonusPoints?: number;
  // Grade points awarded for passing this step (exam scoring; per-step
  // equivalent of bonusPoints). Never merged with bonusPoints.
  points?: number;
}
```

`EnvironmentDescription`: add `maxGradePoints?: number;` next to `maxBonusPoints` (comment: "exam score limit; auto-computed from step points if omitted").
`Submission`: add `gradePoints?: number;` next to `points` (comment: "exam score; `points` remains bonus points").

- [ ] **Step 2: Mirror the max computation in Configuration.ts**

In the `getEnvironments()` normalization (l. 73–78), compute `maxGradePoints` from the sum of step `points` with identical clamp logic:

```ts
const gradePoints = env.steps?.reduce((sum, step) => sum + (step.points ?? 0), 0) ?? 0;
if (env.maxGradePoints !== undefined && gradePoints > env.maxGradePoints) {
  env.maxGradePoints = gradePoints;
} else if (env.maxGradePoints === undefined && gradePoints > 0) {
  env.maxGradePoints = gradePoints;
}
```

- [ ] **Step 3: Update example-exam.ts**

Give the exam steps `points` (grade points, e.g. 10 each) in addition to `bonusPoints` (5), with a field comment documenting both. Non-exam assignments stay untouched.

- [ ] **Step 4: Type-check**

Run: `cd backend && npm run type-check`
Expected: passes (additive fields only).

### Task 2: Submission path computes gradePoints

**Files:**
- Modify: `backend/src/Environment.ts` (submission evaluation ~l. 1571–1600)

**Interfaces:**
- Submission result now carries `gradePoints` next to `bonusPoints`.

- [ ] **Step 1: Sum grade points from passed steps**

Mirror the `bonusPoints` summation (l. 1571–1585): `if (testResult.code === 201) gradePoints += step.points ?? 0;` and include `gradePoints` in the submission payload (l. 1600).

- [ ] **Step 2: Grep for the submission payload consumer**

Run: `grep -rn "bonusPoints" backend/src` and check every consumer of the submission result object; extend each to carry/persist `gradePoints` (Tasks 3–4 cover the persisters).

### Task 3: Persistence layer

**Files:**
- Modify: `backend/src/database/Persister.ts` (l. 138, 155)
- Modify: `backend/src/database/MongoDBPersister.ts` (SubmissionEntry l. 33, create l. 389, update path, assignment create l. 677, update l. 735)
- Modify: `backend/src/database/MemoryPersister.ts` (l. 141, 180, 230)
- Create: `backend/test/unit/grade-points-persistence.test.ts` (or extend an existing unit test file following repo structure)

**Interfaces:**
- `UpdateSubmissionPoints(submissionID: string, points: number, gradePoints?: number)` (or an options object — match existing style; at least one value must be settable).
- `CreateAssignment` gains `maxGradePoints?: number`.
- `SubmissionEntry.gradePoints?: number`, `AssignmentEntry.maxGradePoints?: number`.

- [ ] **Step 1: Extend the Persister interface and both implementations**

MongoDB: store `gradePoints` on submission create (next to `points: bonusPoints`, l. 389), accept it in `UpdateSubmissionPoints`, persist `maxGradePoints` in assignment create/update. Memory: write `gradePoints.txt` next to `bonusPoints.txt`, read back with the same `isNaN → 0`-style fallback as l. 230–237.

- [ ] **Step 2: Unit tests — old documents keep working**

Test that a submission/assignment without `gradePoints`/`maxGradePoints` loads fine (`gradePoints` undefined) and that `UpdateSubmissionPoints` with only `points` leaves `gradePoints` untouched (or undefined). Use the existing unit-test patterns (memory persister, no MongoDB dependency).

- [ ] **Step 3: Unit tests — round-trip**

Test: persist submission with `gradePoints: 12` and `points: 3` → read back both values correctly; assignment with `maxGradePoints: 20` → read back.

- [ ] **Step 4: Gates**

Run: `cd backend && npm test && npm run lint && npm run type-check`
Expected: all pass, including the new tests.

### Task 4: API routes

**Files:**
- Modify: `backend/src/routes/user.ts` (point-limits l. 79–107)
- Modify: `backend/src/routes/admin.ts` (assignment create l. 125, submission points l. 526)
- Modify: `backend/test/unit/*` (route-level tests, if the repo has route unit tests — follow existing patterns)

**Interfaces:**
- `GET /user/point-limits` → `{ [assignmentName]: { maxBonusPoints: number; maxGradePoints?: number; isExam: boolean } }` (breaking change; frontend updated in Task 8).
- `POST /submission/:submissionID/points` body → `{ points?: number; gradePoints?: number }` (at least one present).

- [ ] **Step 1: point-limits response shape**

In `routes/user.ts` l. 93–104, emit the object per assignment instead of the bare number. `isExam` comes from `environment.isExam ?? false`.

- [ ] **Step 2: Admin endpoints**

Assignment create/update: accept `maxGradePoints`. Submission points endpoint: accept optional `gradePoints` in the body, validate each value against the respective max (mirror the existing validation at admin.ts l. 326–345), pass through to `UpdateSubmissionPoints`.

- [ ] **Step 3: Grep for other point-limits consumers**

Run: `grep -rn "point-limits" backend/src frontend/src` — confirm the only consumer is the frontend hook (Task 8).

- [ ] **Step 4: Gates**

Run: `cd backend && npm test && npm run lint && npm run type-check`
Expected: all pass.

### Task 5: Backend verification + commit

- [ ] **Step 1: Full gates**

Run: `cd backend && npm test && npm run lint && npm run type-check`
Expected: all pass; quote output.

- [ ] **Step 2: Manual smoke (optional, local only)**

If a local MongoDB/dev setup is available: boot `start:localmultiuservm` or a memory-persister start script, submit `example-exam`, verify both point values persist. Skip if no local setup — unit tests cover the logic.

- [ ] **Step 3: Commit PR 1**

```bash
git commit -m "feat(backend): grade points for exams alongside bonus points"
```

---

## PR 2 — Frontend

### Task 6: Typings and validators

**Files:**
- Modify: `frontend/src/hooks.ts` (pointsValidator l. 12, submission type l. 26, 41)
- Modify: `frontend/src/typings/assignment/AssignmentType.d.ts` (l. 6, 19)
- Modify: `frontend/src/typings/submission/SubmissionType.d.ts` (l. 9)

- [ ] **Step 1: Update the point-limits validator**

`pointsValidator` becomes `z.record(z.string(), z.object({ maxBonusPoints: z.number(), maxGradePoints: z.number().optional(), isExam: z.boolean() }))`.

- [ ] **Step 2: Add `gradePoints` to submission typings**

Both the zod submission schema (l. 26) and the `.d.ts` files get `gradePoints?: number`; assignment typings get `maxGradePoints?: number` and `isExam?: boolean`.

### Task 7: Student view — exam wording

**Files:**
- Modify: `frontend/src/components/assignments/AssignmentItem.tsx` (l. 36–45, 101–116)
- Create: `frontend/src/components/assignments/AssignmentItem.test.tsx` (or extend an existing test file — follow repo structure)

- [ ] **Step 1: Branch the label on isExam**

If `isExam`: "You have earned X out of Y points." (grade points). Else: keep today's "bonus points" wording verbatim. If an exam also has bonus points, show them as a separate line — never as the main label.

- [ ] **Step 2: Vitest — label logic**

jsdom render tests: exam assignment renders "points" wording; non-exam renders "bonus points" wording; exam without grade points still renders sensibly. Mock xterm/Monaco per `onboarding-german/tasks/frontend-tests.md` conventions (keep scope small).

### Task 8: Examiner view — dual award fields

**Files:**
- Modify: `frontend/src/components/SubmissionOverview.tsx` (award dialog l. 184, 326–345, 815–913)

- [ ] **Step 1: Two award fields for exams**

For exam submissions show "Exam points" (grade points) and "Bonus points" fields with separate validation against `maxGradePoints`/`maxBonusPoints`. Non-exam submissions keep the single bonus dialog unchanged. Distinct toasts: "Successfully awarded X exam points…" vs. the existing bonus toast (l. 184).

- [ ] **Step 2: Verify in the running frontend**

Run: `cd frontend && npm run dev` with a backend start script; check the examiner dialog for a normal assignment and for `example-exam`. Quote what you verified.

### Task 9: Admin assignment editor

**Files:**
- Modify: `frontend/src/views/Administration.tsx` (l. 96, 273, 307)
- Modify: `frontend/src/components/AssignmentEditor.tsx` (l. 204–212)

- [ ] **Step 1: maxGradePoints input**

Add a `maxGradePoints` number input next to `maxBonusPoints` (label "Max grade points"; only meaningful for exams — disable or hide for non-exams if trivial).

### Task 10: Frontend gates + commit

- [ ] **Step 1: Full gates**

Run: `cd frontend && npm run lint && npm run build` and the frontend vitest suite
Expected: all pass; quote output.

- [ ] **Step 2: Commit PR 2**

```bash
git commit -m "feat(frontend): grade points UI for exams alongside bonus points"
```

---

## Documentation (part of PR 1)

- [ ] **Step 1: README.md** — document `maxGradePoints` as an assignment field (one short paragraph next to the existing bonus-points documentation).
- [ ] **Step 2: PR descriptions** — note AI usage per AGENTS.md (tool category, use case, degree of manual rework, one line about what did not work).
