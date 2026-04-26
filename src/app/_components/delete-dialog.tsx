"use client";

import { LoaderCircleIcon } from "lucide-react";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function DeleteDialog({
	releaseName,
	onConfirm,
	disabled,
	isPending,
	trigger,
}: {
	releaseName: string;
	onConfirm: () => void;
	disabled?: boolean;
	isPending?: boolean;
	trigger: React.ReactNode;
}) {
	return (
		<AlertDialog>
			<AlertDialogTrigger asChild disabled={disabled}>
				{trigger}
			</AlertDialogTrigger>
			<AlertDialogContent onClick={(event) => event.stopPropagation()}>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete release?</AlertDialogTitle>
					<AlertDialogDescription>
						<strong className="text-foreground">{releaseName}</strong> and its
						activity history will be permanently deleted. This action cannot be
						undone.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						className="bg-destructive text-white hover:bg-destructive/90"
						disabled={isPending}
						onClick={onConfirm}
					>
						{isPending ? (
							<>
								<LoaderCircleIcon className="animate-spin" />
								Deleting...
							</>
						) : (
							"Delete"
						)}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
