import "@/styles/globals.css";

import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "@/trpc/react";

export const metadata: Metadata = {
	title: "ReleaseCheck",
	description: "Your all-in-one release checklist tool",
	icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
	subsets: ["latin"],
	variable: "--font-geist-sans",
});

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html className={`${geist.variable}`} lang="en">
			<body className="min-h-screen bg-gray-50">
				<TRPCReactProvider>
					<header className="border-gray-200 border-b bg-white py-6 text-center">
						<h1 className="font-bold text-3xl text-gray-900 tracking-tight">
							ReleaseCheck
						</h1>
						<p className="mt-1 text-gray-500 text-sm">
							Your all-in-one release checklist tool
						</p>
					</header>
					<main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
				</TRPCReactProvider>
			</body>
		</html>
	);
}
