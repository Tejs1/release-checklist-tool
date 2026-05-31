import { neon } from "@neondatabase/serverless";
import {
	drizzle as drizzleNeon,
	type NeonHttpDatabase,
} from "drizzle-orm/neon-http";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/env";
import * as schema from "./schema";

/**
 * Choose the driver from the connection string:
 * - Neon endpoints use the serverless HTTP driver (ideal on Vercel/serverless).
 * - Any other Postgres (e.g. the local Docker container) uses a standard TCP
 *   connection, so the backend runs locally without a Neon proxy.
 *
 * Drizzle's relational query API and query builders are driver-agnostic, so the
 * rest of the app is typed against a single database type.
 */
const isNeon = /neon\.tech/.test(env.DATABASE_URL);

export const db: NeonHttpDatabase<typeof schema> = isNeon
	? drizzleNeon(neon(env.DATABASE_URL), { schema })
	: (drizzlePostgres(postgres(env.DATABASE_URL), {
			schema,
		}) as unknown as NeonHttpDatabase<typeof schema>);
