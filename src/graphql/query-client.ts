import {
	defaultShouldDehydrateQuery,
	QueryClient,
} from "@tanstack/react-query";

export const createQueryClient = () =>
	new QueryClient({
		defaultOptions: {
			queries: {
				// With SSR, set a non-zero staleTime so freshly hydrated data is not
				// immediately refetched on the client.
				staleTime: 30 * 1000,
			},
			dehydrate: {
				shouldDehydrateQuery: (query) =>
					defaultShouldDehydrateQuery(query) ||
					query.state.status === "pending",
			},
		},
	});
