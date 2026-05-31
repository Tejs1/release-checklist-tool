"use client";

import { ChevronRightIcon, LoaderCircleIcon, SaveIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardHeader,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	canCompleteStep,
	getBlockedReason,
	getDependentSteps,
	RELEASE_STEPS,
	type StepId,
} from "@/shared/steps";
import { api } from "@/trpc/react";
import { ActivityLog } from "./activity-log";
import { DeleteDialog } from "./delete-dialog";
import { VersionAutocomplete } from "./version-autocomplete";

type ReleaseData = {
	id: number;
	name: string;
	date: Date;
	additionalInfo: string | null;
	completedSteps: string[];
	stepCompletedAt: Record<string, string>;
};

function toDateInputValue(date: Date): string {
	return new Date(date).toISOString().split("T")[0] ?? "";
}

function todayString(): string {
	return new Date().toISOString().split("T")[0] ?? "";
}

function formatRelativeTime(isoString: string): string {
	const now = new Date();
	const then = new Date(isoString);
	const diffMs = now.getTime() - then.getTime();
	const diffMin = Math.floor(diffMs / 60_000);

	if (diffMin < 1) return "just now";
	if (diffMin < 60) return `${diffMin}m ago`;

	const diffHours = Math.floor(diffMin / 60);
	if (diffHours < 24) return `${diffHours}h ago`;

	const diffDays = Math.floor(diffHours / 24);
	if (diffDays < 7) return `${diffDays}d ago`;

	return then.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
}

