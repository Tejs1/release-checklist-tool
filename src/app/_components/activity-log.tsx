"use client";

import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivityLogQuery } from "@/graphql/hooks";

const actionColors: Record<string, string> = {
	created: "bg-indigo-500",
	step_completed: "bg-emerald-500",
	step_uncompleted: "bg-amber-500",
	info_updated: "bg-blue-500",
	name_updated: "bg-blue-500",
	date_updated: "bg-blue-500",
};

const actionLabels: Record<string, string> = {
	created: "Release created",
	step_completed: "Completed",
	step_uncompleted: "Unchecked",
	info_updated: "Updated",
	name_updated: "Renamed",
	date_updated: "Date changed",
};

function formatRelativeTime(date: string): string {
	const now = new Date();
	const diffMs = now.getTime() - new Date(date).getTime();
	const diffMin = Math.floor(diffMs / 60_000);

	if (diffMin < 1) return "Just now";
	if (diffMin < 60) return `${diffMin}m ago`;

	const diffHours = Math.floor(diffMin / 60);
	if (diffHours < 24) return `${diffHours}h ago`;

	const diffDays = Math.floor(diffHours / 24);
	if (diffDays < 7) return `${diffDays}d ago`;

	return new Date(date).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

export function ActivityLog({ releaseId }: { releaseId: number }) {
	const [open, setOpen] = useState(false);
	const { data: events, isLoading } = useActivityLogQuery(releaseId, {
		enabled: open,
	});

	return (
		<Collapsible onOpenChange={setOpen} open={open}>
			<CollapsibleTrigger asChild>
				<Button
					className="w-full justify-start gap-2"
					size="sm"
					type="button"
					variant="ghost"
				>
					<ChevronDownIcon
						className={`size-4 transition-transform ${open ? "" : "-rotate-90"}`}
					/>
					<span className="font-semibold">Activity</span>
					{events && (
						<span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs">
							{events.length} events
						</span>
					)}
				</Button>
			</CollapsibleTrigger>
			<CollapsibleContent>
				{isLoading ? (
					<div className="mt-3 ml-2 border-muted border-l-2 pl-5">
						{Array.from({ length: 3 }).map((_, i) => (
							<div className="relative mb-4 last:mb-0" key={i}>
								<Skeleton className="absolute top-1 -left-[27px] size-2.5 rounded-full" />
								<Skeleton className="mb-1 h-4 w-40" />
								<Skeleton className="h-3 w-16" />
							</div>
						))}
					</div>
				) : events && events.length > 0 ? (
					<div className="mt-3 ml-2 border-muted border-l-2 pl-5">
						{events.map((event) => (
							<div className="relative mb-4 last:mb-0" key={event.id}>
								<div
									className={`absolute top-1 -left-[27px] size-2.5 rounded-full ${actionColors[event.action] ?? "bg-gray-400"}`}
								/>
								<div className="text-foreground text-sm">
									{event.action === "created" ? (
										<strong>Release created</strong>
									) : (
										<>
											{actionLabels[event.action] ?? event.action}{" "}
											<strong>{event.detail}</strong>
										</>
									)}
								</div>
								<div className="text-muted-foreground text-xs">
									{formatRelativeTime(event.createdAt)}
								</div>
							</div>
						))}
					</div>
				) : events ? (
					<p className="mt-2 text-muted-foreground text-sm">No activity yet.</p>
				) : null}
			</CollapsibleContent>
		</Collapsible>
	);
}
