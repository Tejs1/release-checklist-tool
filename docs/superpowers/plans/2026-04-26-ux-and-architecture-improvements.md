# UX & Architecture Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the release checklist tool with version autocomplete, release gating, styled delete modal, smart date defaults, activity logging, step dependencies, progress bar, and automated tests.

**Architecture:** Incremental enhancement of existing T3 Stack app. Pure functions for all business logic (testable in isolation). New `activityLog` Drizzle table + `stepCompletedAt` JSONB column on releases. New UI components for delete dialog, activity log, and version autocomplete.

**Tech Stack:** Next.js 15, tRPC v11, Drizzle ORM (Neon PostgreSQL), shadcn/ui, Vitest, React Testing Library

**Spec:** `docs/superpowers/specs/2026-04-26-ux-and-architecture-improvements-design.md`

---

## File Map

### New Files
- `src/app/_components/delete-dialog.tsx` — Shared AlertDialog for delete confirmation
- `src/app/_components/activity-log.tsx` — Collapsible timeline component
- `src/app/_components/version-autocomplete.tsx` — Dropdown for version suggestions
- `src/__tests__/version.test.ts` — Tests for suggestNextVersion
- `src/__tests__/dependencies.test.ts` — Tests for step dependency functions

### Modified Files
- `src/server/db/schema.ts` — Add `activityLog` table, add `stepCompletedAt` column to releases
- `src/shared/steps.ts` — Add `requires` field, add `canCompleteStep()`, `getBlockedReason()`, `getDependentSteps()`, `suggestNextVersion()`
- `src/server/api/routers/release.ts` — Activity logging, new queries, step dependency enforcement, date validation
- `src/app/_components/release-form.tsx` — Version autocomplete, gating banner, step deps UI, progress bar, inline timestamps, delete dialog, date defaults
- `src/app/_components/release-list.tsx` — Delete dialog, progress count
- `src/app/_components/release-detail.tsx` — Pass stepCompletedAt to form
- `src/app/release/new/page.tsx` — Prefetch version suggestions and ongoing releases
- `src/__tests__/steps.test.ts` — Already exists, no changes needed

---

## Task 1: Database Schema Changes

**Files:**
- Modify: `src/server/db/schema.ts`

- [ ] **Step 1: Add `stepCompletedAt` column and `activityLog` table to schema**

In `src/server/db/schema.ts`, add the new column to the `releases` table and create the `activityLog` table:

```typescript
import { sql } from "drizzle-orm";
import { pgTableCreator } from "drizzle-orm/pg-core";

export const createTable = pgTableCreator(
	(name) => `release-checklist-tool_${name}`,
);

export const releases = createTable("release", (d) => ({
	id: d.serial().primaryKey(),
	name: d.varchar({ length: 256 }).notNull(),
	date: d.timestamp({ withTimezone: true }).notNull(),
	additionalInfo: d.text(),
	completedSteps: d
		.jsonb()
		.$type<string[]>()
		.default(sql`'[]'::jsonb`)
		.notNull(),
	stepCompletedAt: d
		.jsonb()
		.$type<Record<string, string>>()
		.default(sql`'{}'::jsonb`)
		.notNull(),
	createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
	updatedAt: d
		.timestamp({ withTimezone: true })
		.defaultNow()
		.notNull()
		.$onUpdate(() => new Date()),
}));

export const activityLog = createTable("activity_log", (d) => ({
	id: d.serial().primaryKey(),
	releaseId: d
		.integer()
		.notNull()
		.references(() => releases.id, { onDelete: "cascade" }),
	action: d.varchar({ length: 50 }).notNull(),
	detail: d.text(),
	createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
}));
```

- [ ] **Step 2: Push schema to database**

Run: `bun run db:push`

Expected: Schema pushed successfully. The `stepCompletedAt` column defaults to `'{}'::jsonb` so existing rows get an empty object. The `activityLog` table is created fresh.

- [ ] **Step 3: Commit**

```bash
git add src/server/db/schema.ts
git commit -m "feat: add activityLog table and stepCompletedAt column to schema"
```

---

## Task 2: Step Dependency Pure Functions (TDD)

**Files:**
- Modify: `src/shared/steps.ts`
- Create: `src/__tests__/dependencies.test.ts`

- [ ] **Step 1: Write failing tests for step dependency functions**

