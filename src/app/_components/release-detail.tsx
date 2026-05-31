"use client";

import { useRouter } from "next/navigation";
import { type Release, useReleaseQuery } from "@/graphql/hooks";
import { ReleaseForm } from "./release-form";

export function ReleaseDetail({ release: initial }: { release: Release }) {
	const router = useRouter();
	const { data: release } = useReleaseQuery(initial.id, {
		initialData: initial,
	});

	if (!release) {
		router.replace("/");
		return null;
	}

	return (
		<ReleaseForm
			release={{
				id: release.id,
				name: release.name,
				date: release.date,
				additionalInfo: release.additionalInfo,
				completedSteps: release.completedSteps,
				stepCompletedAt: release.stepCompletedAt,
			}}
		/>
	);
}
