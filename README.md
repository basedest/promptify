# Promptify

Next.js application with AI chat, authentication, and structured domain logic.

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **UI**: shadcn/ui (Radix + Tailwind CSS 4)
- **API**: tRPC 11 + TanStack React Query
- **Database**: PostgreSQL 16 + Prisma 7
- **Auth**: Better Auth (session-based, email/password)
- **i18n**: next-intl
- **Logging**: Pino (structured JSON)

**Package manager**: `pnpm` only (do not use npm or yarn).

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (`corepack enable && corepack prepare pnpm@latest --activate`)
- Docker (for PostgreSQL)

### Setup

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Environment**

   Copy `.env.example` to `.env` and set at least:
   - `DATABASE_URL` — PostgreSQL connection string
   - `BETTER_AUTH_SECRET` — at least 32 characters (`openssl rand -base64 32`)
   - `BETTER_AUTH_URL` — app URL (e.g. `http://localhost:3000`)
   - `OPENROUTER_API_KEY` — for AI chat ([OpenRouter](https://openrouter.ai/keys))

3. **Database**

   ```bash
   pnpm cluster          # Start PostgreSQL (or pnpm cluster:daemon for background)
   pnpm prisma:generate
   pnpm prisma:migrate
   ```

4. **Run the app**

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Commands

| Command | Description |
|--------|-------------|
| `pnpm dev` | Start Next.js dev server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm lint:fix` | ESLint with auto-fix |
| `pnpm ts:check` | TypeScript type check |
| `pnpm cluster` | Start PostgreSQL (Docker Compose) |
| `pnpm cluster:daemon` | Start PostgreSQL in background |
| `pnpm prisma:generate` | Generate Prisma client |
| `pnpm prisma:migrate` | Run migrations |
| `pnpm prisma:studio` | Open Prisma Studio |

Issue tracking uses [beads](https://github.com/beads-dev/beads): `bd ready`, `bd list --status=open`, `bd close <id>`, `bd sync`.

## Architecture

The project follows **Feature-Sliced Design (FSD)** v2.1 adapted for Next.js. Layers (imports only downward):

- `app/` — routing only
- `src/views/` — page orchestration
- `src/widgets/` — large UI blocks
- `src/features/` — user actions (verbs)
- `src/entities/` — domain models (nouns)
- `src/shared/` — UI, lib, config

See [docs/fsd.md](docs/fsd.md) for full rules. For AI/agent guidance, see [CLAUDE.md](CLAUDE.md) and [AGENTS.md](AGENTS.md).

## Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [FSD rules](docs/fsd.md)
- [.env.example](.env.example) — environment variable reference
