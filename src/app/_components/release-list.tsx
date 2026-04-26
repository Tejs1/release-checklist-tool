"use client";

import Link from "next/link";

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
		return <p className="py-12 text-center text-gray-500">Loading...</p>;
	}

	if (!releases || releases.length === 0) {
		return (
			<p className="py-12 text-center text-gray-500">
				No releases yet. Create your first one!
			</p>
		);
	}

	return (
		<div className="overflow-x-auto">
			<table className="w-full text-left text-sm">
				<thead>
					<tr className="border-gray-200 border-b text-gray-500">
						<th className="pr-4 pb-3 font-medium">Release</th>
						<th className="pr-4 pb-3 font-medium">Date</th>
						<th className="pr-4 pb-3 font-medium">Status</th>
						<th className="pb-3 font-medium" />
					</tr>
				</thead>
				<tbody>
					{releases.map((release) => (
						<tr
							className="border-gray-100 border-b last:border-0"
							key={release.id}
						>
							<td className="py-3 pr-4 font-medium text-gray-900">
								{release.name}
							</td>
							<td className="py-3 pr-4 text-gray-600">
								{new Date(release.date).toLocaleDateString("en-US", {
									year: "numeric",
									month: "long",
									day: "numeric",
								})}
							</td>
							<td className="py-3 pr-4">
								<StatusBadge status={release.status} />
							</td>
							<td className="py-3 text-right">
								<div className="flex items-center justify-end gap-3">
									<Link
										className="font-medium text-primary hover:text-primary-hover"
										href={`/release/${release.id}`}
									>
										View
									</Link>
									<button
										className="text-gray-400 transition-colors hover:text-red-600"
										disabled={deleteMutation.isPending}
										onClick={() => handleDelete(release.id, release.name)}
										type="button"
									>
										<svg
											aria-hidden="true"
											className="h-4 w-4"
											fill="none"
											stroke="currentColor"
											strokeWidth={2}
											viewBox="0 0 24 24"
										>
											<path
												d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
												strokeLinecap="round"
												strokeLinejoin="round"
											/>
										</svg>
									</button>
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
