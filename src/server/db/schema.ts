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
	createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
	updatedAt: d
		.timestamp({ withTimezone: true })
		.defaultNow()
		.notNull()
		.$onUpdate(() => new Date()),
}));
