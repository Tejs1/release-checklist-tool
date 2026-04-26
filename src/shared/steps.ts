export const RELEASE_STEPS = [
	{
		id: "pr-merged",
		label: "All relevant GitHub pull requests have been merged",
	},
	{ id: "changelog-updated", label: "CHANGELOG.md files have been updated" },
	{ id: "tests-passing", label: "All tests are passing" },
	{ id: "version-bumped", label: "Version numbers have been bumped" },
	{ id: "release-notes", label: "Release notes have been drafted" },
	{ id: "github-release", label: "Releases in GitHub created" },
	{ id: "deployed-staging", label: "Deployed in staging" },
	{
		id: "tested-staging",
		label: "Tested thoroughly in staging",
		requires: "deployed-staging",
	},
	{
		id: "deployed-production",
		label: "Deployed in production",
		requires: "tested-staging",
	},
	{
		id: "smoke-test",
		label: "Post-release smoke test completed",
		requires: "deployed-production",
	},
] as const;

export type StepId = (typeof RELEASE_STEPS)[number]["id"];

export type ReleaseStatus = "planned" | "ongoing" | "done";

export function computeStatus(completedSteps: string[]): ReleaseStatus {
	if (completedSteps.length === 0) return "planned";
	if (completedSteps.length >= RELEASE_STEPS.length) return "done";
	return "ongoing";
}

export function canCompleteStep(
	stepId: StepId,
	completedSteps: string[],
): boolean {
	const step = RELEASE_STEPS.find((s) => s.id === stepId);
	if (!step) return false;
	if (!("requires" in step)) return true;
	return completedSteps.includes(step.requires);
}

export function getBlockedReason(
	stepId: StepId,
	completedSteps: string[],
): string | null {
	const step = RELEASE_STEPS.find((s) => s.id === stepId);
	if (!step || !("requires" in step)) return null;
	if (completedSteps.includes(step.requires)) return null;
	const required = RELEASE_STEPS.find((s) => s.id === step.requires);
	return required ? required.label : null;
}

export function getDependentSteps(stepId: StepId): StepId[] {
	const result: StepId[] = [];
	for (const step of RELEASE_STEPS) {
		if ("requires" in step && step.requires === stepId) {
			result.push(step.id);
			result.push(...getDependentSteps(step.id));
		}
	}
	return result;
}

export function suggestNextVersion(
	existingNames: string[],
): { prefix: string; patch: string; minor: string; major: string } | null {
	const latest = existingNames[0];
	if (!latest) return null;

	const match = latest.match(/^(.*?)(\d+\.\d+\.\d+)$/);
	if (!match) return null;

	const prefix = match[1] ?? "";
	const versionStr = match[2] ?? "";
	const parts = versionStr.split(".").map(Number);
	if (parts.length !== 3) return null;

	const [maj = 0, min = 0, pat = 0] = parts;
	const nameSet = new Set(existingNames);

	function nextAvailable(major: number, minor: number, patch: number, bump: "major" | "minor" | "patch"): string {
		if (bump === "patch") patch += 1;
		else if (bump === "minor") { minor += 1; patch = 0; }
		else { major += 1; minor = 0; patch = 0; }
		while (nameSet.has(`${prefix}${major}.${minor}.${patch}`)) {
			if (bump === "patch") patch += 1;
			else if (bump === "minor") minor += 1;
			else major += 1;
		}
		return `${prefix}${major}.${minor}.${patch}`;
	}

	return {
		prefix,
		patch: nextAvailable(maj, min, pat, "patch"),
		minor: nextAvailable(maj, min, pat, "minor"),
		major: nextAvailable(maj, min, pat, "major"),
	};
}
