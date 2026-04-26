"use client";

import { Trash2Icon } from "lucide-react";
import Link from "next/link";

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
	const { data: releases, isLoading } = api.release.list.useQuery();
	const utils = api.useUtils();

	const deleteMutation = api.release.delete.useMutation({
		onSuccess: () => utils.release.list.invalidate(),
	});

	function handleDelete(id: number, name: string) {
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
					<TableHead className="text-right">Actions</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{releases.map((release) => (
					<TableRow key={release.id}>
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
						<TableCell>
							<div className="flex items-center justify-end gap-1">
								<Button asChild size="sm" variant="link">
									<Link href={`/release/${release.id}`}>View</Link>
								</Button>
								<Button
									aria-label={`Delete ${release.name}`}
									className="text-muted-foreground hover:text-destructive"
									disabled={deleteMutation.isPending}
									onClick={() => handleDelete(release.id, release.name)}
									size="icon-sm"
									type="button"
									variant="ghost"
								>
									<Trash2Icon aria-hidden="true" />
								</Button>
							</div>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
