import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ReleaseNotFound() {
	return (
		<Card className="py-16 text-center">
			<CardContent className="flex flex-col items-center gap-4">
				<p className="font-semibold text-4xl text-gray-300">404</p>
				<h2 className="font-semibold text-lg text-gray-900">
					Release not found
				</h2>
				<p className="text-gray-500 text-sm">
					The release you&apos;re looking for doesn&apos;t exist or has
					been deleted.
				</p>
				<Button asChild className="mt-2">
					<Link href="/">Go back to releases</Link>
				</Button>
			</CardContent>
		</Card>
	);
}
