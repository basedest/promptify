# AGENTS.md

Baseline context and constraints for AI coding agents working in this repository.

## Quick Reference

- **Commands & Tech Stack**: See `CLAUDE.md`
- **Architecture Rules**: See `docs/fsd.md` (Feature-Sliced Design)
- **Package Manager**: `pnpm` only (not npm/yarn)

## Agent Guidelines

- Do not invent requirements — follow the task description strictly
- Prefer existing utilities and patterns over introducing new ones
- Keep changes minimal and localized
- When unsure, search the codebase first

### Prisma

1. Edit `prisma/schema.prisma`
2. Run `pnpm prisma:generate`
3. Run `pnpm prisma:migrate` if schema changed
4. Never edit `src/generated/prisma/`

### shadcn/ui

Always use the CLI, never write components manually:

```bash
pnpm dlx shadcn@latest add <component-name>
```

### Logging

Use Pino from `src/shared/lib/logger.ts`. Never use `console.log`.

```ts
logger.info({ userId, action }, 'Operation completed');
logger.error({ err, context }, 'Operation failed');
```

### Error Handling

- Handle errors explicitly, never swallow them
- Log with context, return safe user-facing messages
- Never expose internal details or stack traces to client

## Issue Tracking (beads)

```bash
bd ready                    # Find unblocked work
bd update <id> --status=in_progress
bd close <id>               # Complete work
bd sync                     # Commit to git
```

Priority: P0=critical, P1=high, P2=medium, P3=low, P4=backlog

### Session Completion

**Work is NOT complete until `git push` succeeds.**

```bash
pnpm lint && pnpm ts:check  # Quality gates (if code changed)
bd sync                     # Commit issue changes
git add <files> && git commit -m "..."
git pull --rebase && git push
```

- Create issues for remaining work before ending
- Never stop before pushing — that leaves work stranded locally
