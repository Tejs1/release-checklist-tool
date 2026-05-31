# GraphQL Backend Migration — Design

**Date:** 2026-05-31
**Status:** Approved

## Goal

Migrate the backend from tRPC to GraphQL. Replace the tRPC v11 API with a
**GraphQL Yoga + Pothos** (code-first) server at `/api/graphql`, and rewire the
frontend to consume GraphQL while keeping `@tanstack/react-query` as the cache
layer. All business logic in `src/shared/steps.ts` is reused verbatim — only the
transport layer changes.

## Decisions (locked)

| Area | Choice |
| --- | --- |
| Scope | Replace tRPC on backend **and** frontend; keep `@tanstack/react-query` as the cache |
| Server stack | GraphQL Yoga + Pothos (code-first schema) |
| Client typing | gql.tada (zero codegen — types inferred from the schema SDL) |
| RSC fetching | In-process schema execution on the server; HTTP at `/api/graphql` on the client |

## Architecture

```
src/server/graphql/
  builder.ts      Pothos SchemaBuilder (Context = { db }), scalar + enum registration
  context.ts      createContext() -> { db }   (mirrors createTRPCContext)
  scalars.ts      DateTime + JSON scalars (graphql-scalars)
  types.ts        Release, ActivityEvent, OngoingRelease, VersionSuggestion, ReleaseStatus enum
  release.ts      Query + Mutation field definitions (the 8 operations)
  schema.ts       builder.toSchema() -> exported `schema`
src/app/api/graphql/route.ts   createYoga handler (GET/POST), graphiql in dev

src/graphql/
  graphql.ts      initGraphQLTada<{ introspection; scalars }>() -> `graphql` tag
  client.ts       gqlFetch: in-process execute on the server, HTTP request on the client
  documents.ts    all typed query/mutation documents
  hooks.ts        "use client" react-query hooks replacing api.release.*
  server.ts       RSC prefetch helpers + HydrateClient (react-query dehydration)
  query-client.ts react-query factory (no superjson — GraphQL returns plain JSON)
```

Removed: `src/server/api/**`, `src/trpc/**`, `src/app/api/trpc/**`.

## GraphQL schema

### Operation mapping

| tRPC procedure | GraphQL operation |
| --- | --- |
| `release.list` | `query releases: [Release!]!` |
| `release.getById` | `query release(id: Int!): Release` |
| `release.suggestVersion` | `query suggestVersion: VersionSuggestion!` |
| `release.getOngoing` | `query ongoingRelease: OngoingRelease` |
| `release.getActivityLog` | `query activityLog(releaseId: Int!): [ActivityEvent!]!` |
| `release.create` | `mutation createRelease(input: CreateReleaseInput!): Release!` |
| `release.update` | `mutation updateRelease(input: UpdateReleaseInput!): Release!` |
| `release.delete` | `mutation deleteRelease(id: Int!): Boolean!` |

### Types

- `Release { id: Int!, name: String!, date: DateTime!, additionalInfo: String, completedSteps: [String!]!, stepCompletedAt: JSON!, createdAt: DateTime!, updatedAt: DateTime!, status: ReleaseStatus! }`
  - `status` is a **computed field resolver** calling `computeStatus(parent.completedSteps)`. This removes the manual `.map(r => ({ ...r, status }))` from the `list` and `getById` resolvers.
- `enum ReleaseStatus { planned, ongoing, done }`
- `OngoingRelease { id: Int!, name: String!, completedCount: Int!, totalSteps: Int!, status: ReleaseStatus! }`
- `VersionSuggestion { patch: String!, minor: String!, major: String! }`
- `ActivityEvent { id: Int!, releaseId: Int!, action: String!, detail: String, createdAt: DateTime! }`

### Inputs

- `CreateReleaseInput { name: String!, date: DateTime!, additionalInfo: String }`
- `UpdateReleaseInput { id: Int!, name: String!, date: DateTime!, additionalInfo: String, completedSteps: [String!]! }`

Resolver bodies are copied from `src/server/api/routers/release.ts` unchanged:
same Drizzle queries, same activity-log writes, same dependency checks via
`canCompleteStep` / `getDependentSteps`, same duplicate-name and past-date
guards.

## Frontend rewiring

react-query hooks in `src/graphql/hooks.ts` replace each call site one-to-one,
with a stable query-key convention (`["releases"]`, `["release", id]`,
`["suggestVersion"]`, `["ongoingRelease"]`, `["activityLog", id]`).

