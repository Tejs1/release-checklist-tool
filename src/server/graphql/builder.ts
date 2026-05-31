import SchemaBuilder from "@pothos/core";
import { DateTimeISOResolver, JSONResolver } from "graphql-scalars";

import type { GraphQLContext } from "./context";

/**
 * The Pothos code-first schema builder. Custom scalars:
 * - `DateTime` parses to / serializes from a JS `Date` (ISO 8601 on the wire).
 * - `JSON` carries the `stepCompletedAt` map (`Record<string, string>`).
 *
 * `import type` keeps this module free of runtime database imports so the
 * schema can be built (e.g. for SDL emission) without a `DATABASE_URL`.
 */
export const builder = new SchemaBuilder<{
	// `v3` defaults: output fields are non-nullable unless explicitly marked
	// nullable (matches the SDL the spec describes).
	Defaults: "v3";
	Context: GraphQLContext;
	Scalars: {
		DateTime: { Input: Date; Output: Date };
		JSON: { Input: Record<string, string>; Output: Record<string, string> };
	};
}>({ defaults: "v3" });

builder.addScalarType("DateTime", DateTimeISOResolver);
builder.addScalarType("JSON", JSONResolver);

builder.queryType({});
builder.mutationType({});
