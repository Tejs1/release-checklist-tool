import "server-only";

import {
	dehydrate,
	HydrationBoundary,
	type QueryKey,
} from "@tanstack/react-query";
import type { TadaDocumentNode } from "gql.tada";
import { execute } from "graphql";
import { cache } from "react";

import { createContext } from "@/server/graphql/context";
import { schema } from "@/server/graphql/schema";
import { createQueryClient } from "./query-client";

/**
 * Run a GraphQL operation in-process against the schema (no HTTP round-trip).
 * Used by React Server Components for SSR and `notFound()` handling.
 */
export async function gqlServer<Result, Variables>(
	document: TadaDocumentNode<Result, Variables>,
	variables?: Variables,
): Promise<Result> {
	const result = await execute({
		schema,
		document,
		contextValue: createContext(),
		variableValues: variables as Record<string, unknown> | undefined,
	});

	if (result.errors?.length) {
		throw new Error(result.errors[0]?.message ?? "GraphQL execution error");
	}

	// graphql-js builds result maps with null-prototype objects, which React's
	// Server->Client serializer rejects when the dehydrated cache crosses into
	// a Client Component. Round-trip to plain objects (data is already
	// JSON-serializable: scalars produce strings/numbers). The client transport
	// returns plain objects already, so this only matters for in-process runs.
	return JSON.parse(JSON.stringify(result.data)) as Result;
}

// One QueryClient per request, shared between prefetch and HydrateClient.
const getQueryClient = cache(createQueryClient);

/**
 * Prefetch an operation into the per-request QueryClient so client components
 * with a matching `queryKey` hydrate without an extra fetch.
 */
export async function prefetchQuery<Result, Variables>(
	queryKey: QueryKey,
	document: TadaDocumentNode<Result, Variables>,
	variables?: Variables,
): Promise<void> {
	const queryClient = getQueryClient();
	await queryClient.prefetchQuery({
		queryKey,
		queryFn: () => gqlServer(document, variables),
	});
}

export function HydrateClient({ children }: { children: React.ReactNode }) {
	const queryClient = getQueryClient();
	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			{children}
		</HydrationBoundary>
	);
}