Create `src/__tests__/dependencies.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import {
	canCompleteStep,
	getBlockedReason,
	getDependentSteps,
	RELEASE_STEPS,
} from "@/shared/steps";

describe("canCompleteStep", () => {
	it("returns true for steps with no dependencies", () => {
		expect(canCompleteStep("pr-merged", [])).toBe(true);
		expect(canCompleteStep("deployed-staging", [])).toBe(true);
	});

	it("returns false when prerequisite is not completed", () => {
		expect(canCompleteStep("tested-staging", [])).toBe(false);
		expect(canCompleteStep("tested-staging", ["pr-merged"])).toBe(false);
	});

	it("returns true when prerequisite is completed", () => {
		expect(canCompleteStep("tested-staging", ["deployed-staging"])).toBe(true);
	});

	it("checks transitive dependencies only at direct level", () => {
		expect(
			canCompleteStep("deployed-production", ["tested-staging"]),
		).toBe(true);
		expect(canCompleteStep("deployed-production", ["deployed-staging"])).toBe(
			false,
		);
	});

	it("returns true for smoke-test when deployed-production is completed", () => {
		expect(canCompleteStep("smoke-test", ["deployed-production"])).toBe(true);
	});
});

describe("getBlockedReason", () => {
	it("returns null for steps with no dependencies", () => {
		expect(getBlockedReason("pr-merged", [])).toBeNull();
		expect(getBlockedReason("changelog-updated", [])).toBeNull();
	});

	it("returns null when prerequisite is met", () => {
		expect(
			getBlockedReason("tested-staging", ["deployed-staging"]),
		).toBeNull();
	});

	it("returns the prerequisite label when blocked", () => {
		expect(getBlockedReason("tested-staging", [])).toBe(
			"Deployed in staging",
		);
		expect(getBlockedReason("deployed-production", [])).toBe(
			"Tested thoroughly in staging",
		);
		expect(getBlockedReason("smoke-test", [])).toBe(
			"Deployed in production",
		);
	});
});

describe("getDependentSteps", () => {
	it("returns empty array for steps with no dependents", () => {
		expect(getDependentSteps("pr-merged")).toEqual([]);
		expect(getDependentSteps("smoke-test")).toEqual([]);
	});

	it("returns direct dependents", () => {
		const deps = getDependentSteps("deployed-staging");
		expect(deps).toContain("tested-staging");
	});

	it("returns transitive dependents", () => {
		const deps = getDependentSteps("deployed-staging");
		expect(deps).toContain("tested-staging");
		expect(deps).toContain("deployed-production");
		expect(deps).toContain("smoke-test");
		expect(deps).toHaveLength(3);
	});

	it("returns correct chain for tested-staging", () => {
		const deps = getDependentSteps("tested-staging");
		expect(deps).toContain("deployed-production");
		expect(deps).toContain("smoke-test");
		expect(deps).toHaveLength(2);
	});
});

describe("RELEASE_STEPS dependency structure", () => {
	it("has requires field only on steps 8-10", () => {
		const stepsWithDeps = RELEASE_STEPS.filter(
			(s) => "requires" in s,
		);
		expect(stepsWithDeps).toHaveLength(3);
		const ids = stepsWithDeps.map((s) => s.id);
		expect(ids).toEqual([
			"tested-staging",
			"deployed-production",
			"smoke-test",
		]);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun run test`

Expected: FAIL — `canCompleteStep`, `getBlockedReason`, `getDependentSteps` are not exported from `@/shared/steps`.

- [ ] **Step 3: Add `requires` field and implement dependency functions**

Replace the entire contents of `src/shared/steps.ts`:

```typescript
export const RELEASE_STEPS = [
	{
		id: "pr-merged",
		label: "All relevant GitHub pull requests have been merged",
	},
	{ id: "changelog-updated", label: "CHANGELOG.md files have been updated" },
	{ id: "tests-passing", label: "All tests are passing" },
	{ id: "version-bumped", label: "Version numbers have been bumped" },
	{ id: "release-notes", label: "Release notes have been drafted" },
	{ id: "github-release", label: "Releases in GitHub created" },
	{ id: "deployed-staging", label: "Deployed in staging" },
	{
		id: "tested-staging",
		label: "Tested thoroughly in staging",
		requires: "deployed-staging",
	},
	{
		id: "deployed-production",
		label: "Deployed in production",
		requires: "tested-staging",
	},
	{
		id: "smoke-test",
		label: "Post-release smoke test completed",
		requires: "deployed-production",
	},
] as const;

export type StepId = (typeof RELEASE_STEPS)[number]["id"];

export type ReleaseStatus = "planned" | "ongoing" | "done";

export function computeStatus(completedSteps: string[]): ReleaseStatus {
	if (completedSteps.length === 0) return "planned";
	if (completedSteps.length >= RELEASE_STEPS.length) return "done";
	return "ongoing";
}

export function canCompleteStep(
	stepId: StepId,
	completedSteps: string[],
): boolean {
	const step = RELEASE_STEPS.find((s) => s.id === stepId);
	if (!step) return false;
	if (!("requires" in step)) return true;
	return completedSteps.includes(step.requires);
}

export function getBlockedReason(
	stepId: StepId,
	completedSteps: string[],
): string | null {
	const step = RELEASE_STEPS.find((s) => s.id === stepId);
	if (!step || !("requires" in step)) return null;
	if (completedSteps.includes(step.requires)) return null;
	const required = RELEASE_STEPS.find((s) => s.id === step.requires);
	return required ? required.label : null;
}

export function getDependentSteps(stepId: StepId): StepId[] {
	const result: StepId[] = [];
	for (const step of RELEASE_STEPS) {
		if ("requires" in step && step.requires === stepId) {
			result.push(step.id);
			result.push(...getDependentSteps(step.id));
		}
	}
	return result;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run test`

Expected: All tests in `dependencies.test.ts` and `steps.test.ts` PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/steps.ts src/__tests__/dependencies.test.ts
git commit -m "feat: add step dependency functions with requires field"
```

---

## Task 3: Version Suggestion Pure Function (TDD)

**Files:**
- Modify: `src/shared/steps.ts`
- Create: `src/__tests__/version.test.ts`

- [ ] **Step 1: Write failing tests for suggestNextVersion**

Create `src/__tests__/version.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { suggestNextVersion } from "@/shared/steps";

