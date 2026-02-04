# AGENTS.md

This document describes the **baseline context and constraints** for AI coding agents working in this repository.
It is intentionally minimal and will evolve as project requirements become clearer.

---

## Purpose

AGENTS.md exists to:

- Give AI agents quick orientation in the codebase
- Define the tools and dependencies expected to be used
- Provide a high-level architectural overview
- Point to deeper documentation when needed

Agents should **follow this document first**, then defer to more specific docs if present.

---

## Tech Stack & Tooling

> This section lists the currently assumed tools and dependencies. It may be incomplete and is expected to change.

### Runtime & Language

- **Node.js** (LTS)
- **TypeScript** (strict mode preferred)

### Frameworks

- **Next.js** (App Router)
- **React**

### Backend / Infrastructure

- Server-side logic implemented within Next.js (API routes / server actions)
- Database, auth, storage, and other infra details may evolve and should be discovered from code when unclear

### Tooling

- Package manager: **Yarn**
- Linting: **ESLint**
- Formatting: **Prettier**
- Git hooks / CI: inferred from repository config

### Testing

- Unit tests preferred as first layer
- Test framework(s) should be inferred from `package.json` and existing tests

---

## Architecture Overview

The project follows **Feature-Sliced Design (FSD)** principles.

High-level goals of the architecture:

- Clear separation of concerns
- Predictable dependency direction
- Scalability for growing product complexity

### Key Notes

- Features are isolated and self-contained
- Shared logic lives in `shared/`
- Business logic should not leak into UI layers

For detailed rules, layers, and dependency constraints, see:

👉 **`docs/fsd.md`**

Agents must respect the architectural rules described there.

---

## Working Guidelines for Agents

- Prefer **small, incremental changes**
- Do not introduce new dependencies without clear justification
- Follow existing patterns over inventing new ones
- When uncertain, **inspect the codebase** rather than guessing

If instructions conflict:

1. This document
2. More specific docs (e.g. `docs/fsd.md`)
3. Existing code patterns

---

## Status

🚧 **Draft** — this document is expected to be edited and expanded as requirements are clarified.

## Dependencies & Tooling

- **Package manager**: `pnpm` (do not use yarn or npm)
- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **UI**: shadcn/ui (Radix + Tailwind)
- **State / Data**: tRPC, React Query
- **ORM**: Prisma
- **Auth**: Better Auth
- **i18n**: next-intl
- **LLM provider**: OpenRouter

## Architecture

The project follows **Feature-Sliced Design (FSD)** adapted for Next.js App Router.

- `app/` — routing and layouts only (no business logic)
- `src/views` — page orchestration
- `src/widgets` — large UI blocks
- `src/features` — user actions and flows
- `src/entities` — domain models and related UI
- `src/shared` — shared utilities, UI primitives, config

See **`docs/fsd.md`** for the authoritative architecture rules and examples.

## Agent Guidelines

### General rules

- Do not invent requirements — follow the task description strictly.
- Prefer existing utilities and patterns over introducing new ones.
- Keep changes minimal and localized.
- When unsure, search the codebase first.

### Working with Prisma

- Prisma schema lives in `prisma/schema.prisma`.
- When adding or modifying models:
    1. Update `schema.prisma` only.
    2. Run `pnpm prisma generate` after schema changes.
    3. If migrations are required, use `pnpm prisma migrate dev`.

- Never edit generated Prisma client files manually.
- Access Prisma through the existing server-side utilities (do not create new Prisma clients ad-hoc).
- Follow existing naming conventions for models, fields, and relations.

### Adding shadcn/ui components

- **Do NOT write UI components manually if they exist in shadcn/ui.**
- Always add components using the shadcn/ui CLI:

```bash
pnpm dlx shadcn@latest add <component-name>
```

- This ensures consistent styling, correct Radix usage, and theme compatibility.
- After adding a component:
    - Import it from `src/shared/ui` (or the project’s designated UI path).
    - Adjust variants or styles locally if needed — do not fork the component unless explicitly required.

- If a required component does not exist in shadcn/ui, document the reason before implementing a custom one.

## Logging & Error Handling

### Structured Logging (Pino)

The project uses **Pino** for structured, JSON-based logging.

Rules for agents:

- Use the shared logger instance from `shared/lib/logger` (or equivalent). Do **not** create ad-hoc `console.log` or new logger instances.
- Logs must be **structured**, not free-form strings.
- Prefer semantic fields over string interpolation.

Examples:

```ts
logger.info({ userId, articleId }, 'Article created');
logger.warn({ err, userId }, 'Failed to update profile');
logger.error({ err, route }, 'Unhandled server error');
```

Guidelines:

- `info`: normal application flow (startup, successful operations)
- `warn`: expected but undesirable situations (validation issues, retries)
- `error`: failures that require investigation
- Never log secrets, tokens, passwords, or raw credentials

Client-side logging should be minimal and only for user-impacting events. Server-side logging is preferred.

---

### Error Handling

General rules:

- Errors must be **handled explicitly**, not swallowed
- Throw domain-relevant errors instead of generic ones where possible
- Do not expose internal error details to the client

Server-side:

- Catch errors at boundaries (API routes, tRPC procedures, server actions)
- Log the error with context using Pino
- Return a safe, user-facing error message

```ts
try {
    // business logic
} catch (err) {
    logger.error({ err, userId }, 'Failed to process request');
    throw new Error('Internal server error');
}
```

Client-side:

- Handle known error states explicitly (validation, auth, not-found)
- Show user-friendly messages
- Do not rely on string matching of error messages

Never:

- Use `console.log`, `console.error` in production code
- Leak stack traces or internal messages to the UI
- Catch errors without logging or rethrowing

---

This document is a living draft and will be extended as project requirements become clearer.
