import { initGraphQLTada } from "gql.tada";

import type { introspection } from "@/graphql-env";

/**
 * The typed `graphql` document tag. Scalar mappings:
 * - `DateTime` is an ISO string on the wire (we wrap in `new Date()` where needed).
 * - `JSON` carries the `stepCompletedAt` map.
 */
export const graphql = initGraphQLTada<{
	introspection: introspection;
	scalars: {
		DateTime: string;
		JSON: Record<string, string>;
	};
}>();

export type { FragmentOf, ResultOf, VariablesOf } from "gql.tada";
