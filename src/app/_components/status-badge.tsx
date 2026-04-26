import type { ReleaseStatus } from "@/shared/steps";

const styles: Record<ReleaseStatus, string> = {
	planned: "bg-gray-100 text-gray-700",
	ongoing: "bg-amber-100 text-amber-700",
	done: "bg-green-100 text-green-700",
};

export function StatusBadge({ status }: { status: ReleaseStatus }) {
	return (
		<span
			className={`inline-block rounded-full px-3 py-0.5 font-semibold text-xs capitalize ${styles[status]}`}
		>
			{status}
		</span>
	);
}
