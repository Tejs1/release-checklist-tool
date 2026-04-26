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

			for (const stepId of newSteps) {
				if (!canCompleteStep(stepId as StepId, input.completedSteps)) {
					throw new Error(
						`Cannot complete "${stepId}" — prerequisite not met`,
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

			const { id, ...data } = input;
			const rows = await ctx.db
				.update(releases)
				.set({ ...data, stepCompletedAt })
				.where(eq(releases.id, id))
				.returning();

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
