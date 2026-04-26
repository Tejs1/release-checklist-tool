# ReleaseCheck

A release checklist tool that helps developers track their release process. Built with the T3 Stack (Next.js, tRPC, Drizzle ORM, Tailwind CSS) backed by PostgreSQL.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (or Node.js 18+)
- A PostgreSQL database (e.g., [Neon](https://neon.tech/) free tier)

### Setup

```bash
# Install dependencies
bun install

# Copy environment file and add your database URL
cp .env.example .env
# Edit .env with your PostgreSQL connection string

# Push the database schema
bun run db:push

# Start the dev server
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Docker (local development)

```bash
# Start PostgreSQL + app
docker compose up

# In a separate terminal (first time only): push the schema
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/releasecheck" bun run db:push
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

## API Endpoints (tRPC)

All endpoints are served via tRPC at `/api/trpc`. The procedures are:

| Procedure               | Type     | Input                                              | Description                                      |
| ----------------------- | -------- | -------------------------------------------------- | ------------------------------------------------ |
| `release.list`          | Query    | —                                                  | List all releases (sorted by date desc)           |
| `release.getById`       | Query    | `{ id: number }`                                   | Get a single release by ID                        |
| `release.suggestVersion`| Query    | —                                                  | Suggest next patch/minor/major version names      |
| `release.getOngoing`    | Query    | —                                                  | Get the most recent ongoing release (if any)      |
| `release.getActivityLog`| Query    | `{ releaseId: number }`                            | Get activity log entries for a release            |
| `release.create`        | Mutation | `{ name, date, additionalInfo? }`                  | Create a new release (date must not be in past)   |
| `release.update`        | Mutation | `{ id, name, date, additionalInfo, completedSteps }` | Update a release (enforces step dependencies)  |
| `release.delete`        | Mutation | `{ id: number }`                                   | Delete a release and its activity log             |

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS 4
- **API**: tRPC v11
- **Database**: PostgreSQL via Neon + Drizzle ORM
- **Deployment**: Vercel + Neon
