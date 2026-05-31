import type { TadaDocumentNode } from "gql.tada";
import { GraphQLClient } from "graphql-request";

/**
 * Browser-side GraphQL transport. Client components only ever fetch from the
 * browser (server renders are satisfied by hydrated data or `gqlServer`), so a
 * relative endpoint is all that's needed.
 */
const client = new GraphQLClient("/api/graphql");

export function gqlRequest<Result, Variables>(
	document: TadaDocumentNode<Result, Variables>,
	variables?: Variables,
): Promise<Result> {
	return client.request(document, variables ?? undefined);
}
