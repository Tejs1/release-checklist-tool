"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { gqlRequest } from "./client";
import {
	ActivityLogDocument,
	CreateReleaseDocument,
	DeleteReleaseDocument,
	OngoingReleaseDocument,
	ReleaseDocument,
	ReleasesDocument,
	SuggestVersionDocument,
	UpdateReleaseDocument,
} from "./documents";
import type { ResultOf } from "./graphql";

export type Release = ResultOf<typeof ReleasesDocument>["releases"][number];

// --- Queries ---

export function useReleasesQuery() {
	return useQuery({
		queryKey: ["releases"],
		queryFn: () => gqlRequest(ReleasesDocument),
		select: (data) => data.releases,
	});
}

export function useReleaseQuery(
	id: number,
	options?: { initialData?: Release },
) {
	return useQuery({
		queryKey: ["release", id],
		queryFn: () => gqlRequest(ReleaseDocument, { id }),
		select: (data) => data.release,
		initialData: options?.initialData
			? { release: options.initialData }
			: undefined,
	});
}

export function useSuggestVersionQuery() {
	return useQuery({
		queryKey: ["suggestVersion"],
		queryFn: () => gqlRequest(SuggestVersionDocument),
		select: (data) => data.suggestVersion,
	});
}

export function useOngoingReleaseQuery(options?: { enabled?: boolean }) {
	return useQuery({
		queryKey: ["ongoingRelease"],
		queryFn: () => gqlRequest(OngoingReleaseDocument),
		select: (data) => data.ongoingRelease,
		enabled: options?.enabled,
	});
}

export function useActivityLogQuery(
	releaseId: number,
	options?: { enabled?: boolean },
) {
	return useQuery({
		queryKey: ["activityLog", releaseId],
		queryFn: () => gqlRequest(ActivityLogDocument, { releaseId }),
		select: (data) => data.activityLog,
		enabled: options?.enabled,
	});
}

// --- Mutations ---

type CreateReleaseResult = ResultOf<
	typeof CreateReleaseDocument
>["createRelease"];

export function useCreateRelease(options?: {
	onSuccess?: (data: CreateReleaseResult) => void;
	onError?: (error: Error) => void;
}) {
	return useMutation({
		mutationFn: (input: {
			name: string;
			date: Date;
			additionalInfo?: string;
		}) =>
			gqlRequest(CreateReleaseDocument, {
				input: {
					name: input.name,
					date: input.date.toISOString(),
					additionalInfo: input.additionalInfo,
				},
			}).then((data) => data.createRelease),
		onSuccess: options?.onSuccess,
		onError: options?.onError,
	});
}

export function useUpdateRelease(options?: {
	onSuccess?: () => void;
	onError?: (error: Error) => void;
}) {
	return useMutation({
		mutationFn: (input: {
			id: number;
			name: string;
			date: Date;
			additionalInfo: string | null;
			completedSteps: string[];
		}) =>
			gqlRequest(UpdateReleaseDocument, {
				input: {
					id: input.id,
					name: input.name,
					date: input.date.toISOString(),
					additionalInfo: input.additionalInfo,
					completedSteps: input.completedSteps,
				},
			}).then((data) => data.updateRelease),
		onSuccess: options?.onSuccess,
		onError: options?.onError,
	});
}

export function useDeleteRelease(options?: { onSuccess?: () => void }) {
	return useMutation({
		mutationFn: (vars: { id: number }) =>
			gqlRequest(DeleteReleaseDocument, vars).then(
				(data) => data.deleteRelease,
			),
		onSuccess: options?.onSuccess,
	});
}

// --- Cache invalidation helper ---

export function useReleaseCache() {
	const queryClient = useQueryClient();
	return {
		invalidateReleases: () =>
			queryClient.invalidateQueries({ queryKey: ["releases"] }),
		invalidateRelease: (id: number) =>
			queryClient.invalidateQueries({ queryKey: ["release", id] }),
		invalidateSuggestVersion: () =>
			queryClient.invalidateQueries({ queryKey: ["suggestVersion"] }),
		invalidateActivityLog: (releaseId: number) =>
			queryClient.invalidateQueries({ queryKey: ["activityLog", releaseId] }),
	};
}
