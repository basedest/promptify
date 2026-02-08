# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm dev                    # Start Next.js dev server (localhost:3000)
pnpm build                  # Build for production
pnpm start                  # Start production server

# Code Quality
pnpm lint                   # Run ESLint
pnpm lint:fix               # Run ESLint with --fix
pnpm ts:check               # TypeScript type check

# Database
pnpm cluster                # Start PostgreSQL via Docker Compose
pnpm cluster:daemon         # Start PostgreSQL in background
pnpm prisma:generate        # Generate Prisma client after schema changes
pnpm prisma:migrate         # Run migrations
pnpm prisma:studio          # Open Prisma Studio GUI

# Issue Tracking (beads)
bd ready                    # Show actionable issues (no blockers)
bd list --status=open       # All open issues
bd create --title="..." --type=task --priority=2
bd close <id>               # Complete issue
bd sync                     # Commit changes to git
```

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **UI**: shadcn/ui (Radix + Tailwind CSS 4)
- **API**: tRPC 11 + TanStack React Query
- **Database**: PostgreSQL 16 + Prisma 7
- **Auth**: Better Auth (session-based, email/password)
- **i18n**: next-intl
- **Logging**: Pino (structured JSON)
- **Package Manager**: pnpm (required, not npm/yarn)

## Architecture: Feature-Sliced Design (FSD)

The project follows **Feature-Sliced Design v2.1** adapted for Next.js. See `docs/fsd.md` for full rules.

### Layer Hierarchy (imports only go downward)

```
app/           → Next.js routing only, no business logic
  ↓
src/pages/     → Page orchestration, data fetching
  ↓
src/widgets/   → Large reusable UI blocks
  ↓
src/features/  → User actions (verbs): auth/login, auth/logout
  ↓
src/entities/  → Domain models (nouns)
  ↓
src/shared/    → Context-agnostic: ui/, lib/, config/
```

### Key Rules

- `app/` routes must only import from `src/pages/` and render page components
- Features are named as verbs (`login`, `register`), entities as nouns
- No generic `utils/` or `components/` folders
- ESLint enforces layer boundaries

## Important Patterns

### Adding shadcn/ui Components

Always use the CLI, never write manually:
```bash
pnpm dlx shadcn@latest add <component-name>
```

### Database Changes

1. Edit `prisma/schema.prisma`
2. Run `pnpm prisma:generate`
3. Run `pnpm prisma:migrate`
4. Never edit `src/generated/prisma/`

### Logging

Use Pino logger from `src/shared/lib/logger.ts`, never `console.log`:
```ts
logger.info({ userId, action }, 'Action completed');
logger.error({ err, context }, 'Operation failed');
```

### Environment Variables

- Server validation: `src/shared/config/env/server.ts`
- Client validation: `src/shared/config/env/client.ts`
- Required: `DATABASE_URL`, `BETTER_AUTH_SECRET` (min 32 chars)

## Session Completion Protocol

Before ending any session:
```bash
git status
bd sync
git push                    # MANDATORY - work is not complete until pushed
```
