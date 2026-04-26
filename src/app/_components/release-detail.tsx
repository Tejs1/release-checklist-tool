"use client";

import { useRouter } from "next/navigation";
import type { ReleaseStatus } from "@/shared/steps";
import { api } from "@/trpc/react";
import { ReleaseForm } from "./release-form";

type InitialRelease = {
	id: number;
	name: string;
	date: Date;
	additionalInfo: string | null;
	completedSteps: string[];
	stepCompletedAt: Record<string, string>;
	createdAt: Date;
	updatedAt: Date;
	status: ReleaseStatus;
};

export function ReleaseDetail({
	release: initial,
}: {
	release: InitialRelease;
}) {
	const router = useRouter();
	const { data: release } = api.release.getById.useQuery(
		{ id: initial.id },
		{ initialData: initial },
	);

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
