import { db } from "@/server/db";

/**
 * The "context" available to every GraphQL resolver. Mirrors the old
 * tRPC `createTRPCContext` — currently just the database handle.
 */
export type GraphQLContext = {
	db: typeof db;
};

export function createContext(): GraphQLContext {
	return { db };
}
