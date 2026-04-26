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
