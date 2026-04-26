import { describe, expect, it } from "vitest";

import { computeStatus, RELEASE_STEPS } from "@/shared/steps";

describe("computeStatus", () => {
	it("returns 'planned' when no steps are completed", () => {
		expect(computeStatus([])).toBe("planned");
	});

	it("returns 'ongoing' when some steps are completed", () => {
		expect(computeStatus(["pr-merged"])).toBe("ongoing");
		expect(computeStatus(["pr-merged", "tests-passing"])).toBe("ongoing");
	});

	it("returns 'done' when all steps are completed", () => {
		const allStepIds = RELEASE_STEPS.map((s) => s.id);
		expect(computeStatus(allStepIds)).toBe("done");
	});

	it("ignores unknown step IDs for 'done' check", () => {
		const allStepIds = RELEASE_STEPS.map((s) => s.id);
		expect(computeStatus([...allStepIds, "unknown-step"])).toBe("done");
	});
});

describe("RELEASE_STEPS", () => {
	it("has between 7 and 10 steps", () => {
		expect(RELEASE_STEPS.length).toBeGreaterThanOrEqual(7);
		expect(RELEASE_STEPS.length).toBeLessThanOrEqual(10);
	});

	it("has unique IDs", () => {
		const ids = RELEASE_STEPS.map((s) => s.id);
		expect(new Set(ids).size).toBe(ids.length);
	});
});