export function ReleaseForm({ release }: { release?: ReleaseData }) {
	const router = useRouter();
	const isNew = !release;

	const [name, setName] = useState(release?.name ?? "");
	const [date, setDate] = useState(
		release ? toDateInputValue(release.date) : todayString(),
	);
	const [additionalInfo, setAdditionalInfo] = useState(
		release?.additionalInfo ?? "",
	);
	const [completedSteps, setCompletedSteps] = useState<string[]>(
		release?.completedSteps ?? [],
	);
	const [saving, setSaving] = useState(false);

	const utils = api.useUtils();

	const { data: ongoingRelease } = api.release.getOngoing.useQuery(
		undefined,
		{ enabled: isNew },
	);

	const [saveError, setSaveError] = useState<string | null>(null);

	const createMutation = api.release.create.useMutation({
		onSuccess: (data) => {
			setSaveError(null);
			utils.release.list.invalidate();
			utils.release.suggestVersion.invalidate();
			if (data) router.push(`/release/${data.id}`);
		},
		onError: (err) => setSaveError(err.message),
	});

	const updateMutation = api.release.update.useMutation({
		onSuccess: () => {
			setSaveError(null);
			utils.release.list.invalidate();
			utils.release.getById.invalidate({ id: release?.id });
			utils.release.getActivityLog.invalidate({
				releaseId: release?.id,
			});
		},
		onError: (err) => setSaveError(err.message),
	});

	const deleteMutation = api.release.delete.useMutation({
		onSuccess: () => {
			utils.release.list.invalidate();
			router.push("/");
		},
	});

	const handleNameChange = useCallback((value: string) => {
		setName(value);
		setSaveError(null);
	}, []);

	function toggleStep(stepId: string) {
		setCompletedSteps((prev) => {
			if (prev.includes(stepId)) {
				const dependents = getDependentSteps(stepId as StepId);
				return prev.filter((s) => s !== stepId && !dependents.includes(s as StepId));
			}
			return [...prev, stepId];
		});
	}

	async function handleSave() {
		if (!name.trim() || !date) return;
		setSaving(true);
		try {
			if (isNew) {
				await createMutation.mutateAsync({
					name: name.trim(),
					date: new Date(date),
					additionalInfo: additionalInfo.trim() || undefined,
				});
			} else {
				await updateMutation.mutateAsync({
					id: release.id,
					name: name.trim(),
					date: new Date(date),
					additionalInfo: additionalInfo.trim() || null,
					completedSteps,
				});
			}
		} finally {
			setSaving(false);
		}
	}

	function handleDelete() {
		if (!release) return;
		deleteMutation.mutate({ id: release.id });
	}

	const completedCount = completedSteps.length;
	const totalSteps = RELEASE_STEPS.length;
	const progressPercent = Math.round((completedCount / totalSteps) * 100);

	return (
		<Card>
			<CardHeader className="border-b">
				<nav className="flex items-center gap-1.5 text-sm">
					<Button asChild size="sm" variant="link">
						<Link href="/">All releases</Link>
					</Button>
					<ChevronRightIcon
						aria-hidden="true"
						className="size-4 text-muted-foreground"
					/>
					<span className="font-medium text-foreground">
						{isNew ? "New release" : release.name}
					</span>
				</nav>
				{!isNew && (
					<CardAction className="flex gap-2">
						<Button
							disabled={saving || !name.trim() || !date}
							onClick={handleSave}
							type="button"
						>
							{saving ? (
								<>
									<LoaderCircleIcon aria-hidden="true" className="animate-spin" />
									Saving...
								</>
							) : (
								<>
									Save
									<SaveIcon aria-hidden="true" data-icon="inline-end" />
								</>
							)}
						</Button>
						<DeleteDialog
							disabled={deleteMutation.isPending}
							isPending={deleteMutation.isPending}
							onConfirm={handleDelete}
							releaseName={release.name}
							trigger={
								<Button type="button" variant="destructive">
									Delete
									<Trash2Icon aria-hidden="true" data-icon="inline-end" />
								</Button>
							}
						/>
					</CardAction>
				)}
			</CardHeader>

			<CardContent>
				{isNew && ongoingRelease && (
					<div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
						<span className="mt-0.5 text-lg">⚠️</span>
						<div>
							<p className="font-medium text-amber-900 text-sm dark:text-amber-200">
								{ongoingRelease.name} is still ongoing (
								{ongoingRelease.completedCount}/{ongoingRelease.totalSteps}{" "}
								steps)
							</p>
							<p className="text-amber-700 text-xs dark:text-amber-300">
								Are you sure you want to create a new release?
							</p>
						</div>
					</div>
				)}

				<div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="release-name">Release</Label>
						{isNew ? (
							<VersionAutocomplete
								onChange={handleNameChange}
								value={name}
							/>
						) : (
							<Input
								id="release-name"
								onChange={(e) => setName(e.target.value)}
								placeholder="e.g. Version 1.0.0"
								required
								type="text"
								value={name}
							/>
						)}
					</div>
					<div className="space-y-2">
						<Label htmlFor="release-date">Date</Label>
						<Input
							id="release-date"
							min={isNew ? todayString() : undefined}
							onChange={(e) => setDate(e.target.value)}
							required
							type="date"
							value={date}
						/>
					</div>
				</div>

				{!isNew && (
					<>
						<div className="mb-4">
							<div className="mb-2 flex items-center justify-between text-sm">
								<span className="text-muted-foreground">Progress</span>
								<span className="font-semibold text-primary">
									{completedCount} / {totalSteps} steps
								</span>
							</div>
							<div className="h-2 overflow-hidden rounded-full bg-muted">
								<div
									className="h-full rounded-full bg-primary transition-all duration-300"
									style={{ width: `${progressPercent}%` }}
								/>
							</div>
						</div>

						<div className="mb-6 space-y-1">
							{RELEASE_STEPS.map((step) => {
								const isComplete = completedSteps.includes(step.id);
								const blocked = !isComplete && !canCompleteStep(step.id, completedSteps);
								const blockedReason = blocked
									? getBlockedReason(step.id, completedSteps)
									: null;
								const checkboxId = `release-step-${step.id}`;
								const timestamp =
									release.stepCompletedAt[step.id];

								return (
									<div
										className={`flex items-center gap-3 rounded-lg border border-transparent px-2 py-2 transition-colors ${
											blocked
												? "opacity-45"
												: isComplete
													? "bg-emerald-50 dark:bg-emerald-500/5"
													: "hover:bg-muted/50"
										}`}
										key={step.id}
									>
										<Checkbox
											checked={isComplete}
											disabled={blocked}
											id={checkboxId}
											onCheckedChange={() => toggleStep(step.id)}
										/>
										<Label
											className={`flex-1 ${
												blocked
													? "text-muted-foreground"
													: isComplete
														? "text-muted-foreground line-through"
														: "text-foreground"
											}`}
											htmlFor={checkboxId}
										>
											{step.label}
										</Label>
										{isComplete && timestamp && (
											<span className="whitespace-nowrap text-emerald-600 text-xs dark:text-emerald-400">
												✓ {formatRelativeTime(timestamp)}
											</span>
										)}
										{blockedReason && (
											<span className="whitespace-nowrap rounded bg-muted px-2 py-0.5 text-muted-foreground text-xs">
												Requires: {blockedReason}
											</span>
										)}
									</div>
								);
							})}
						</div>
					</>
				)}

				<div className="mb-6 space-y-2">
					<Label htmlFor="additional-info">Additional remarks / tasks</Label>
					<Textarea
						id="additional-info"
						onChange={(e) => setAdditionalInfo(e.target.value)}
						placeholder="Please enter any other important notes for the release"
						rows={4}
						value={additionalInfo}
					/>
				</div>

				{saveError && (
					<div className="mb-4 flex items-center gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 dark:border-red-500/30 dark:bg-red-500/10">
						<span className="text-lg">✕</span>
						<p className="font-medium text-red-900 text-sm dark:text-red-200">
							{saveError}
						</p>
					</div>
				)}

				<div className="mb-6 flex justify-end">
					<Button
						disabled={saving || !name.trim() || !date}
						onClick={handleSave}
						type="button"
					>
						{saving ? (
							<>
								<LoaderCircleIcon aria-hidden="true" className="animate-spin" />
								Saving...
							</>
						) : (
							<>
								Save
								<SaveIcon aria-hidden="true" data-icon="inline-end" />
							</>
						)}
					</Button>
				</div>

				{!isNew && <ActivityLog releaseId={release.id} />}
			</CardContent>
		</Card>
	);
}
