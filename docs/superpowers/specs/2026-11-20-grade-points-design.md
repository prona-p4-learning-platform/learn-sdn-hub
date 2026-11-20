# Grade Points for Exams — Design

**Status:** draft, 2026-11-20
**Goal:** Exams can carry **grade points** (the exam score) **and** **bonus points** (e.g. from previous labs). Both are stored and shown for the examiner. The UI must not call exam points "bonus points" when the assignment is an exam.

## Problem

Today a submission has exactly one points value (`Submission.points`, `Environment.ts` l. 125–129). For exams this single field is ambiguous: is it the exam grade or bonus credit? The UI hardcodes "bonus points" wording everywhere (`AssignmentItem.tsx`, `SubmissionOverview.tsx`), so an examiner cannot distinguish exam scoring from bonus credit, and bonus points awarded in normal labs cannot be shown *next to* exam points.

## Terminology (binding)

- **Grade points** — points that count towards the exam grade. New field. Only relevant for exams.
- **Bonus points** — unchanged meaning and behavior (existing `points`/`maxBonusPoints`). Stay relevant for normal assignments *and* as an extra on exams.
- The existing `Submission.points` field is **not renamed** in this change (renaming would touch every persister, route and frontend consumer; deferred to a separate cleanup PR if wanted). New code treats `points` as "bonus points".

## Design

### 1. Backend data model (`backend/src/Environment.ts`)

```ts
export interface AssignmentStep {
  // ...
  bonusPoints?: number;
  points?: number;          // NEW: grade points awarded for passing this step
                            // (per-step equivalent of bonusPoints; bonus and
                            // grade points are never merged into one number)
}

export interface EnvironmentDescription {
  // ...
  maxBonusPoints?: number;
  maxGradePoints?: number;  // NEW
  // ...
  isExam?: boolean;
}

export interface Submission {
  assignmentName: string;
  lastChanged: Date;
  points?: number;          // stays: bonus points
  gradePoints?: number;     // NEW: exam grade points
}
```

### 2. Auto-computation (mirrors existing bonus logic)

- `backend/src/Configuration.ts` (l. 73–78): compute `maxGradePoints` from the sum of step `points` with the same clamp logic used for `maxBonusPoints`.
- `backend/src/Environment.ts` submission path (~l. 1571–1600): sum `gradePoints` from passed steps alongside `bonusPoints`; store both on the submission.

### 3. Persistence

- `Persister.ts`: `UpdateSubmissionPoints(submissionID, points)` → `UpdateSubmissionPoints(submissionID, points, gradePoints?)`; `CreateAssignment` gains `maxGradePoints?`.
- `MongoDBPersister.ts`: `gradePoints` on `SubmissionEntry`; persist on create (l. 389) and accept in the update path; `maxGradePoints` on `AssignmentEntry` (create l. 677, update l. 735).
- `MemoryPersister.ts`: `gradePoints.txt` next to `bonusPoints.txt` (l. 180), read back on list (l. 230).
- **No migration needed:** both new fields are optional; old documents simply lack them.

### 4. API

- `GET /user/point-limits` (`routes/user.ts` l. 79–107): value changes from `number` to
  `{ maxBonusPoints: number; maxGradePoints?: number; isExam: boolean }`.
  **Breaking change** — frontend must be updated in the same PR.
- `routes/admin.ts`:
  - assignment create/update (l. 125): accept `maxGradePoints`.
  - `POST /submission/:submissionID/points` (l. 526): body accepts `{ points?, gradePoints? }` (at least one must be present).

### 5. Frontend

- `hooks.ts`: update zod validators for the new `point-limits` shape and add `gradePoints` to the submission type.
- `typings/assignment/AssignmentType.d.ts`, `typings/submission/SubmissionType.d.ts`: add `maxGradePoints`, `gradePoints`, `isExam`.
- `components/assignments/AssignmentItem.tsx`: label logic —
  - exam + graded: "You have earned X out of Y points."
  - normal assignment: unchanged "bonus points" wording.
- `components/SubmissionOverview.tsx`: examiner view — for exams show **two** fields ("Exam points" and "Bonus points") with separate award dialogs, validation limits and toasts; for non-exams keep the single bonus dialog.
- `views/Administration.tsx`, `components/AssignmentEditor.tsx`: add a `maxGradePoints` input (only meaningful for exams).

### 6. Example & docs

- `backend/src/assignments/environments/example-exam.ts`: demonstrate grade points on steps, with a field comment per AGENTS.md convention.
- `README.md`: document `maxGradePoints` (assignment field).

## Acceptance criteria

1. An exam submission stores `gradePoints` and `points` (bonus) independently; both appear in the examiner overview.
2. Non-exam assignments behave exactly as today (no `gradePoints` anywhere, wording unchanged).
3. `/user/point-limits` exposes `maxGradePoints` and `isExam` per assignment.
4. Unit tests cover: `Configuration.ts` max-computation for grade points; the submission grade-point summation in `Environment.ts`.
5. Frontend tests cover the `AssignmentItem` exam vs. non-exam label logic.
6. All CI gates pass locally and their output is quoted in the PR:
   `backend && npm test / npm run lint / npm run type-check`, `frontend && npm run lint / npm run build`.

## PR split

1. **PR 1 (backend):** model + persistence + API + tests.
2. **PR 2 (frontend):** validators, typings, UI, tests. Depends on PR 1's API shape.

## Open questions (resolve before implementing)

1. Are exam grade points auto-awarded from passed steps (mirroring bonus), or examiner-only?
   **Assumption in this spec:** auto-awarded, examiner may adjust manually.
2. Should students see their bonus points on an exam, or only the examiner?
   **Assumption:** students see exam points only; bonus stays examiner-visible.
3. Any need to display grade points in the admin *assignment list* columns, or only per submission? (Out of scope unless requested.)
