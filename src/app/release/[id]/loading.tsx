import {
	Card,
	CardContent,
	CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReleaseDetailLoading() {
	return (
		<Card>
			<CardHeader className="border-b">
				<nav className="flex items-center gap-1.5">
					<Skeleton className="h-5 w-24" />
					<Skeleton className="size-4 rounded-full" />
					<Skeleton className="h-5 w-32" />
				</nav>
				<Skeleton className="ml-auto h-9 w-24" />
			</CardHeader>

			<CardContent>
				<div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div className="space-y-2">
						<Skeleton className="h-4 w-16" />
						<Skeleton className="h-9 w-full" />
					</div>
					<div className="space-y-2">
						<Skeleton className="h-4 w-10" />
						<Skeleton className="h-9 w-full" />
					</div>
				</div>

				<div className="mb-6 space-y-2">
					{Array.from({ length: 10 }).map((_, i) => (
						<div
							className="flex items-center gap-3 px-2 py-2"
							key={i}
						>
							<Skeleton className="size-4 rounded-sm" />
							<Skeleton
								className="h-4"
								style={{ width: `${55 + (i * 17) % 35}%` }}
							/>
						</div>
					))}
				</div>

				<div className="mb-6 space-y-2">
					<Skeleton className="h-4 w-48" />
					<Skeleton className="h-24 w-full" />
				</div>

				<div className="flex justify-end">
					<Skeleton className="h-9 w-20" />
				</div>
			</CardContent>
		</Card>
	);
}
