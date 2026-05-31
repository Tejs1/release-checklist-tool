import { notFound } from "next/navigation";

import { ReleaseDetail } from "@/app/_components/release-detail";
import { ReleaseDocument } from "@/graphql/documents";
import { gqlServer } from "@/graphql/server";

export default async function ReleaseDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const releaseId = Number(id);
	if (Number.isNaN(releaseId)) notFound();

	const { release } = await gqlServer(ReleaseDocument, { id: releaseId });
	if (!release) notFound();

	return <ReleaseDetail release={release} />;
}
