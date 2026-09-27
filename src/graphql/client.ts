import type { TadaDocumentNode } from "gql.tada";
import { GraphQLClient } from "graphql-request";

/**
 * Absolute endpoint for the browser-side GraphQL transport.
 *
 * `graphql-request` builds its request URL with `new URL(endpoint)` and no
 * base, so a relative path like "/api/graphql" throws "Failed to construct
 * 'URL'". Client components only ever fetch from the browser (server renders
 * are satisfied by hydrated data or `gqlServer`), so we resolve the path
 * against the live origin. During SSR module evaluation `window` is undefined;
 * the placeholder base is never used because no request runs server-side.
 */
export function graphqlEndpoint(): string {
	const origin =
		typeof window === "undefined" ? "http://localhost" : window.location.origin;
	return new URL("/api/graphql", origin).toString();
}

const client = new GraphQLClient(graphqlEndpoint());

export function gqlRequest<Result, Variables>(
	document: TadaDocumentNode<Result, Variables>,
	variables?: Variables,
): Promise<Result> {
	return client.request(document, variables ?? undefined);
}