describe("suggestNextVersion", () => {
	it("returns null when no existing names", () => {
		expect(suggestNextVersion([])).toBeNull();
	});

	it("returns null when latest name is not semver-parseable", () => {
		expect(suggestNextVersion(["Release Alpha"])).toBeNull();
		expect(suggestNextVersion(["hotfix"])).toBeNull();
	});

	it("parses simple semver without prefix", () => {
		const result = suggestNextVersion(["1.0.2"]);
		expect(result).toEqual({
			prefix: "",
			patch: "1.0.3",
			minor: "1.1.0",
			major: "2.0.0",
		});
	});

	it("detects and preserves 'Version ' prefix", () => {
		const result = suggestNextVersion(["Version 1.0.2"]);
		expect(result).toEqual({
			prefix: "Version ",
			patch: "Version 1.0.3",
			minor: "Version 1.1.0",
			major: "Version 2.0.0",
		});
	});

	it("detects and preserves 'v' prefix", () => {
		const result = suggestNextVersion(["v2.3.1"]);
		expect(result).toEqual({
			prefix: "v",
			patch: "v2.3.2",
			minor: "v2.4.0",
			major: "v3.0.0",
		});
	});

	it("uses first name in array (assumes sorted by date desc)", () => {
		const result = suggestNextVersion(["Version 2.0.0", "Version 1.0.0"]);
		expect(result).toEqual({
			prefix: "Version ",
			patch: "Version 2.0.1",
			minor: "Version 2.1.0",
			major: "Version 3.0.0",
		});
	});

	it("handles version 0.0.0", () => {
		const result = suggestNextVersion(["0.0.0"]);
		expect(result).toEqual({
			prefix: "",
			patch: "0.0.1",
			minor: "0.1.0",
			major: "1.0.0",
		});
	});

	it("handles two-segment versions as non-parseable", () => {
		expect(suggestNextVersion(["1.0"])).toBeNull();
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun run test`

Expected: FAIL — `suggestNextVersion` is not exported from `@/shared/steps`.

- [ ] **Step 3: Implement suggestNextVersion**

Add to the end of `src/shared/steps.ts`:

```typescript
export function suggestNextVersion(
	existingNames: string[],
): { prefix: string; patch: string; minor: string; major: string } | null {
	const latest = existingNames[0];
	if (!latest) return null;

	const match = latest.match(/^(.*?)(\d+\.\d+\.\d+)$/);
	if (!match) return null;

	const prefix = match[1] ?? "";
	const versionStr = match[2] ?? "";
	const parts = versionStr.split(".").map(Number);
	if (parts.length !== 3) return null;

	const [maj = 0, min = 0, pat = 0] = parts;

	return {
		prefix,
		patch: `${prefix}${maj}.${min}.${pat + 1}`,
		minor: `${prefix}${maj}.${min + 1}.0`,
		major: `${prefix}${maj + 1}.0.0`,
	};
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run test`

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/steps.ts src/__tests__/version.test.ts
git commit -m "feat: add suggestNextVersion function with prefix detection"
```

---

## Task 4: Backend — New Queries, Activity Logging, Validation

**Files:**
- Modify: `src/server/api/routers/release.ts`

- [ ] **Step 1: Rewrite the release router with all new functionality**

Replace the entire contents of `src/server/api/routers/release.ts`:

```typescript
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { activityLog, releases } from "@/server/db/schema";
import {
	canCompleteStep,
	computeStatus,
	getDependentSteps,
	RELEASE_STEPS,
	suggestNextVersion,
	type StepId,
} from "@/shared/steps";
import { createTRPCRouter, publicProcedure } from "../trpc";

function startOfToday(): Date {
	const now = new Date();
	now.setHours(0, 0, 0, 0);
	return now;
}

export const releaseRouter = createTRPCRouter({
	list: publicProcedure.query(async ({ ctx }) => {
		const rows = await ctx.db.query.releases.findMany({
			orderBy: (r, { desc }) => [desc(r.date)],
		});
		return rows.map((r) => ({
			...r,
			status: computeStatus(r.completedSteps),
		}));
	}),

	getById: publicProcedure
		.input(z.object({ id: z.number() }))
		.query(async ({ ctx, input }) => {
			const release = await ctx.db.query.releases.findFirst({
				where: eq(releases.id, input.id),
			});
			if (!release) {
				throw new Error("Release not found");
			}
			return {
				...release,
				status: computeStatus(release.completedSteps),
			};
		}),

	suggestVersion: publicProcedure.query(async ({ ctx }) => {
		const rows = await ctx.db.query.releases.findMany({
			columns: { name: true },
			orderBy: (r, { desc }) => [desc(r.date)],
		});
		return suggestNextVersion(rows.map((r) => r.name));
	}),

	getOngoing: publicProcedure.query(async ({ ctx }) => {
		const rows = await ctx.db.query.releases.findMany({
			orderBy: (r, { desc }) => [desc(r.date)],
		});
		const ongoing = rows
			.map((r) => ({
				id: r.id,
				name: r.name,
				completedCount: r.completedSteps.length,
				totalSteps: RELEASE_STEPS.length,
				status: computeStatus(r.completedSteps),
			}))
			.filter((r) => r.status === "ongoing");
		return ongoing.length > 0 ? ongoing[0]! : null;
	}),

	getActivityLog: publicProcedure
		.input(z.object({ releaseId: z.number() }))
		.query(async ({ ctx, input }) => {
			const rows = await ctx.db
				.select()
				.from(activityLog)
				.where(eq(activityLog.releaseId, input.releaseId))
				.orderBy(desc(activityLog.createdAt));
			return rows;
		}),

	create: publicProcedure
		.input(
			z.object({
				name: z.string().min(1),
				date: z.date(),
				additionalInfo: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const today = startOfToday();
			if (input.date < today) {
				throw new Error("Release date cannot be in the past");
			}

			const rows = await ctx.db
				.insert(releases)
				.values({
					name: input.name,
					date: input.date,
					additionalInfo: input.additionalInfo ?? null,
					completedSteps: [],
					stepCompletedAt: {},
				})
				.returning();

			const created = rows[0];
			if (created) {
				await ctx.db.insert(activityLog).values({
					releaseId: created.id,
					action: "created",
					detail: created.name,
				});
			}

			return created;
		}),

	update: publicProcedure
		.input(
			z.object({
				id: z.number(),
				name: z.string().min(1),
				date: z.date(),
				additionalInfo: z.string().nullable(),
				completedSteps: z.array(z.string()),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const current = await ctx.db.query.releases.findFirst({
				where: eq(releases.id, input.id),
			});
			if (!current) throw new Error("Release not found");

			const oldSteps = new Set(current.completedSteps);
			const newSteps = new Set(input.completedSteps);

			// Enforce step dependencies
			for (const stepId of newSteps) {
				if (!canCompleteStep(stepId as StepId, input.completedSteps)) {
					throw new Error(
						`Cannot complete "${stepId}" — prerequisite not met`,
					);
				}
			}

			// Build updated stepCompletedAt
			const now = new Date().toISOString();
			const stepCompletedAt = { ...current.stepCompletedAt };
			const newlyCompleted: string[] = [];
			const newlyUncompleted: string[] = [];

			for (const stepId of newSteps) {
				if (!oldSteps.has(stepId)) {
					stepCompletedAt[stepId] = now;
					newlyCompleted.push(stepId);
				}
			}

			for (const stepId of oldSteps) {
				if (!newSteps.has(stepId)) {
					delete stepCompletedAt[stepId];
					newlyUncompleted.push(stepId);
				}
			}

			const { id, ...data } = input;
			const rows = await ctx.db
				.update(releases)
				.set({ ...data, stepCompletedAt })
				.where(eq(releases.id, id))
				.returning();

			// Log activity events
			const events: { releaseId: number; action: string; detail: string }[] =
				[];

			for (const stepId of newlyCompleted) {
				const step = RELEASE_STEPS.find((s) => s.id === stepId);
				events.push({
					releaseId: id,
					action: "step_completed",
					detail: step?.label ?? stepId,
				});
			}

			for (const stepId of newlyUncompleted) {
				const step = RELEASE_STEPS.find((s) => s.id === stepId);
				events.push({
					releaseId: id,
					action: "step_uncompleted",
					detail: step?.label ?? stepId,
				});
			}

			if (current.name !== input.name) {
				events.push({
					releaseId: id,
					action: "name_updated",
					detail: `${current.name} → ${input.name}`,
				});
			}

			if (current.date.getTime() !== input.date.getTime()) {
				events.push({
					releaseId: id,
					action: "date_updated",
					detail: input.date.toISOString(),
				});
			}

			if (current.additionalInfo !== input.additionalInfo) {
				events.push({
					releaseId: id,
					action: "info_updated",
					detail: "Additional info updated",
				});
			}

			if (events.length > 0) {
				await ctx.db.insert(activityLog).values(events);
			}

			return rows[0];
		}),

	delete: publicProcedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.db.delete(releases).where(eq(releases.id, input.id));
		}),
});
```

- [ ] **Step 2: Run type check**

Run: `bun run typecheck`

Expected: No errors. The new imports (`activityLog`, `canCompleteStep`, `getDependentSteps`, `suggestNextVersion`) should resolve.

- [ ] **Step 3: Commit**

```bash
git add src/server/api/routers/release.ts
git commit -m "feat: add activity logging, version suggestion, step dep validation to API"
```

---

## Task 5: Install Required shadcn Components

**Files:**
- New shadcn components will be generated in `src/components/ui/`

- [ ] **Step 1: Install alert-dialog, popover, and collapsible**

Run these commands:

```bash
bunx shadcn@latest add alert-dialog --yes
bunx shadcn@latest add popover --yes
bunx shadcn@latest add collapsible --yes
```

Expected: Components created at `src/components/ui/alert-dialog.tsx`, `src/components/ui/popover.tsx`, `src/components/ui/collapsible.tsx`.

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/alert-dialog.tsx src/components/ui/popover.tsx src/components/ui/collapsible.tsx
git commit -m "feat: add alert-dialog, popover, collapsible shadcn components"
```

---

## Task 6: Delete Dialog Component

**Files:**
- Create: `src/app/_components/delete-dialog.tsx`

- [ ] **Step 1: Create the delete dialog component**

Create `src/app/_components/delete-dialog.tsx`:

```tsx
"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function DeleteDialog({
	releaseName,
	onConfirm,
	disabled,
	trigger,
}: {
	releaseName: string;
	onConfirm: () => void;
	disabled?: boolean;
	trigger: React.ReactNode;
}) {
	return (
		<AlertDialog>
			<AlertDialogTrigger asChild disabled={disabled}>
				{trigger}
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete release?</AlertDialogTitle>
					<AlertDialogDescription>
						<strong className="text-foreground">{releaseName}</strong> and its
						activity history will be permanently deleted. This action cannot be
						undone.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction
						className="bg-destructive text-white hover:bg-destructive/90"
						onClick={onConfirm}
					>
						Delete
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/_components/delete-dialog.tsx
git commit -m "feat: add styled delete dialog component"
```

---

## Task 7: Activity Log Component

**Files:**
- Create: `src/app/_components/activity-log.tsx`

- [ ] **Step 1: Create the activity log component**

Create `src/app/_components/activity-log.tsx`:

```tsx
"use client";

import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { api } from "@/trpc/react";

const actionColors: Record<string, string> = {
	created: "bg-indigo-500",
	step_completed: "bg-emerald-500",
	step_uncompleted: "bg-amber-500",
	info_updated: "bg-blue-500",
	name_updated: "bg-blue-500",
	date_updated: "bg-blue-500",
};

const actionLabels: Record<string, string> = {
	created: "Release created",
	step_completed: "Completed",
	step_uncompleted: "Unchecked",
	info_updated: "Updated",
	name_updated: "Renamed",
	date_updated: "Date changed",
};

function formatRelativeTime(date: Date): string {
	const now = new Date();
	const diffMs = now.getTime() - new Date(date).getTime();
	const diffMin = Math.floor(diffMs / 60_000);

	if (diffMin < 1) return "Just now";
	if (diffMin < 60) return `${diffMin}m ago`;

	const diffHours = Math.floor(diffMin / 60);
	if (diffHours < 24) return `${diffHours}h ago`;

	const diffDays = Math.floor(diffHours / 24);
	if (diffDays < 7) return `${diffDays}d ago`;

	return new Date(date).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

export function ActivityLog({ releaseId }: { releaseId: number }) {
	const [open, setOpen] = useState(false);
	const { data: events } = api.release.getActivityLog.useQuery(
		{ releaseId },
		{ enabled: open },
	);

	return (
		<Collapsible onOpenChange={setOpen} open={open}>
			<CollapsibleTrigger asChild>
				<Button
					className="w-full justify-start gap-2"
					size="sm"
					type="button"
					variant="ghost"
				>
					<ChevronDownIcon
						className={`size-4 transition-transform ${open ? "" : "-rotate-90"}`}
					/>
					<span className="font-semibold">Activity</span>
					{events && (
						<span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs">
							{events.length} events
						</span>
					)}
				</Button>
			</CollapsibleTrigger>
			<CollapsibleContent>
				{events && events.length > 0 ? (
					<div className="ml-2 mt-3 border-l-2 border-muted pl-5">
						{events.map((event) => (
							<div className="relative mb-4 last:mb-0" key={event.id}>
								<div
									className={`absolute -left-[27px] top-1 size-2.5 rounded-full ${actionColors[event.action] ?? "bg-gray-400"}`}
								/>
								<div className="text-sm text-foreground">
									{event.action === "created" ? (
										<strong>Release created</strong>
									) : (
										<>
											{actionLabels[event.action] ?? event.action}{" "}
											<strong>{event.detail}</strong>
										</>
									)}
								</div>
								<div className="text-muted-foreground text-xs">
									{formatRelativeTime(event.createdAt)}
								</div>
							</div>
						))}
					</div>
				) : events ? (
					<p className="mt-2 text-muted-foreground text-sm">
						No activity yet.
					</p>
				) : null}
			</CollapsibleContent>
		</Collapsible>
	);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/_components/activity-log.tsx
git commit -m "feat: add collapsible activity log timeline component"
```

---

## Task 8: Version Autocomplete Component

**Files:**
- Create: `src/app/_components/version-autocomplete.tsx`

- [ ] **Step 1: Create the version autocomplete component**

Create `src/app/_components/version-autocomplete.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { api } from "@/trpc/react";

export function VersionAutocomplete({
	value,
	onChange,
}: {
	value: string;
	onChange: (value: string) => void;
}) {
	const [open, setOpen] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const { data: suggestion } = api.release.suggestVersion.useQuery();

	const suggestions = suggestion
		? [
				{ label: "patch", value: suggestion.patch },
				{ label: "minor", value: suggestion.minor },
				{ label: "major", value: suggestion.major },
			]
		: [];

	useEffect(() => {
		if (suggestion && !value) {
			onChange(suggestion.patch);
		}
	}, [suggestion, value, onChange]);

	return (
		<Popover onOpenChange={setOpen} open={open && suggestions.length > 0}>
			<PopoverTrigger asChild>
				<Input
					id="release-name"
					onChange={(e) => onChange(e.target.value)}
					onFocus={() => setOpen(true)}
					placeholder="e.g. Version 1.0.0"
					ref={inputRef}
					required
					type="text"
					value={value}
				/>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				className="w-[var(--radix-popover-trigger-width)] p-0"
				onOpenAutoFocus={(e) => e.preventDefault()}
			>
				<div className="border-b px-3 py-2 text-muted-foreground text-xs">
					Suggested versions
				</div>
				{suggestions.map((s) => (
					<button
						className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
							value === s.value ? "bg-accent font-medium" : ""
						}`}
						key={s.label}
						onClick={() => {
							onChange(s.value);
							setOpen(false);
							inputRef.current?.focus();
						}}
						type="button"
					>
						{s.value}
						<span className="text-muted-foreground text-xs">— {s.label}</span>
					</button>
				))}
			</PopoverContent>
		</Popover>
	);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/_components/version-autocomplete.tsx
git commit -m "feat: add version autocomplete component with semver suggestions"
```

---

## Task 9: Release Form Integration

**Files:**
- Modify: `src/app/_components/release-form.tsx`
- Modify: `src/app/_components/release-detail.tsx`
- Modify: `src/app/release/new/page.tsx`

- [ ] **Step 1: Update release-detail.tsx to pass stepCompletedAt**

Replace the entire contents of `src/app/_components/release-detail.tsx`:

```tsx
"use client";

import type { ReleaseStatus } from "@/shared/steps";
import { api } from "@/trpc/react";
import { ReleaseForm } from "./release-form";

type InitialRelease = {
	id: number;
	name: string;
	date: Date;
	additionalInfo: string | null;
	completedSteps: string[];
	stepCompletedAt: Record<string, string>;
	createdAt: Date;
	updatedAt: Date;
	status: ReleaseStatus;
};

export function ReleaseDetail({
	release: initial,
}: {
	release: InitialRelease;
}) {
	const { data: release } = api.release.getById.useQuery(
		{ id: initial.id },
		{ initialData: initial },
	);

	return (
		<ReleaseForm
			release={{
				id: release.id,
				name: release.name,
				date: release.date,
				additionalInfo: release.additionalInfo,
				completedSteps: release.completedSteps,
				stepCompletedAt: release.stepCompletedAt,
			}}
		/>
	);
}
```

- [ ] **Step 2: Update new release page to prefetch suggestions and ongoing**

Replace the entire contents of `src/app/release/new/page.tsx`:

```tsx
import { ReleaseForm } from "@/app/_components/release-form";
import { api, HydrateClient } from "@/trpc/server";

export default async function NewReleasePage() {
	void api.release.suggestVersion.prefetch();
	void api.release.getOngoing.prefetch();

	return (
		<HydrateClient>
			<ReleaseForm />
		</HydrateClient>
	);
}
```

- [ ] **Step 3: Rewrite release-form.tsx with all new features**

Replace the entire contents of `src/app/_components/release-form.tsx`:

```tsx
"use client";

import { ChevronRightIcon, SaveIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardHeader,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	canCompleteStep,
	getBlockedReason,
	getDependentSteps,
	RELEASE_STEPS,
	type StepId,
} from "@/shared/steps";
import { api } from "@/trpc/react";
import { ActivityLog } from "./activity-log";
import { DeleteDialog } from "./delete-dialog";
import { VersionAutocomplete } from "./version-autocomplete";

type ReleaseData = {
	id: number;
	name: string;
	date: Date;
	additionalInfo: string | null;
	completedSteps: string[];
	stepCompletedAt: Record<string, string>;
};

function toDateInputValue(date: Date): string {
	return new Date(date).toISOString().split("T")[0] ?? "";
}

function todayString(): string {
	return new Date().toISOString().split("T")[0] ?? "";
}

function formatRelativeTime(isoString: string): string {
	const now = new Date();
	const then = new Date(isoString);
	const diffMs = now.getTime() - then.getTime();
	const diffMin = Math.floor(diffMs / 60_000);

	if (diffMin < 1) return "just now";
	if (diffMin < 60) return `${diffMin}m ago`;

	const diffHours = Math.floor(diffMin / 60);
	if (diffHours < 24) return `${diffHours}h ago`;

	const diffDays = Math.floor(diffHours / 24);
	if (diffDays < 7) return `${diffDays}d ago`;

	return then.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
}

export function ReleaseForm({ release }: { release?: ReleaseData }) {
	const router = useRouter();
	const isNew = !release;

	const [name, setName] = useState(release?.name ?? "");
	const [date, setDate] = useState(
		release ? toDateInputValue(release.date) : todayString(),
	);
	const [additionalInfo, setAdditionalInfo] = useState(
		release?.additionalInfo ?? "",
	);
	const [completedSteps, setCompletedSteps] = useState<string[]>(
		release?.completedSteps ?? [],
	);
	const [saving, setSaving] = useState(false);

	const utils = api.useUtils();

	const { data: ongoingRelease } = api.release.getOngoing.useQuery(
		undefined,
		{ enabled: isNew },
	);

	const createMutation = api.release.create.useMutation({
		onSuccess: (data) => {
			utils.release.list.invalidate();
			utils.release.suggestVersion.invalidate();
			if (data) router.push(`/release/${data.id}`);
		},
	});

	const updateMutation = api.release.update.useMutation({
		onSuccess: () => {
			utils.release.list.invalidate();
			utils.release.getById.invalidate({ id: release?.id });
			utils.release.getActivityLog.invalidate({
				releaseId: release?.id,
			});
		},
	});

	const deleteMutation = api.release.delete.useMutation({
		onSuccess: () => {
			utils.release.list.invalidate();
			router.push("/");
		},
	});

	const handleNameChange = useCallback((value: string) => {
		setName(value);
	}, []);

	function toggleStep(stepId: string) {
		setCompletedSteps((prev) => {
			if (prev.includes(stepId)) {
				const dependents = getDependentSteps(stepId as StepId);
				return prev.filter((s) => s !== stepId && !dependents.includes(s as StepId));
			}
			return [...prev, stepId];
		});
	}

	async function handleSave() {
		if (!name.trim() || !date) return;
		setSaving(true);
		try {
			if (isNew) {
				await createMutation.mutateAsync({
					name: name.trim(),
					date: new Date(date),
					additionalInfo: additionalInfo.trim() || undefined,
				});
			} else {
				await updateMutation.mutateAsync({
					id: release.id,
					name: name.trim(),
					date: new Date(date),
					additionalInfo: additionalInfo.trim() || null,
					completedSteps,
				});
			}
		} finally {
			setSaving(false);
		}
	}

	function handleDelete() {
		if (!release) return;
		deleteMutation.mutate({ id: release.id });
	}

	const completedCount = completedSteps.length;
	const totalSteps = RELEASE_STEPS.length;
	const progressPercent = Math.round((completedCount / totalSteps) * 100);

	return (
		<Card>
			<CardHeader className="border-b">
				<nav className="flex items-center gap-1.5 text-sm">
					<Button asChild size="sm" variant="link">
						<Link href="/">All releases</Link>
					</Button>
					<ChevronRightIcon
						aria-hidden="true"
						className="size-4 text-muted-foreground"
					/>
					<span className="font-medium text-foreground">
						{isNew ? "New release" : release.name}
					</span>
				</nav>
				{!isNew && (
					<CardAction>
						<DeleteDialog
							disabled={deleteMutation.isPending}
							onConfirm={handleDelete}
							releaseName={release.name}
							trigger={
								<Button type="button" variant="destructive">
									Delete
									<Trash2Icon aria-hidden="true" data-icon="inline-end" />
								</Button>
							}
						/>
					</CardAction>
				)}
			</CardHeader>

			<CardContent>
				{isNew && ongoingRelease && (
					<div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
						<span className="mt-0.5 text-lg">⚠️</span>
						<div>
							<p className="font-medium text-amber-900 text-sm dark:text-amber-200">
								{ongoingRelease.name} is still ongoing (
								{ongoingRelease.completedCount}/{ongoingRelease.totalSteps}{" "}
								steps)
							</p>
							<p className="text-amber-700 text-xs dark:text-amber-300">
								Are you sure you want to create a new release?
							</p>
						</div>
					</div>
				)}

				<div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="release-name">Release</Label>
						{isNew ? (
							<VersionAutocomplete
								onChange={handleNameChange}
								value={name}
							/>
						) : (
							<Input
								id="release-name"
								onChange={(e) => setName(e.target.value)}
								placeholder="e.g. Version 1.0.0"
								required
								type="text"
								value={name}
							/>
						)}
					</div>
					<div className="space-y-2">
						<Label htmlFor="release-date">Date</Label>
						<Input
							id="release-date"
							min={isNew ? todayString() : undefined}
							onChange={(e) => setDate(e.target.value)}
							required
							type="date"
							value={date}
						/>
					</div>
				</div>

				{!isNew && (
					<>
						<div className="mb-4">
							<div className="mb-2 flex items-center justify-between text-sm">
								<span className="text-muted-foreground">Progress</span>
								<span className="font-semibold text-primary">
									{completedCount} / {totalSteps} steps
								</span>
							</div>
							<div className="h-2 overflow-hidden rounded-full bg-muted">
								<div
									className="h-full rounded-full bg-primary transition-all duration-300"
									style={{ width: `${progressPercent}%` }}
								/>
							</div>
						</div>

						<div className="mb-6 space-y-1">
							{RELEASE_STEPS.map((step) => {
								const isComplete = completedSteps.includes(step.id);
								const blocked = !isComplete && !canCompleteStep(step.id, completedSteps);
								const blockedReason = blocked
									? getBlockedReason(step.id, completedSteps)
									: null;
								const checkboxId = `release-step-${step.id}`;
								const timestamp =
									release.stepCompletedAt[step.id];

								return (
									<div
										className={`flex items-center gap-3 rounded-lg border border-transparent px-2 py-2 transition-colors ${
											blocked
												? "opacity-45"
												: isComplete
													? "bg-emerald-50 dark:bg-emerald-500/5"
													: "hover:bg-muted/50"
										}`}
										key={step.id}
									>
										<Checkbox
											checked={isComplete}
											disabled={blocked}
											id={checkboxId}
											onCheckedChange={() => toggleStep(step.id)}
										/>
										<Label
											className={`flex-1 ${
												blocked
													? "text-muted-foreground"
													: isComplete
														? "text-muted-foreground line-through"
														: "text-foreground"
											}`}
											htmlFor={checkboxId}
										>
											{step.label}
										</Label>
										{isComplete && timestamp && (
											<span className="whitespace-nowrap text-emerald-600 text-xs dark:text-emerald-400">
												✓ {formatRelativeTime(timestamp)}
											</span>
										)}
										{blockedReason && (
											<span className="whitespace-nowrap rounded bg-muted px-2 py-0.5 text-muted-foreground text-xs">
												Requires: {blockedReason}
											</span>
										)}
									</div>
								);
							})}
						</div>
					</>
				)}

				<div className="mb-6 space-y-2">
					<Label htmlFor="additional-info">Additional remarks / tasks</Label>
					<Textarea
						id="additional-info"
						onChange={(e) => setAdditionalInfo(e.target.value)}
						placeholder="Please enter any other important notes for the release"
						rows={4}
						value={additionalInfo}
					/>
				</div>

				<div className="mb-6 flex justify-end">
					<Button
						disabled={saving || !name.trim() || !date}
						onClick={handleSave}
						type="button"
					>
						{saving ? "Saving..." : "Save"}
						<SaveIcon aria-hidden="true" data-icon="inline-end" />
					</Button>
				</div>

				{!isNew && <ActivityLog releaseId={release.id} />}
			</CardContent>
		</Card>
	);
}
```

- [ ] **Step 4: Run type check**

Run: `bun run typecheck`

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/_components/release-form.tsx src/app/_components/release-detail.tsx src/app/release/new/page.tsx
git commit -m "feat: integrate version autocomplete, gating, deps, progress, activity log into release form"
```

---

## Task 10: Release List Integration

**Files:**
- Modify: `src/app/_components/release-list.tsx`

- [ ] **Step 1: Update release-list.tsx with delete dialog and progress**

Replace the entire contents of `src/app/_components/release-list.tsx`:

```tsx
"use client";

import { Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { RELEASE_STEPS } from "@/shared/steps";
import { api } from "@/trpc/react";
import { DeleteDialog } from "./delete-dialog";
import { StatusBadge } from "./status-badge";

export function ReleaseList() {
	const router = useRouter();
	const { data: releases, isLoading } = api.release.list.useQuery();
	const utils = api.useUtils();

	const deleteMutation = api.release.delete.useMutation({
		onSuccess: () => utils.release.list.invalidate(),
	});

	if (isLoading) {
		return (
			<p className="py-12 text-center text-muted-foreground">Loading...</p>
		);
	}

	if (!releases || releases.length === 0) {
		return (
			<p className="py-12 text-center text-muted-foreground">
				No releases yet. Create your first one!
			</p>
		);
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Release</TableHead>
					<TableHead>Date</TableHead>
					<TableHead>Progress</TableHead>
					<TableHead>Status</TableHead>
					<TableHead className="text-right" />
				</TableRow>
			</TableHeader>
			<TableBody>
				{releases.map((release) => (
					<TableRow
						className="cursor-pointer"
						key={release.id}
						onClick={() => router.push(`/release/${release.id}`)}
					>
						<TableCell className="font-medium">{release.name}</TableCell>
						<TableCell className="text-muted-foreground">
							{new Date(release.date).toLocaleDateString("en-US", {
								year: "numeric",
								month: "long",
								day: "numeric",
							})}
						</TableCell>
						<TableCell className="text-muted-foreground text-sm">
							{release.completedSteps.length}/{RELEASE_STEPS.length}
						</TableCell>
						<TableCell>
							<StatusBadge status={release.status} />
						</TableCell>
						<TableCell className="text-right">
							<DeleteDialog
								disabled={deleteMutation.isPending}
								onConfirm={() => deleteMutation.mutate({ id: release.id })}
								releaseName={release.name}
								trigger={
									<Button
										aria-label={`Delete ${release.name}`}
										className="text-muted-foreground hover:text-destructive"
										onClick={(e) => e.stopPropagation()}
										size="icon-sm"
										type="button"
										variant="ghost"
									>
										<Trash2Icon aria-hidden="true" />
									</Button>
								}
							/>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
```

- [ ] **Step 2: Run type check**

Run: `bun run typecheck`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/_components/release-list.tsx
git commit -m "feat: add delete dialog and progress column to release list"
```

---

## Task 11: Frontend Test Setup + Component Tests

**Files:**
- Modify: `package.json` (add dev dependencies)
- Modify: `vitest.config.ts` (add React + jsdom support)
- Create: `src/__tests__/components/delete-dialog.test.tsx`
- Create: `src/__tests__/components/release-form.test.tsx`

- [ ] **Step 1: Install testing dependencies**

Run:

```bash
bun add -d @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 2: Update vitest config for React component testing**

Replace the entire contents of `vitest.config.ts`:

```typescript
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	test: {
		include: ["src/**/*.test.{ts,tsx}"],
		environment: "jsdom",
		setupFiles: [],
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
		},
	},
});
```

- [ ] **Step 3: Verify existing tests still pass**

Run: `bun run test`

Expected: All tests in `steps.test.ts`, `dependencies.test.ts`, `version.test.ts` PASS.

- [ ] **Step 4: Create delete dialog component test**

Create `src/__tests__/components/delete-dialog.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DeleteDialog } from "@/app/_components/delete-dialog";

describe("DeleteDialog", () => {
	it("renders the trigger button", () => {
		render(
			<DeleteDialog
				onConfirm={() => {}}
				releaseName="Version 1.0.0"
				trigger={<button type="button">Delete</button>}
			/>,
		);
		expect(screen.getByText("Delete")).toBeInTheDocument();
	});

	it("shows dialog content when trigger is clicked", async () => {
		const user = userEvent.setup();
		render(
			<DeleteDialog
				onConfirm={() => {}}
				releaseName="Version 1.0.0"
				trigger={<button type="button">Delete</button>}
			/>,
		);

		await user.click(screen.getByText("Delete"));

		expect(screen.getByText("Delete release?")).toBeInTheDocument();
		expect(screen.getByText("Version 1.0.0")).toBeInTheDocument();
		expect(
			screen.getByText(/permanently deleted/),
		).toBeInTheDocument();
	});

	it("calls onConfirm when Delete is confirmed", async () => {
		const onConfirm = vi.fn();
		const user = userEvent.setup();

		render(
			<DeleteDialog
				onConfirm={onConfirm}
				releaseName="Version 1.0.0"
				trigger={<button type="button">Open</button>}
			/>,
		);

		await user.click(screen.getByText("Open"));
		await user.click(screen.getByRole("button", { name: "Delete" }));

		expect(onConfirm).toHaveBeenCalledOnce();
	});

	it("does not call onConfirm when Cancel is clicked", async () => {
		const onConfirm = vi.fn();
		const user = userEvent.setup();

		render(
			<DeleteDialog
				onConfirm={onConfirm}
				releaseName="Version 1.0.0"
				trigger={<button type="button">Open</button>}
			/>,
		);

		await user.click(screen.getByText("Open"));
		await user.click(screen.getByRole("button", { name: "Cancel" }));

		expect(onConfirm).not.toHaveBeenCalled();
	});
});
```

- [ ] **Step 5: Run component tests**

Run: `bun run test`

Expected: All tests PASS including the new delete dialog tests.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts package.json bun.lockb src/__tests__/components/delete-dialog.test.tsx
git commit -m "feat: add frontend test setup and delete dialog component tests"
```

---

## Task 12: Manual Smoke Test

- [ ] **Step 1: Start dev server**

Run: `bun run dev`

- [ ] **Step 2: Test the full flow in browser**

Open `http://localhost:3000` and verify:

1. **List view** — shows progress column (N/10) for each release
2. **Delete from list** — trash icon opens styled AlertDialog modal, Cancel/Delete work correctly
3. **Create new release** — navigate to `/release/new`:
   - Version field shows autocomplete dropdown with patch/minor/major suggestions
   - Date defaults to today
   - If an ongoing release exists, warning banner is visible at top
   - Can select a suggestion or type custom name
   - Date input prevents past dates (min attribute)
4. **Detail view** — navigate to an existing release:
   - Steps 8-10 show "Requires: ..." pill when prerequisite not met, checkbox is disabled
   - Checking step 7 (deploy staging) enables step 8 (test staging)
   - Checking a step shows inline "✓ Xm ago" timestamp
   - Unchecking step 7 cascade-unchecks steps 8, 9, 10
   - Progress bar updates in real-time
   - Activity log at bottom loads events when expanded
   - Delete button opens styled modal
5. **Save and reload** — save a release, reload page, verify step timestamps and activity log persist

- [ ] **Step 3: Run full test suite**

Run: `bun run test`

Expected: All tests PASS.

- [ ] **Step 4: Run type check**

Run: `bun run typecheck`

Expected: No errors.

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address issues found during smoke testing"
```
