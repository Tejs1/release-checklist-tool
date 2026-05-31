# ReleaseCheck

A release checklist tool that helps developers track their release process. Built with Next.js, a GraphQL API, Drizzle ORM, and Tailwind CSS, backed by PostgreSQL.

## Running locally

### Prerequisites

- [Bun](https://bun.sh/) (or Node.js 18+)
- Either [Docker](https://www.docker.com/) (Option A) or a PostgreSQL database such as a [Neon](https://neon.tech/) free tier (Option B)

The app picks its database driver from the connection string automatically: a
Neon URL (host contains `neon.tech`) uses the serverless HTTP driver, while any
other Postgres URL uses a standard TCP connection — so the **same code runs
against a local container or Neon with no changes**.

### Option A — Docker (Postgres in a container)

The quickest way to run the whole stack locally; no external database needed.

```bash
# 1. Install dependencies
bun install

# 2. Start PostgreSQL + the app
docker compose up -d

# 3. First run only — create the tables
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/releasecheck" bun run db:push
```

The app is now at [http://localhost:3000](http://localhost:3000).

Prefer to run the app from source (hot reload) against the container's Postgres?
Start only the database:

```bash
docker compose up -d db
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/releasecheck" bun run db:push
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/releasecheck" bun dev
```

### Option B — Bun + your own database

```bash
bun install
cp .env.example .env       # set DATABASE_URL to your Postgres / Neon connection string
bun run db:push            # create the tables
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

### Try the API

Open [http://localhost:3000/api/graphql](http://localhost:3000/api/graphql) for
the GraphiQL explorer, or query it directly:

```bash
curl -s http://localhost:3000/api/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ releases { id name status } suggestVersion { patch minor major } }"}'
```

## Database Schema

### `release-checklist-tool_release`

| Column             | Type                     | Constraints                |
| ------------------ | ------------------------ | -------------------------- |
| `id`               | `serial`                 | Primary key                |
| `name`             | `varchar(256)`           | Not null                   |
| `date`             | `timestamp with tz`      | Not null                   |
| `additional_info`  | `text`                   | Nullable                   |
| `completed_steps`  | `jsonb` (`string[]`)     | Not null, default `[]`     |
| `step_completed_at`| `jsonb` (`Record<string, string>`) | Not null, default `{}` |
| `created_at`       | `timestamp with tz`      | Not null, default `now()`  |
| `updated_at`       | `timestamp with tz`      | Not null, default `now()`  |

The `status` field is **computed** from `completed_steps`:
- `planned` — no steps completed
- `ongoing` — at least one step completed
- `done` — all steps completed

`step_completed_at` maps each step ID to an ISO timestamp recording when it was completed (e.g., `{"pr-merged": "2026-04-26T10:30:00Z"}`).

### `release-checklist-tool_activity_log`

| Column       | Type                     | Constraints                                  |
| ------------ | ------------------------ | -------------------------------------------- |
| `id`         | `serial`                 | Primary key                                  |
| `release_id` | `integer`               | Not null, FK → `release.id` (cascade delete) |
| `action`     | `varchar(50)`            | Not null                                     |
| `detail`     | `text`                   | Nullable                                     |
| `created_at` | `timestamp with tz`      | Not null, default `now()`                    |

Action values: `created`, `step_completed`, `step_uncompleted`, `info_updated`, `name_updated`, `date_updated`.

## API (GraphQL)

The API is served via [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server) at
`/api/graphql` (GraphiQL is available there in development). The schema is built
code-first with [Pothos](https://pothos-graphql.dev/); the SDL is emitted to
`schema.graphql` via `bun run gql:schema`.

| Operation        | Type     | Arguments                                                       | Description                                      |
| ---------------- | -------- | --------------------------------------------------------------- | ------------------------------------------------ |
| `releases`       | Query    | —                                                               | List all releases (sorted by date desc)          |
| `release`        | Query    | `id: Int!`                                                      | Get a single release by ID (nullable)            |
| `suggestVersion` | Query    | —                                                               | Suggest next patch/minor/major version names     |
| `ongoingRelease` | Query    | —                                                               | Get the most recent ongoing release (if any)     |
| `activityLog`    | Query    | `releaseId: Int!`                                               | Get activity log entries for a release           |
| `createRelease`  | Mutation | `input: CreateReleaseInput!` (`name, date, additionalInfo?`)    | Create a new release (date must not be in past)  |
| `updateRelease`  | Mutation | `input: UpdateReleaseInput!` (`id, name, date, additionalInfo, completedSteps`) | Update a release (enforces step dependencies) |
| `deleteRelease`  | Mutation | `id: Int!`                                                      | Delete a release and its activity log            |

The frontend consumes these through typed [gql.tada](https://gql-tada.0no.co/)
documents wrapped in [@tanstack/react-query](https://tanstack.com/query) hooks
(`src/graphql/hooks.ts`). React Server Components fetch in-process against the
schema via `src/graphql/server.tsx` (no internal HTTP round-trip).

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS 4
- **API**: GraphQL — GraphQL Yoga + Pothos (server), gql.tada + graphql-request + React Query (client)
- **Database**: PostgreSQL + Drizzle ORM (Neon serverless HTTP driver in production, standard `postgres` driver for local/Docker)
- **Deployment**: Vercel + Neon (also runs locally via Docker)
