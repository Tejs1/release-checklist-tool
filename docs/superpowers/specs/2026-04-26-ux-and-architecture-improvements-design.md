# Release Checklist Tool: UX & Architecture Improvements

## Goals

Improve the user experience of the release checklist tool and make the architecture future-ready through seven targeted enhancements: version autocomplete, release gating, styled delete modal, smart date defaults, activity logging, step dependencies, and a progress bar — backed by automated tests.

## Features

### 1. Version Autocomplete

When creating a new release, the name field shows a dropdown with three semver-based suggestions derived from the most recent release name.

**Behavior:**
- On focus, parse the latest release name to detect a prefix (e.g., "Version ") and semver portion (e.g., "1.0.2")
- Suggest three options: patch (1.0.3), minor (1.1.0), major (2.0.0), each preserving the detected prefix
- User can select a suggestion or type a custom name freely
- If no prior releases exist or the latest name isn't semver-parseable, the field is empty with no suggestions

**Implementation:**
- Pure function `suggestNextVersion(existingNames: string[])` in `src/shared/steps.ts` returns `{ prefix: string, patch: string, minor: string, major: string } | null`
- New tRPC query `release.suggestVersion` calls this function with existing release names
- New component `src/app/_components/version-autocomplete.tsx` renders a combobox/dropdown using shadcn Popover + Command

### 2. Release Gating (Soft Warning)

When a user opens the create form while an ongoing release exists, a warning banner is displayed.

**Behavior:**
- On the create page, query for any releases with status "ongoing"
- If found, show a yellow warning banner: "[Release name] is still ongoing ([N]/10 steps). Are you sure you want to create a new release?"
- Non-blocking — the user can dismiss it and proceed
- If no ongoing releases exist, the banner is hidden

**Implementation:**
- New tRPC query `release.getOngoing` returns all ongoing releases (name + completed step count). The banner displays the most recent one by date.
- Banner rendered conditionally in `src/app/_components/release-form.tsx` when `isNew` is true

### 3. Styled Delete Modal

Replace native `confirm()` dialogs with a shadcn AlertDialog.

**Behavior:**
- Triggered from the trash icon in list view or Delete button in detail view
- Modal shows: warning icon, "Delete release?" title, release name, "this action cannot be undone" message
- Cancel closes the modal, Delete triggers the mutation
- From detail view, on successful delete, redirect to list
- From list view, on successful delete, optimistic row removal

**Implementation:**
- New shared component `src/app/_components/delete-dialog.tsx` using shadcn AlertDialog
- Integrated into both `release-list.tsx` and `release-form.tsx`, replacing `confirm()` calls

### 4. Smart Date Defaults

The date field defaults to today's date and prevents selecting past dates.

**Behavior:**
- On the create form, the date input is pre-filled with today's date
- The date input has a `min` attribute set to today, preventing past date selection
- On the edit form, the existing date is shown (even if in the past — already-created releases are not retroactively constrained)
- Server-side validation on create rejects dates before today

**Implementation:**
- Frontend: set default state in `release-form.tsx`, add `min` attribute to date input
- Backend: add date validation in the `release.create` tRPC mutation

### 5. Activity Log

Track all release changes with timestamps, displayed both inline per step and as a chronological feed.

**Schema — new table `activity_log`:**
```
activity_log
├── id (serial, PK)
├── releaseId (FK → release.id, ON DELETE CASCADE)
├── action (varchar) — "created" | "step_completed" | "step_uncompleted" | "info_updated" | "name_updated" | "date_updated"
├── detail (text, nullable) — e.g., step label or changed field
├── createdAt (timestamp with timezone, default now)
```

**Schema — modified `release` table:**
- Add `stepCompletedAt` column: `JSONB`, default `{}`, stores `{ [stepId]: ISO timestamp }` for inline per-step timestamps

**Inline timestamps:**
- Completed steps show a relative timestamp next to the checkbox (e.g., "✓ 2h ago")
- Timestamp read from `stepCompletedAt[stepId]`
- When a step is unchecked, its key is removed from `stepCompletedAt`

**Activity feed:**
- Collapsible section at the bottom of the detail view
- Chronological timeline with color-coded dots:
  - Green: step completed
  - Yellow: step uncompleted
  - Blue: info/name/date updated
  - Purple: release created
- New component `src/app/_components/activity-log.tsx`
- New tRPC query `release.getActivityLog` returns log entries for a release, ordered by `createdAt` desc

