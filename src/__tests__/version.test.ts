import { describe, expect, it } from "vitest";

import { suggestNextVersion } from "@/shared/steps";

describe("suggestNextVersion", () => {
	it("returns null when no existing names", () => {
		expect(suggestNextVersion([])).toBeNull();
	});

	it("returns null when latest name is not semver-parseable", () => {
		expect(suggestNextVersion(["Release Alpha"])).toBeNull();
		expect(suggestNextVersion(["hotfix"])).toBeNull();
	});

	it("parses simple semver without prefix", () => {
		const result = suggestNextVersion(["1.0.2"]);
		expect(result).toEqual({
			prefix: "",
			patch: "1.0.3",
			minor: "1.1.0",
			major: "2.0.0",
		});
	});

	it("detects and preserves 'Version ' prefix", () => {
		const result = suggestNextVersion(["Version 1.0.2"]);
		expect(result).toEqual({
			prefix: "Version ",
			patch: "Version 1.0.3",
			minor: "Version 1.1.0",
			major: "Version 2.0.0",
		});
	});

	it("detects and preserves 'v' prefix", () => {
		const result = suggestNextVersion(["v2.3.1"]);
		expect(result).toEqual({
			prefix: "v",
			patch: "v2.3.2",
			minor: "v2.4.0",
			major: "v3.0.0",
		});
	});

	it("uses first name in array (assumes sorted by date desc)", () => {
		const result = suggestNextVersion(["Version 2.0.0", "Version 1.0.0"]);
		expect(result).toEqual({
			prefix: "Version ",
			patch: "Version 2.0.1",
			minor: "Version 2.1.0",
			major: "Version 3.0.0",
		});
	});

	it("handles version 0.0.0", () => {
		const result = suggestNextVersion(["0.0.0"]);
		expect(result).toEqual({
			prefix: "",
			patch: "0.0.1",
			minor: "0.1.0",
			major: "1.0.0",
		});
	});

	it("handles two-segment versions as non-parseable", () => {
		expect(suggestNextVersion(["1.0"])).toBeNull();
	});
});
