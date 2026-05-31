"use client";

import { Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	useDeleteRelease,
	useReleaseCache,
	useReleasesQuery,
} from "@/graphql/hooks";
import { RELEASE_STEPS } from "@/shared/steps";
import { DeleteDialog } from "./delete-dialog";
import { StatusBadge } from "./status-badge";

export function ReleaseList() {
	const router = useRouter();
	const { data: releases, isLoading } = useReleasesQuery();
	const { invalidateReleases } = useReleaseCache();

	const deleteMutation = useDeleteRelease({
		onSuccess: () => invalidateReleases(),
	});

	if (isLoading) {
		return (
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Release</TableHead>
						<TableHead>Date</TableHead>
						<TableHead>Progress</TableHead>
						<TableHead>Status</TableHead>
						<TableHead className="text-right" />
					</TableRow>
				</TableHeader>
				<TableBody>
					{Array.from({ length: 4 }).map((_, i) => (
						<TableRow key={i}>
							<TableCell>
								<Skeleton className="h-4 w-24" />
							</TableCell>
							<TableCell>
								<Skeleton className="h-4 w-32" />
							</TableCell>
							<TableCell>
								<Skeleton className="h-4 w-12" />
							</TableCell>
							<TableCell>
								<Skeleton className="h-5 w-16 rounded-full" />
							</TableCell>
							<TableCell className="text-right">
								<Skeleton className="ml-auto size-8 rounded-md" />
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		);
	}

	if (!releases || releases.length === 0) {
		return (
			<p className="py-12 text-center text-muted-foreground">
				No releases yet. Create your first one!
			</p>
		);
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Release</TableHead>
					<TableHead>Date</TableHead>
					<TableHead>Progress</TableHead>
					<TableHead>Status</TableHead>
					<TableHead className="text-right" />
				</TableRow>
			</TableHeader>
			<TableBody>
				{releases.map((release) => (
					<TableRow
						className="cursor-pointer"
						key={release.id}
						onClick={() => router.push(`/release/${release.id}`)}
					>
						<TableCell className="font-medium">{release.name}</TableCell>
						<TableCell className="text-muted-foreground">
							{new Date(release.date).toLocaleDateString("en-US", {
								year: "numeric",
								month: "long",
								day: "numeric",
							})}
						</TableCell>
						<TableCell className="text-muted-foreground text-sm">
							{release.completedSteps.length}/{RELEASE_STEPS.length}
						</TableCell>
						<TableCell>
							<StatusBadge status={release.status} />
						</TableCell>
						<TableCell className="text-right">
							<DeleteDialog
								disabled={deleteMutation.isPending}
								isPending={deleteMutation.isPending}
								onConfirm={() => deleteMutation.mutate({ id: release.id })}
								releaseName={release.name}
								trigger={
									<Button
										aria-label={`Delete ${release.name}`}
										className="text-muted-foreground hover:text-destructive"
										onClick={(e) => e.stopPropagation()}
										size="icon-sm"
										type="button"
										variant="ghost"
									>
										<Trash2Icon aria-hidden="true" />
									</Button>
								}
							/>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
