import { Badge } from "@/components/ui/badge";
import type { ReleaseStatus } from "@/shared/steps";

const styles: Record<ReleaseStatus, string> = {
	planned: "bg-secondary text-secondary-foreground",
	ongoing:
		"bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
	done: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
};

export function StatusBadge({ status }: { status: ReleaseStatus }) {
	return (
		<Badge className={`capitalize ${styles[status]}`} variant="secondary">
			{status}
		</Badge>
	);
}
