---
name: code-guardian
description: PROACTIVE code quality enforcement for ivi. Prevents any, unsafe types, inline styles, eslint-disable, and missing Convex validators before they enter the codebase. Load when writing or reviewing TypeScript, React, or Convex code.
---

# Code Guardian

> Rules consolidated. See `.pi/skills/ivi-rules/SKILL.md` and `AGENTS.md`.

## Quick reference

- Zero `any` — use `Doc<"table">`, `QueryCtx`, `MutationCtx`
- No direct mutations — use spread
- No inline styles — Tailwind + `cn()`
- No `eslint-disable` — fix the root cause
- All Convex functions: `args` + `returns` validators required
- Schema changes: `convex/schemas/*.ts` only

Full rules: `AGENTS.md` → Code Guardian section.

## Learned: auth.provider-tree-consistency
Every branch of the auth provider tree in `convex-providers.tsx` (authenticated, loading, unauthenticated, dev) **must wrap children with identical context providers**. Use safe defaults (e.g. `CurrencyProvider defaultCurrency="USD"`) in non-authenticated branches. When adding a provider to one branch, grep for all branches and add it everywhere. This file is a recurring source of runtime crashes and UX regressions.
*Promoted from 5 occurrences on 2026-03-06. Source entries: LRN-20260306-017, LRN-20260306-018, LRN-20260306-019, LRN-20260306-020, LRN-20260306-021, LRN-20260306-022*
