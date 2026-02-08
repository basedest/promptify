# Feature-Sliced Design (FSD)

> **Purpose**: This document defines strict architectural and coding rules for this repository.
> Any developer or AI coding agent must follow these rules when modifying or adding code.
>
> The project is structured according to **Feature-Sliced Design (FSD) v2.1** and adapted for **Next.js App Router**.

---

## 1. High-level Architecture

### 1.1 Core Principles

- The codebase follows **Feature-Sliced Design (FSD) v2.1**
- Architecture is **layered and directional**
- Imports are allowed **only from higher layers to lower layers**
- Routing is fully separated from business logic
- Each folder has a **single, well-defined responsibility**
- There are **no generic dumping folders** (e.g. `utils`, `components`)

---

## 2. Folder Structure (Canonical)

```
root/
  app/                 # Next.js App Router (routing glue ONLY)

src/
  app/                 # FSD app layer (providers, global config)
  pages/               # Page-level orchestration
  processes/           # Cross-page flows (optional, rare)
  widgets/             # Large reusable UI blocks
  features/            # User actions (verbs)
  entities/            # Domain models (nouns)
  shared/              # Reusable, context-agnostic code
```

This structure is **mandatory**.
Creating new top-level folders requires architectural discussion.

---

## 3. Layer Responsibilities

### 3.1 `root/app` (Next.js routing layer)

**Purpose**: Framework integration and routing only.

Allowed:

- `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`
- Route params and search params passing
- Minimal JSX composition

Forbidden:

- Business logic
- Data fetching logic
- State management
- Feature or entity imports

**Rule**:

```tsx
// ✅ Correct
import { HomePage } from "src/pages/home";

export default function Page(props) {
  return <HomePage {...props} />;
}
```

---

### 3.2 `src/app` (FSD app layer)

**Purpose**: Application initialization and global setup.

Contains:

- Global providers (tRPC, auth, theme, i18n)
- Global styles
- App-level configuration

Rules:

- No business logic
- No domain-specific code
- Exports a single provider composition (e.g. `AppProviders`)

---

### 3.3 `pages`

**Purpose**: Page-level orchestration.

Pages:

- Fetch and prepare data
- Assemble widgets
- Use features
- Handle route params and search params

Rules:

- Pages are **not reusable**
- Pages may be server or client components
- Pages may call server actions or API methods
- Pages must remain reasonably small and readable

---

### 3.4 `widgets`

**Purpose**: Large reusable UI composition blocks.

Examples:

- Header / Footer
- Navigation bars
- Complex lists or editors

Rules:

- Widgets may combine entities and features
- Widgets must not contain business rules
- Widgets are reusable across multiple Pages

---

### 3.5 `features`

**Purpose**: User actions and interactions (verbs).

Examples:

- `auth/login`
- `user/update-profile`
- `llm/generate-text`

Typical structure:

```
feature-name/
  ui/
  model/
  api/      # optional
  lib/      # optional
```

Rules:

- Feature = **one user intent**
- Features may depend on entities and shared
- Features must NOT depend on pages or widgets
- Features should be easily removable without breaking the app

---

### 3.6 `entities`

**Purpose**: Domain representation (nouns).

Typical structure:

```
entity-name/
  model/   # types, schemas, state
  api/     # repositories, services, routers
  ui/      # entity-specific UI
```

Rules:

- Entities contain **domain knowledge only**
- Entities must not depend on features
- Cross-entity imports are discouraged
- Entity UI is low-level and non-compositional

---

### 3.7 `shared`

**Purpose**: Context-agnostic reusable code.

Allowed subfolders:

```
shared/
  ui/       # primitive UI components
  lib/      # helpers, utilities
  api/      # generic API clients
  config/   # env, constants
  types/    # shared types
```

Rules:

- Shared must NOT import from any other layer
- No domain or business logic
- Code here must be reusable in any project

---

## 4. Import Rules (Strict)

Allowed dependency direction:

```
app
 ↓
pages
 ↓
widgets
 ↓
features
 ↓
entities
 ↓
shared
```

Forbidden:

- Importing upward
- Importing between slices on the same layer
- Skipping layers for convenience

---

## 5. Coding Rules

### 5.1 File Size & Complexity

- Pages: ~150 LOC max
- `root/app` files: ~30 LOC max
- Each component or module should have a single responsibility

---

### 5.2 Naming Conventions

- Folders: `kebab-case`
- React components: `PascalCase`
- Hooks: `useXxx`
- Feature and entity names must use domain language

---

## 6. What NOT to Do

❌ Add logic to `root/app`
❌ Create generic `components/` or `utils/` folders
❌ Put domain logic in `shared`
❌ Break layer boundaries for speed
❌ Introduce hidden cross-layer dependencies

---

## 7. Decision Guide

When unsure where code belongs:

1. Ask: **Is this a noun (entity) or a verb (feature)?**
2. Ask: **Is this reusable or page-specific?**
3. Prefer placing code **lower in the hierarchy**
4. If still unclear — stop and request architectural review

---

## 8. Enforcement

- Architectural violations must be fixed, not justified
- All new code must comply with this document
- This document is the **single source of truth** for project architecture

---

✅ Following these rules ensures a scalable, predictable, and AI-friendly codebase.
