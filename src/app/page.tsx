import Link from "next/link";

import { ReleaseList } from "@/app/_components/release-list";
import { api, HydrateClient } from "@/trpc/server";

export default async function Home() {
	void api.release.list.prefetch();

	return (
		<HydrateClient>
			<div className="rounded-lg border border-gray-200 bg-white p-6">
				<div className="mb-6 flex items-center justify-between">
					<h2 className="font-medium text-primary text-sm">All releases</h2>
					<Link
						className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-primary-hover"
						href="/release/new"
					>
						New release
						<svg
							aria-hidden="true"
							className="h-4 w-4"
							fill="none"
							stroke="currentColor"
							strokeWidth={2}
							viewBox="0 0 24 24"
						>
							<path
								d="M12 4v16m8-8H4"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</Link>
				</div>
				<ReleaseList />
			</div>
		</HydrateClient>
	);
}
