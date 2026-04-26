import { describe, expect, it } from "vitest";

import {
	canCompleteStep,
	getBlockedReason,
	getDependentSteps,
	RELEASE_STEPS,
} from "@/shared/steps";

describe("canCompleteStep", () => {
	it("returns true for steps with no dependencies", () => {
		expect(canCompleteStep("pr-merged", [])).toBe(true);
		expect(canCompleteStep("deployed-staging", [])).toBe(true);
	});

	it("returns false when prerequisite is not completed", () => {
		expect(canCompleteStep("tested-staging", [])).toBe(false);
		expect(canCompleteStep("tested-staging", ["pr-merged"])).toBe(false);
	});

	it("returns true when prerequisite is completed", () => {
		expect(canCompleteStep("tested-staging", ["deployed-staging"])).toBe(true);
	});

	it("checks transitive dependencies only at direct level", () => {
		expect(
			canCompleteStep("deployed-production", ["tested-staging"]),
		).toBe(true);
		expect(canCompleteStep("deployed-production", ["deployed-staging"])).toBe(
			false,
		);
	});

	it("returns true for smoke-test when deployed-production is completed", () => {
		expect(canCompleteStep("smoke-test", ["deployed-production"])).toBe(true);
	});
});

describe("getBlockedReason", () => {
	it("returns null for steps with no dependencies", () => {
		expect(getBlockedReason("pr-merged", [])).toBeNull();
		expect(getBlockedReason("changelog-updated", [])).toBeNull();
	});

	it("returns null when prerequisite is met", () => {
		expect(
			getBlockedReason("tested-staging", ["deployed-staging"]),
		).toBeNull();
	});

	it("returns the prerequisite label when blocked", () => {
		expect(getBlockedReason("tested-staging", [])).toBe(
			"Deployed in staging",
		);
		expect(getBlockedReason("deployed-production", [])).toBe(
			"Tested thoroughly in staging",
		);
		expect(getBlockedReason("smoke-test", [])).toBe(
			"Deployed in production",
		);
	});
});

describe("getDependentSteps", () => {
	it("returns empty array for steps with no dependents", () => {
		expect(getDependentSteps("pr-merged")).toEqual([]);
		expect(getDependentSteps("smoke-test")).toEqual([]);
	});

	it("returns direct dependents", () => {
		const deps = getDependentSteps("deployed-staging");
		expect(deps).toContain("tested-staging");
	});

	it("returns transitive dependents", () => {
		const deps = getDependentSteps("deployed-staging");
		expect(deps).toContain("tested-staging");
		expect(deps).toContain("deployed-production");
		expect(deps).toContain("smoke-test");
		expect(deps).toHaveLength(3);
	});

	it("returns correct chain for tested-staging", () => {
		const deps = getDependentSteps("tested-staging");
		expect(deps).toContain("deployed-production");
		expect(deps).toContain("smoke-test");
		expect(deps).toHaveLength(2);
	});
});

describe("RELEASE_STEPS dependency structure", () => {
	it("has requires field only on steps 8-10", () => {
		const stepsWithDeps = RELEASE_STEPS.filter(
			(s) => "requires" in s,
		);
		expect(stepsWithDeps).toHaveLength(3);
		const ids = stepsWithDeps.map((s) => s.id);
		expect(ids).toEqual([
			"tested-staging",
			"deployed-production",
			"smoke-test",
		]);
	});
});
