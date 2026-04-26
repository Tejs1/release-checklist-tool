import { ReleaseForm } from "@/app/_components/release-form";
import { api, HydrateClient } from "@/trpc/server";

export const dynamic = "force-dynamic";

export default async function NewReleasePage() {
	void api.release.suggestVersion.prefetch();
	void api.release.getOngoing.prefetch();

	return (
		<HydrateClient>
			<ReleaseForm />
		</HydrateClient>
	);
}
