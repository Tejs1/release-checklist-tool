/* eslint-disable */
/* prettier-ignore */

export type introspection_types = {
    'ActivityEvent': { kind: 'OBJECT'; name: 'ActivityEvent'; fields: { 'action': { name: 'action'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'String'; ofType: null; }; } }; 'createdAt': { name: 'createdAt'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'DateTime'; ofType: null; }; } }; 'detail': { name: 'detail'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'id': { name: 'id'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'Int'; ofType: null; }; } }; 'releaseId': { name: 'releaseId'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'Int'; ofType: null; }; } }; }; };
    'Boolean': unknown;
    'CreateReleaseInput': { kind: 'INPUT_OBJECT'; name: 'CreateReleaseInput'; isOneOf: false; inputFields: [{ name: 'additionalInfo'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; }; defaultValue: null }, { name: 'date'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'DateTime'; ofType: null; }; }; defaultValue: null }, { name: 'name'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'String'; ofType: null; }; }; defaultValue: null }]; };
    'DateTime': unknown;
    'Int': unknown;
    'JSON': unknown;
    'Mutation': { kind: 'OBJECT'; name: 'Mutation'; fields: { 'createRelease': { name: 'createRelease'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'OBJECT'; name: 'Release'; ofType: null; }; } }; 'deleteRelease': { name: 'deleteRelease'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'Boolean'; ofType: null; }; } }; 'updateRelease': { name: 'updateRelease'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'OBJECT'; name: 'Release'; ofType: null; }; } }; }; };
    'OngoingRelease': { kind: 'OBJECT'; name: 'OngoingRelease'; fields: { 'completedCount': { name: 'completedCount'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'Int'; ofType: null; }; } }; 'id': { name: 'id'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'Int'; ofType: null; }; } }; 'name': { name: 'name'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'String'; ofType: null; }; } }; 'status': { name: 'status'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'ENUM'; name: 'ReleaseStatus'; ofType: null; }; } }; 'totalSteps': { name: 'totalSteps'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'Int'; ofType: null; }; } }; }; };
    'Query': { kind: 'OBJECT'; name: 'Query'; fields: { 'activityLog': { name: 'activityLog'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'LIST'; name: never; ofType: { kind: 'NON_NULL'; name: never; ofType: { kind: 'OBJECT'; name: 'ActivityEvent'; ofType: null; }; }; }; } }; 'ongoingRelease': { name: 'ongoingRelease'; type: { kind: 'OBJECT'; name: 'OngoingRelease'; ofType: null; } }; 'release': { name: 'release'; type: { kind: 'OBJECT'; name: 'Release'; ofType: null; } }; 'releases': { name: 'releases'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'LIST'; name: never; ofType: { kind: 'NON_NULL'; name: never; ofType: { kind: 'OBJECT'; name: 'Release'; ofType: null; }; }; }; } }; 'suggestVersion': { name: 'suggestVersion'; type: { kind: 'OBJECT'; name: 'VersionSuggestion'; ofType: null; } }; }; };
    'Release': { kind: 'OBJECT'; name: 'Release'; fields: { 'additionalInfo': { name: 'additionalInfo'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'completedSteps': { name: 'completedSteps'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'LIST'; name: never; ofType: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'String'; ofType: null; }; }; }; } }; 'createdAt': { name: 'createdAt'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'DateTime'; ofType: null; }; } }; 'date': { name: 'date'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'DateTime'; ofType: null; }; } }; 'id': { name: 'id'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'Int'; ofType: null; }; } }; 'name': { name: 'name'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'String'; ofType: null; }; } }; 'status': { name: 'status'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'ENUM'; name: 'ReleaseStatus'; ofType: null; }; } }; 'stepCompletedAt': { name: 'stepCompletedAt'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'JSON'; ofType: null; }; } }; 'updatedAt': { name: 'updatedAt'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'DateTime'; ofType: null; }; } }; }; };
    'ReleaseStatus': { name: 'ReleaseStatus'; enumValues: 'done' | 'ongoing' | 'planned'; };
    'String': unknown;
    'UpdateReleaseInput': { kind: 'INPUT_OBJECT'; name: 'UpdateReleaseInput'; isOneOf: false; inputFields: [{ name: 'additionalInfo'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; }; defaultValue: null }, { name: 'completedSteps'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'LIST'; name: never; ofType: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'String'; ofType: null; }; }; }; }; defaultValue: null }, { name: 'date'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'DateTime'; ofType: null; }; }; defaultValue: null }, { name: 'id'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'Int'; ofType: null; }; }; defaultValue: null }, { name: 'name'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'String'; ofType: null; }; }; defaultValue: null }]; };
    'VersionSuggestion': { kind: 'OBJECT'; name: 'VersionSuggestion'; fields: { 'major': { name: 'major'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'String'; ofType: null; }; } }; 'minor': { name: 'minor'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'String'; ofType: null; }; } }; 'patch': { name: 'patch'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'String'; ofType: null; }; } }; 'prefix': { name: 'prefix'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'String'; ofType: null; }; } }; }; };
};

/** An IntrospectionQuery representation of your schema.
 *
 * @remarks
 * This is an introspection of your schema saved as a file by GraphQLSP.
 * It will automatically be used by `gql.tada` to infer the types of your GraphQL documents.
 * If you need to reuse this data or update your `scalars`, update `tadaOutputLocation` to
 * instead save to a .ts instead of a .d.ts file.
 */
export type introspection = {
  name: never;
  query: 'Query';
  mutation: 'Mutation';
  subscription: never;
  types: introspection_types;
};

import * as gqlTada from 'gql.tada';

declare module 'gql.tada' {
  interface setupSchema {
    introspection: introspection
  }
}