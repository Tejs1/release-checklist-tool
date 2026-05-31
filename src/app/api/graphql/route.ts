import { createYoga } from "graphql-yoga";

import { env } from "@/env";
import { createContext } from "@/server/graphql/context";
import { schema } from "@/server/graphql/schema";

const { handleRequest } = createYoga({
	schema,
	context: createContext,
	graphqlEndpoint: "/api/graphql",
	graphiql: env.NODE_ENV === "development",
	// Next.js provides the global `Response`; hand it to Yoga's fetch adapter.
	fetchAPI: { Response },
});

// Wrap so the exported handlers match Next's App Router route signature
// (Yoga's handleRequest expects a server-context second argument).
function handler(request: Request) {
	return handleRequest(request, {});
}

export { handler as GET, handler as POST, handler as OPTIONS };
