export const dynamic = "force-dynamic";

import { PlusIcon } from "lucide-react";
import Link from "next/link";

import { ReleaseList } from "@/app/_components/release-list";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { ReleasesDocument } from "@/graphql/documents";
import { HydrateClient, prefetchQuery } from "@/graphql/server";

export default async function Home() {
	await prefetchQuery(["releases"], ReleasesDocument);

	return (
		<HydrateClient>
			<Card>
				<CardHeader className="border-b">
					<CardTitle>All releases</CardTitle>
					<CardAction>
						<Button asChild>
							<Link href="/release/new">
								New release
								<PlusIcon aria-hidden="true" data-icon="inline-end" />
							</Link>
						</Button>
					</CardAction>
				</CardHeader>
				<CardContent>
					<ReleaseList />
				</CardContent>
			</Card>
		</HydrateClient>
	);
}
