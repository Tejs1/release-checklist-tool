import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DeleteDialog } from "@/app/_components/delete-dialog";

describe("DeleteDialog", () => {
	it("renders the trigger button", () => {
		render(
			<DeleteDialog
				onConfirm={() => {}}
				releaseName="Version 1.0.0"
				trigger={<button type="button">Delete</button>}
			/>,
		);
		expect(screen.getByText("Delete")).toBeInTheDocument();
	});

	it("shows dialog content when trigger is clicked", async () => {
		const user = userEvent.setup();
		render(
			<DeleteDialog
				onConfirm={() => {}}
				releaseName="Version 1.0.0"
				trigger={<button type="button">Delete</button>}
			/>,
		);

		await user.click(screen.getByText("Delete"));

		expect(screen.getByText("Delete release?")).toBeInTheDocument();
		expect(screen.getByText("Version 1.0.0")).toBeInTheDocument();
		expect(
			screen.getByText(/permanently deleted/),
		).toBeInTheDocument();
	});

	it("calls onConfirm when Delete is confirmed", async () => {
		const onConfirm = vi.fn();
		const user = userEvent.setup();

		render(
			<DeleteDialog
				onConfirm={onConfirm}
				releaseName="Version 1.0.0"
				trigger={<button type="button">Open</button>}
			/>,
		);

		await user.click(screen.getByText("Open"));
		await user.click(screen.getByRole("button", { name: "Delete" }));

		expect(onConfirm).toHaveBeenCalledOnce();
	});

	it("does not call onConfirm when Cancel is clicked", async () => {
		const onConfirm = vi.fn();
		const user = userEvent.setup();

		render(
			<DeleteDialog
				onConfirm={onConfirm}
				releaseName="Version 1.0.0"
				trigger={<button type="button">Open</button>}
			/>,
		);

		await user.click(screen.getByText("Open"));
		await user.click(screen.getByRole("button", { name: "Cancel" }));

		expect(onConfirm).not.toHaveBeenCalled();
	});
});
