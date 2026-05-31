import { describe, expect, it } from "vitest";

import { graphqlEndpoint } from "@/graphql/client";

describe("graphqlEndpoint", () => {
	it("is an absolute URL that new URL() parses without a base", () => {
		// graphql-request calls `new URL(endpoint)` with no base, so a relative
		// path like "/api/graphql" throws "Failed to construct 'URL'".
		const endpoint = graphqlEndpoint();
		expect(() => new URL(endpoint)).not.toThrow();
	});

	it("points at the /api/graphql route on the current origin", () => {
		const url = new URL(graphqlEndpoint());
		expect(url.pathname).toBe("/api/graphql");
		expect(url.origin).toBe(window.location.origin);
	});
});
