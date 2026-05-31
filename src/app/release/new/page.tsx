import { ReleaseForm } from "@/app/_components/release-form";
import {
	OngoingReleaseDocument,
	SuggestVersionDocument,
} from "@/graphql/documents";
import { HydrateClient, prefetchQuery } from "@/graphql/server";

export const dynamic = "force-dynamic";

export default async function NewReleasePage() {
	await Promise.all([
		prefetchQuery(["suggestVersion"], SuggestVersionDocument),
		prefetchQuery(["ongoingRelease"], OngoingReleaseDocument),
	]);

	return (
		<HydrateClient>
			<ReleaseForm />
		</HydrateClient>
	);
}