**Server-side logging:**
- All mutations (create, update, delete) write to the activity_log table
- On update, diff the previous and new state to determine which events to log (steps toggled, fields changed)

### 6. Step Dependencies

Certain steps require prerequisite steps to be completed before they can be checked.

**Dependency map:**
```
Steps 1-7: no dependencies (freely checkable in any order)
Step 8 (Tested in staging):     requires Step 7 (Deployed in staging)
Step 9 (Deployed in production): requires Step 8 (Tested in staging)
Step 10 (Smoke test):           requires Step 9 (Deployed in production)
```

**Behavior:**
- Blocked steps are visually disabled: reduced opacity, non-interactive checkbox, "Requires: [prerequisite]" pill
- When a step is unchecked, all steps that transitively depend on it are also unchecked automatically (no confirmation — the dependency makes this obvious). Each cascade uncheck is logged as a separate activity event.
- Validation enforced on both frontend and backend

**Implementation:**
- Add `requires` field (optional step ID) to each step definition in `src/shared/steps.ts`
- Pure functions:
  - `canCompleteStep(stepId: StepId, completedSteps: string[]): boolean`
  - `getBlockedReason(stepId: StepId, completedSteps: string[]): string | null`
  - `getDependentSteps(stepId: StepId): StepId[]` — returns all steps that transitively depend on the given step
- Backend enforces dependencies in `release.update` mutation before saving

### 7. Progress Bar in Detail View

A visual progress indicator on the detail page.

**Behavior:**
- Shows "N / 10 steps" text with a filled bar
- Updates immediately when steps are toggled (client-side state)

**Implementation:**
- Inline in `release-form.tsx`, using the `completedSteps` array length

## Architecture

### New Files
- `src/app/_components/delete-dialog.tsx` — shared AlertDialog component
- `src/app/_components/activity-log.tsx` — collapsible timeline component
- `src/app/_components/version-autocomplete.tsx` — combobox/dropdown for version suggestions

### Modified Files
- `src/server/db/schema.ts` — add `activityLog` table definition + `stepCompletedAt` column on releases
- `src/shared/steps.ts` — add `requires` field to step definitions, add `canCompleteStep()`, `getBlockedReason()`, `getDependentSteps()`, `suggestNextVersion()` pure functions
- `src/server/api/routers/release.ts` — add activity logging on mutations, add `suggestVersion` and `getOngoing` and `getActivityLog` queries, enforce step dependencies on update, validate date on create
- `src/app/_components/release-form.tsx` — integrate version autocomplete, gating banner, step dependencies UI, progress bar, inline timestamps, replace confirm() with delete dialog
- `src/app/_components/release-list.tsx` — replace confirm() with delete dialog, optionally show progress in list

### Pure Functions (testable in isolation)
- `suggestNextVersion(existingNames: string[])` → `{ prefix, patch, minor, major } | null`
- `canCompleteStep(stepId, completedSteps)` → `boolean`
- `getBlockedReason(stepId, completedSteps)` → `string | null`
- `getDependentSteps(stepId)` → `StepId[]`
- `computeStatus(completedSteps)` → `ReleaseStatus` (already exists)

## Testing Strategy

### Backend Tests (Vitest)
- `computeStatus()` — all three status paths (planned, ongoing, done)
- `suggestNextVersion()` — semver parsing, prefix detection, edge cases (no prior releases, non-semver names, single-segment versions)
- `canCompleteStep()` / `getDependentSteps()` — dependency validation, cascade logic
- tRPC route integration tests:
  - Create: validates no past dates, rejects empty name, returns created release
  - Update: enforces step dependencies, logs activity events, cascade unchecks dependent steps
  - Delete: cascades to activity log (via FK)
  - `suggestVersion`: returns correct suggestions based on existing releases
  - `getOngoing`: returns ongoing release or null

### Frontend Tests (Vitest + React Testing Library)
- Version autocomplete: dropdown appears on focus, suggestion click fills input, manual override works
- Step checklist: toggling steps updates state, blocked steps are non-interactive, cascade uncheck triggers for dependent steps
- Delete modal: opens on trash click, Cancel closes without mutation, Confirm triggers delete
- Gating banner: appears when ongoing release exists, hidden otherwise

## Database Migration

One migration adding:
1. `stepCompletedAt` JSONB column (default `'{}'::jsonb`) to the `release` table
2. New `activity_log` table with FK to `release.id` (ON DELETE CASCADE)

Existing releases get empty `stepCompletedAt` — no backfill needed since historical step timestamps don't exist.
