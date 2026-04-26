import { notFound } from "next/navigation";

import { ReleaseDetail } from "@/app/_components/release-detail";
import { api, HydrateClient } from "@/trpc/server";

export default async function ReleaseDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const releaseId = Number(id);
	if (Number.isNaN(releaseId)) notFound();

	const release = await api.release.getById({ id: releaseId });
	if (!release) notFound();

	return (
		<HydrateClient>
			<ReleaseDetail release={release} />
		</HydrateClient>
	);
}
