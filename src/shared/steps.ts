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
	{ id: "tested-staging", label: "Tested thoroughly in staging" },
	{ id: "deployed-production", label: "Deployed in production" },
	{ id: "smoke-test", label: "Post-release smoke test completed" },
] as const;

export type StepId = (typeof RELEASE_STEPS)[number]["id"];

export type ReleaseStatus = "planned" | "ongoing" | "done";

export function computeStatus(completedSteps: string[]): ReleaseStatus {
	if (completedSteps.length === 0) return "planned";
	if (completedSteps.length >= RELEASE_STEPS.length) return "done";
	return "ongoing";
}
