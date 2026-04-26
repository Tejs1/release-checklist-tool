"use client";

import { Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { api } from "@/trpc/react";
import { StatusBadge } from "./status-badge";

export function ReleaseList() {
	const router = useRouter();
	const { data: releases, isLoading } = api.release.list.useQuery();
	const utils = api.useUtils();

	const deleteMutation = api.release.delete.useMutation({
		onSuccess: () => utils.release.list.invalidate(),
	});

	function handleDelete(e: React.MouseEvent, id: number, name: string) {
		e.stopPropagation();
		if (!confirm(`Delete release "${name}"?`)) return;
		deleteMutation.mutate({ id });
	}

	if (isLoading) {
		return (
			<p className="py-12 text-center text-muted-foreground">Loading...</p>
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
						<TableCell>
							<StatusBadge status={release.status} />
						</TableCell>
						<TableCell className="text-right">
							<Button
								aria-label={`Delete ${release.name}`}
								className="text-muted-foreground hover:text-destructive"
								disabled={deleteMutation.isPending}
								onClick={(e) => handleDelete(e, release.id, release.name)}
								size="icon-sm"
								type="button"
								variant="ghost"
							>
								<Trash2Icon aria-hidden="true" />
							</Button>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
