import { eq } from "drizzle-orm";
import { z } from "zod";

import { releases } from "@/server/db/schema";
import { computeStatus } from "@/shared/steps";
import { createTRPCRouter, publicProcedure } from "../trpc";

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

	create: publicProcedure
		.input(
			z.object({
				name: z.string().min(1),
				date: z.date(),
				additionalInfo: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const rows = await ctx.db
				.insert(releases)
				.values({
					name: input.name,
					date: input.date,
					additionalInfo: input.additionalInfo ?? null,
					completedSteps: [],
				})
				.returning();
			return rows[0];
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
			const { id, ...data } = input;
			const rows = await ctx.db
				.update(releases)
				.set(data)
				.where(eq(releases.id, id))
				.returning();
			return rows[0];
		}),

	delete: publicProcedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.db.delete(releases).where(eq(releases.id, input.id));
		}),
});
