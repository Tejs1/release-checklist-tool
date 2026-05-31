import type { InferSelectModel } from "drizzle-orm";

import type { activityLog, releases } from "@/server/db/schema";
import { computeStatus, type ReleaseStatus } from "@/shared/steps";
import { builder } from "./builder";

type ReleaseRow = InferSelectModel<typeof releases>;
type ActivityRow = InferSelectModel<typeof activityLog>;

export const ReleaseStatusEnum = builder.enumType("ReleaseStatus", {
	values: ["planned", "ongoing", "done"] as const,
});

export const ReleaseType = builder.objectRef<ReleaseRow>("Release").implement({
	fields: (t) => ({
		id: t.exposeInt("id"),
		name: t.exposeString("name"),
		date: t.field({ type: "DateTime", resolve: (r) => r.date }),
		additionalInfo: t.exposeString("additionalInfo", { nullable: true }),
		completedSteps: t.exposeStringList("completedSteps"),
		stepCompletedAt: t.field({
			type: "JSON",
			resolve: (r) => r.stepCompletedAt,
		}),
		createdAt: t.field({ type: "DateTime", resolve: (r) => r.createdAt }),
		updatedAt: t.field({ type: "DateTime", resolve: (r) => r.updatedAt }),
		// Computed from completedSteps — replaces the manual `.map()` the tRPC
		// `list`/`getById` resolvers used to do.
		status: t.field({
			type: ReleaseStatusEnum,
			resolve: (r) => computeStatus(r.completedSteps),
		}),
	}),
});

export const ActivityEventType = builder
	.objectRef<ActivityRow>("ActivityEvent")
	.implement({
		fields: (t) => ({
			id: t.exposeInt("id"),
			releaseId: t.exposeInt("releaseId"),
			action: t.exposeString("action"),
			detail: t.exposeString("detail", { nullable: true }),
			createdAt: t.field({ type: "DateTime", resolve: (r) => r.createdAt }),
		}),
	});

type OngoingReleaseShape = {
	id: number;
	name: string;
	completedCount: number;
	totalSteps: number;
	status: ReleaseStatus;
};

export const OngoingReleaseType = builder
	.objectRef<OngoingReleaseShape>("OngoingRelease")
	.implement({
		fields: (t) => ({
			id: t.exposeInt("id"),
			name: t.exposeString("name"),
			completedCount: t.exposeInt("completedCount"),
			totalSteps: t.exposeInt("totalSteps"),
			status: t.field({
				type: ReleaseStatusEnum,
				resolve: (r) => r.status,
			}),
		}),
	});

type VersionSuggestionShape = {
	prefix: string;
	patch: string;
	minor: string;
	major: string;
};

export const VersionSuggestionType = builder
	.objectRef<VersionSuggestionShape>("VersionSuggestion")
	.implement({
		fields: (t) => ({
			prefix: t.exposeString("prefix"),
			patch: t.exposeString("patch"),
			minor: t.exposeString("minor"),
			major: t.exposeString("major"),
		}),
	});
