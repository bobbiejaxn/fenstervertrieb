---
description: Full feature workflow: plan → TDD implement → review. Orchestrates the full cycle.
---

Build this feature end-to-end: $@

## Workflow

This runs the full feature cycle in sequence. Do not skip steps.

### Step 1 — Plan
Follow the `/plan` protocol:
- Restate requirements
- Identify risks (flag schema changes, auth, financial logic)
- Write phased plan with files to touch

**STOP. Present the plan. Wait for user confirmation before continuing.**

### Step 2 — TDD Implement
After confirmation:
- Scaffold interfaces/types first
- Write failing tests
- Run tests to confirm RED state
- Implement minimally to go GREEN
- Refactor
- Verify 80%+ coverage

For Convex schema changes:
- Edit `convex/schemas/*.ts` ONLY
- Run `npx convex codegen` after changes
- Never touch `schema.ts` or `extraction.ts` directly

For RBAC:
- All queries must use `requireRead`/`requireWrite`/`requireAdmin` from `convex/lib/teamAuth.ts`
- Always scope by `teamId` using `by_team` index

### Step 3 — Verify
Run:
```bash
npx convex codegen
npx tsc --noEmit
npm run lint
./scripts/vibe-test.sh quick
```

### Step 4 — Review
Apply `/review` checklist to all changed files. Report before asking user to commit.

## Output
End with a structured summary:
- What was built
- Files changed (with line counts)
- Test results
- Any open items or follow-up tasks
