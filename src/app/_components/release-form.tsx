"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
		<div className="rounded-lg border border-gray-200 bg-white p-6">
			<div className="mb-6 flex items-center justify-between">
				<nav className="flex items-center gap-2 text-sm">
					<a
						className="font-medium text-primary hover:text-primary-hover"
						href="/"
					>
						All releases
					</a>
					<span className="text-gray-400">&gt;</span>
					<span className="text-gray-600">
						{isNew ? "New release" : release.name}
					</span>
				</nav>
				{!isNew && (
					<button
						className="inline-flex items-center gap-1.5 rounded-md bg-danger px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-danger-hover"
						disabled={deleteMutation.isPending}
						onClick={handleDelete}
						type="button"
					>
						Delete
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
				)}
			</div>

			<div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div>
					<label
						className="mb-1 block font-medium text-gray-700 text-sm"
						htmlFor="release-name"
					>
						Release
					</label>
					<input
						className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
						id="release-name"
						onChange={(e) => setName(e.target.value)}
						placeholder="e.g. Version 1.0.0"
						required
						type="text"
						value={name}
					/>
				</div>
				<div>
					<label
						className="mb-1 block font-medium text-gray-700 text-sm"
						htmlFor="release-date"
					>
						Date
					</label>
					<input
						className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
						id="release-date"
						onChange={(e) => setDate(e.target.value)}
						required
						type="date"
						value={date}
					/>
				</div>
			</div>

			{!isNew && (
				<div className="mb-6">
					<div className="space-y-2">
						{RELEASE_STEPS.map((step) => (
							<label
								className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-gray-50"
								key={step.id}
							>
								<input
									checked={completedSteps.includes(step.id)}
									className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
									onChange={() => toggleStep(step.id)}
									type="checkbox"
								/>
								<span
									className={`text-sm ${
										completedSteps.includes(step.id)
											? "text-gray-400 line-through"
											: "text-gray-700"
									}`}
								>
									{step.label}
								</span>
							</label>
						))}
					</div>
				</div>
			)}

			<div className="mb-6">
				<label
					className="mb-1 block font-medium text-gray-700 text-sm"
					htmlFor="additional-info"
				>
					Additional remarks / tasks
				</label>
				<textarea
					className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
					id="additional-info"
					onChange={(e) => setAdditionalInfo(e.target.value)}
					placeholder="Please enter any other important notes for the release"
					rows={4}
					value={additionalInfo}
				/>
			</div>

			<div className="flex justify-end">
				<button
					className="inline-flex items-center gap-1.5 rounded-md bg-primary px-5 py-2 font-medium text-sm text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
					disabled={saving || !name.trim() || !date}
					onClick={handleSave}
					type="button"
				>
					{saving ? "Saving..." : "Save"}
					<svg
						aria-hidden="true"
						className="h-4 w-4"
						fill="none"
						stroke="currentColor"
						strokeWidth={2}
						viewBox="0 0 24 24"
					>
						<path
							d="M5 13l4 4L19 7"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</button>
			</div>
		</div>
	);
}
