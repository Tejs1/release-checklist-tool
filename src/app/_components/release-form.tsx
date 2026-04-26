"use client";

import { ChevronRightIcon, SaveIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
import { RELEASE_STEPS } from "@/shared/steps";
import { api } from "@/trpc/react";

type ReleaseData = {
	id: number;
	name: string;
	date: Date;
	additionalInfo: string | null;
	completedSteps: string[];
};

function toDateInputValue(date: Date): string {
	return new Date(date).toISOString().split("T")[0] ?? "";
}

export function ReleaseForm({ release }: { release?: ReleaseData }) {
	const router = useRouter();
	const isNew = !release;

	const [name, setName] = useState(release?.name ?? "");
	const [date, setDate] = useState(
		release ? toDateInputValue(release.date) : "",
	);
	const [additionalInfo, setAdditionalInfo] = useState(
		release?.additionalInfo ?? "",
	);
	const [completedSteps, setCompletedSteps] = useState<string[]>(
		release?.completedSteps ?? [],
	);
	const [saving, setSaving] = useState(false);

	const utils = api.useUtils();

	const createMutation = api.release.create.useMutation({
		onSuccess: (data) => {
			utils.release.list.invalidate();
			if (data) router.push(`/release/${data.id}`);
		},
	});

	const updateMutation = api.release.update.useMutation({
		onSuccess: () => {
			utils.release.list.invalidate();
			utils.release.getById.invalidate({ id: release?.id });
		},
	});

	const deleteMutation = api.release.delete.useMutation({
		onSuccess: () => {
			utils.release.list.invalidate();
			router.push("/");
		},
	});

	function toggleStep(stepId: string) {
		setCompletedSteps((prev) =>
			prev.includes(stepId)
				? prev.filter((s) => s !== stepId)
				: [...prev, stepId],
		);
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
		if (!confirm(`Delete release "${release.name}"?`)) return;
		deleteMutation.mutate({ id: release.id });
	}

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
					<CardAction>
						<Button
							disabled={deleteMutation.isPending}
							onClick={handleDelete}
							type="button"
							variant="destructive"
						>
							Delete
							<Trash2Icon aria-hidden="true" data-icon="inline-end" />
						</Button>
					</CardAction>
				)}
			</CardHeader>

			<CardContent>
				<div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="release-name">Release</Label>
						<Input
							id="release-name"
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g. Version 1.0.0"
							required
							type="text"
							value={name}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="release-date">Date</Label>
						<Input
							id="release-date"
							onChange={(e) => setDate(e.target.value)}
							required
							type="date"
							value={date}
						/>
					</div>
				</div>

				{!isNew && (
					<div className="mb-6 space-y-2">
						{RELEASE_STEPS.map((step) => {
							const isComplete = completedSteps.includes(step.id);
							const checkboxId = `release-step-${step.id}`;

							return (
								<div
									className="flex items-center gap-3 rounded-lg border border-transparent px-2 py-2 transition-colors hover:bg-muted/50"
									key={step.id}
								>
									<Checkbox
										checked={isComplete}
										id={checkboxId}
										onCheckedChange={() => toggleStep(step.id)}
									/>
									<Label
										className={
											isComplete
												? "text-muted-foreground line-through"
												: "text-foreground"
										}
										htmlFor={checkboxId}
									>
										{step.label}
									</Label>
								</div>
							);
						})}
					</div>
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

				<div className="flex justify-end">
					<Button
						disabled={saving || !name.trim() || !date}
						onClick={handleSave}
						type="button"
					>
						{saving ? "Saving..." : "Save"}
						<SaveIcon aria-hidden="true" data-icon="inline-end" />
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
