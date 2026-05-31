import { and, desc, eq, ne } from "drizzle-orm";
import { GraphQLError } from "graphql";

import { activityLog, releases } from "@/server/db/schema";
import {
	canCompleteStep,
	computeStatus,
	RELEASE_STEPS,
	type StepId,
	suggestNextVersion,
} from "@/shared/steps";
import { builder } from "./builder";
import {
	ActivityEventType,
	OngoingReleaseType,
	ReleaseType,
	VersionSuggestionType,
} from "./types";

function startOfToday(): Date {
	const now = new Date();
	now.setHours(0, 0, 0, 0);
	return now;
}

const CreateReleaseInput = builder.inputType("CreateReleaseInput", {
	fields: (t) => ({
		name: t.string({ required: true }),
		date: t.field({ type: "DateTime", required: true }),
		additionalInfo: t.string({ required: false }),
	}),
});

const UpdateReleaseInput = builder.inputType("UpdateReleaseInput", {
	fields: (t) => ({
		id: t.int({ required: true }),
		name: t.string({ required: true }),
		date: t.field({ type: "DateTime", required: true }),
		additionalInfo: t.string({ required: false }),
		completedSteps: t.stringList({ required: true }),
	}),
});

builder.queryFields((t) => ({
	releases: t.field({
		type: [ReleaseType],
		resolve: async (_parent, _args, ctx) => {
			return ctx.db.query.releases.findMany({
				orderBy: (r, { desc }) => [desc(r.date)],
			});
		},
	}),

	release: t.field({
		type: ReleaseType,
		nullable: true,
		args: { id: t.arg.int({ required: true }) },
		resolve: async (_parent, { id }, ctx) => {
			const release = await ctx.db.query.releases.findFirst({
				where: eq(releases.id, id),
			});
			return release ?? null;
		},
	}),

	suggestVersion: t.field({
		type: VersionSuggestionType,
		nullable: true,
		resolve: async (_parent, _args, ctx) => {
			const rows = await ctx.db.query.releases.findMany({
				columns: { name: true },
				orderBy: (r, { desc }) => [desc(r.date)],
			});
			return suggestNextVersion(rows.map((r) => r.name));
		},
	}),

	ongoingRelease: t.field({
		type: OngoingReleaseType,
		nullable: true,
		resolve: async (_parent, _args, ctx) => {
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
			return ongoing[0] ?? null;
		},
	}),

	activityLog: t.field({
		type: [ActivityEventType],
		args: { releaseId: t.arg.int({ required: true }) },
		resolve: async (_parent, { releaseId }, ctx) => {
			return ctx.db
				.select()
				.from(activityLog)
				.where(eq(activityLog.releaseId, releaseId))
				.orderBy(desc(activityLog.createdAt));
		},
	}),
}));

builder.mutationFields((t) => ({
	createRelease: t.field({
		type: ReleaseType,
		args: { input: t.arg({ type: CreateReleaseInput, required: true }) },
		resolve: async (_parent, { input }, ctx) => {
			const today = startOfToday();
			if (input.date < today) {
				throw new GraphQLError("Release date cannot be in the past", {
					extensions: { code: "BAD_REQUEST" },
				});
			}

			const existing = await ctx.db.query.releases.findFirst({
				where: eq(releases.name, input.name.trim()),
			});
			if (existing) {
				throw new GraphQLError(
					`A release named "${input.name.trim()}" already exists`,
					{ extensions: { code: "CONFLICT" } },
				);
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
			if (!created) {
				throw new GraphQLError("Failed to create release");
			}

			await ctx.db.insert(activityLog).values({
				releaseId: created.id,
				action: "created",
				detail: created.name,
			});

			return created;
		},
	}),

	updateRelease: t.field({
		type: ReleaseType,
		args: { input: t.arg({ type: UpdateReleaseInput, required: true }) },
		resolve: async (_parent, { input }, ctx) => {
			const current = await ctx.db.query.releases.findFirst({
				where: eq(releases.id, input.id),
			});
			if (!current) {
				throw new GraphQLError("Release not found", {
					extensions: { code: "NOT_FOUND" },
				});
			}

			if (current.name !== input.name.trim()) {
				const duplicate = await ctx.db.query.releases.findFirst({
					where: and(
						eq(releases.name, input.name.trim()),
						ne(releases.id, input.id),
					),
				});
				if (duplicate) {
					throw new GraphQLError(
						`A release named "${input.name.trim()}" already exists`,
						{ extensions: { code: "CONFLICT" } },
					);
				}
			}

			const oldSteps = new Set(current.completedSteps);
			const newSteps = new Set(input.completedSteps);

			for (const stepId of newSteps) {
				if (!canCompleteStep(stepId as StepId, input.completedSteps)) {
					throw new GraphQLError(
						`Cannot complete "${stepId}" — prerequisite not met`,
						{ extensions: { code: "BAD_REQUEST" } },
					);
				}
			}

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

			const newInfo = input.additionalInfo ?? null;
			const rows = await ctx.db
				.update(releases)
				.set({
					name: input.name,
					date: input.date,
					additionalInfo: newInfo,
					completedSteps: input.completedSteps,
					stepCompletedAt,
				})
				.where(eq(releases.id, input.id))
				.returning();

			const updated = rows[0];
			if (!updated) {
				throw new GraphQLError("Release not found", {
					extensions: { code: "NOT_FOUND" },
				});
			}

			const events: { releaseId: number; action: string; detail: string }[] =
				[];

			for (const stepId of newlyCompleted) {
				const step = RELEASE_STEPS.find((s) => s.id === stepId);
				events.push({
					releaseId: input.id,
					action: "step_completed",
					detail: step?.label ?? stepId,
				});
			}

			for (const stepId of newlyUncompleted) {
				const step = RELEASE_STEPS.find((s) => s.id === stepId);
				events.push({
					releaseId: input.id,
					action: "step_uncompleted",
					detail: step?.label ?? stepId,
				});
			}

			if (current.name !== input.name) {
				events.push({
					releaseId: input.id,
					action: "name_updated",
					detail: `${current.name} → ${input.name}`,
				});
			}

			if (current.date.getTime() !== input.date.getTime()) {
				events.push({
					releaseId: input.id,
					action: "date_updated",
					detail: input.date.toISOString(),
				});
			}

			if (current.additionalInfo !== newInfo) {
				events.push({
					releaseId: input.id,
					action: "info_updated",
					detail: "Additional info updated",
				});
			}

			if (events.length > 0) {
				await ctx.db.insert(activityLog).values(events);
			}

			return updated;
		},
	}),

	deleteRelease: t.field({
		type: "Boolean",
		args: { id: t.arg.int({ required: true }) },
		resolve: async (_parent, { id }, ctx) => {
			await ctx.db.delete(releases).where(eq(releases.id, id));
			return true;
		},
	}),
}));
