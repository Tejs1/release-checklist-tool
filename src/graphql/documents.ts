import { graphql } from "./graphql";

// gql.tada infers types from string literals, so the Release selection set is
// inlined in each document rather than interpolated or shared via a fragment
// (fragments would mask the fields and require `readFragment` at every read).

export const ReleasesDocument = graphql(`
	query Releases {
		releases {
			id
			name
			date
			additionalInfo
			completedSteps
			stepCompletedAt
			createdAt
			updatedAt
			status
		}
	}
`);

export const ReleaseDocument = graphql(`
	query Release($id: Int!) {
		release(id: $id) {
			id
			name
			date
			additionalInfo
			completedSteps
			stepCompletedAt
			createdAt
			updatedAt
			status
		}
	}
`);

export const SuggestVersionDocument = graphql(`
	query SuggestVersion {
		suggestVersion {
			prefix
			patch
			minor
			major
		}
	}
`);

export const OngoingReleaseDocument = graphql(`
	query OngoingRelease {
		ongoingRelease {
			id
			name
			completedCount
			totalSteps
			status
		}
	}
`);

export const ActivityLogDocument = graphql(`
	query ActivityLog($releaseId: Int!) {
		activityLog(releaseId: $releaseId) {
			id
			releaseId
			action
			detail
			createdAt
		}
	}
`);

export const CreateReleaseDocument = graphql(`
	mutation CreateRelease($input: CreateReleaseInput!) {
		createRelease(input: $input) {
			id
			name
			date
			additionalInfo
			completedSteps
			stepCompletedAt
			createdAt
			updatedAt
			status
		}
	}
`);

export const UpdateReleaseDocument = graphql(`
	mutation UpdateRelease($input: UpdateReleaseInput!) {
		updateRelease(input: $input) {
			id
			name
			date
			additionalInfo
			completedSteps
			stepCompletedAt
			createdAt
			updatedAt
			status
		}
	}
`);

export const DeleteReleaseDocument = graphql(`
	mutation DeleteRelease($id: Int!) {
		deleteRelease(id: $id)
	}
`);
