"use client";

import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { api } from "@/trpc/react";

export function VersionAutocomplete({
	value,
	onChange,
}: {
	value: string;
	onChange: (value: string) => void;
}) {
	const [open, setOpen] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const { data: suggestion } = api.release.suggestVersion.useQuery();

	const suggestions = suggestion
		? [
				{ label: "patch", value: suggestion.patch },
				{ label: "minor", value: suggestion.minor },
				{ label: "major", value: suggestion.major },
			]
		: [];

	useEffect(() => {
		if (suggestion && !value) {
			onChange(suggestion.patch);
		}
	}, [suggestion, value, onChange]);

	return (
		<Popover open={open && suggestions.length > 0}>
			<PopoverTrigger asChild>
				<Input
					id="release-name"
					onChange={(e) => onChange(e.target.value)}
					onBlur={() => setTimeout(() => setOpen(false), 150)}
					onFocus={() => setOpen(true)}
					placeholder="e.g. Version 1.0.0"
					ref={inputRef}
					required
					type="text"
					value={value}
				/>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				className="w-[var(--radix-popover-trigger-width)] p-0"
				onOpenAutoFocus={(e) => e.preventDefault()}
			>
				<div className="border-b px-3 py-2 text-muted-foreground text-xs">
					Suggested versions
				</div>
				{suggestions.map((s) => (
					<button
						className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
							value === s.value ? "bg-accent font-medium" : ""
						}`}
						key={s.label}
						onClick={() => {
							onChange(s.value);
							setOpen(false);
							inputRef.current?.focus();
						}}
						type="button"
					>
						{s.value}
						<span className="text-muted-foreground text-xs">— {s.label}</span>
					</button>
				))}
			</PopoverContent>
		</Popover>
	);
}