| Today | After |
| --- | --- |
| `api.release.list.useQuery()` | `useReleasesQuery()` |
| `api.release.getById.useQuery({id}, {initialData})` | `useReleaseQuery(id, {initialData})` |
| `api.release.suggestVersion.useQuery()` | `useSuggestVersionQuery()` |
| `api.release.getOngoing.useQuery(undefined,{enabled})` | `useOngoingReleaseQuery({enabled})` |
| `api.release.getActivityLog.useQuery({releaseId},{enabled})` | `useActivityLogQuery(releaseId,{enabled})` |
| `api.useUtils()` + `utils.release.list.invalidate()` | `useQueryClient()` + `queryClient.invalidateQueries({queryKey:["releases"]})` |
| `api.release.create.useMutation({onSuccess,onError})` | `useCreateRelease({onSuccess,onError})` |
| `api.release.update.useMutation(...)` | `useUpdateRelease(...)` |
| `api.release.delete.useMutation(...)` | `useDeleteRelease(...)` |

Mutation `onError` continues to surface `err.message` for the save-error banner
in `release-form.tsx`.

### RSC / SSR

- `src/app/layout.tsx`: `TRPCReactProvider` → `ReactQueryProvider` (QueryClientProvider only).
- `src/app/page.tsx` and `src/app/release/new/page.tsx`: server-prefetch via the
  `src/graphql/server.ts` helper into a server `QueryClient`, wrapped in
  `<HydrateClient>` (react-query `HydrationBoundary` + dehydration).
- `src/app/release/[id]/page.tsx`: `await gqlServer(ReleaseQuery, { id })`
  (in-process execution), preserving `notFound()` on a missing release.

`gqlFetch` branches on environment: on the server it runs `execute` against the
imported `schema` with a fresh `createContext()`; in the browser it calls
`request("/api/graphql", document, variables)` from `graphql-request`. gql.tada
`TadaDocumentNode`s are valid `DocumentNode`s, so the same typed document works
on both paths.

## Errors & dates

- **Errors:** every `throw` in the resolvers becomes
  `new GraphQLError(message, { extensions: { code } })` with codes
  `BAD_REQUEST`, `CONFLICT`, `NOT_FOUND`. The bare
  `throw new Error("Cannot complete step…")` in `update` also becomes a
  `GraphQLError` so its message reaches the UI. Yoga surfaces `GraphQLError`
  messages to clients; masking stays on for genuinely unexpected errors.
- **Dates:** the `DateTime` scalar serializes to / parses from ISO strings on the
  wire (replacing superjson's `Date` transport). gql.tada scalar config maps
  `DateTime -> string` and `JSON -> Record<string, string>`. Components already
  wrap dates in `new Date(...)`, so the string types are compatible; the
  `InitialRelease` (release-detail.tsx) and `ReleaseData` (release-form.tsx) prop
  types change `Date -> string`. Mutation hooks send `date.toISOString()`.

## Dependencies & tooling

- **Remove:** `@trpc/server`, `@trpc/client`, `@trpc/react-query`, `superjson`.
- **Add:** `graphql`, `graphql-yoga`, `@pothos/core`, `graphql-scalars`,
  `graphql-request`, `gql.tada`; dev: `@0no-co/graphqlsp`.
- **Keep:** `@tanstack/react-query`, `zod` (resolver input validation), Drizzle, Neon.
- `package.json`: add a `gql:schema` script that emits the schema SDL via
  `printSchema(schema)` to `schema.graphql` (consumed by gql.tada).
- `tsconfig.json`: add the `gql.tada/ts-plugin` entry pointing at `schema.graphql`
  with `tadaOutputLocation` for the generated `graphql-env.d.ts`.

## Testing & verification

- The existing vitest suite is untouched — it exercises `src/shared/steps.ts`,
  which does not change — and must stay green.
- Verification gate: `bun run typecheck`, `bun run check` (biome),
  `bun run test`, `bun run build`.
- Manual smoke via GraphiQL and the UI: list releases, create a release
  (incl. past-date and duplicate-name rejection), toggle steps (incl. blocked
  prerequisite), view activity log, version autocomplete, delete.

## Out of scope

- No schema/database changes.
- No new features or auth — behavior parity with the current tRPC API only.
- No GraphQL subscriptions.
