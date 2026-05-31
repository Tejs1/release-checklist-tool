"use client";

import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { createQueryClient } from "./query-client";

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
	if (typeof window === "undefined") {
		// Server: always make a new query client.
		return createQueryClient();
	}
	// Browser: reuse a singleton so the cache survives re-renders.
	browserQueryClient ??= createQueryClient();
	return browserQueryClient;
}

export function ReactQueryProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [queryClient] = useState(getQueryClient);

	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}
