import { redirect } from "next/navigation";

import { env } from "@/env";

export function GET() {
	if (!env.DEMO_LINK) {
		redirect("/");
	}

	redirect(env.DEMO_LINK);
}
