---
description: Restate requirements, identify risks, write a step-by-step plan. Wait for confirmation before touching any code.
---

Create an implementation plan for: $@

## Instructions

1. **Restate** the requirements in your own words — confirm you understand what's being asked
2. **Identify risks** — what could go wrong, what dependencies exist
3. **Write a phased plan** — break it into concrete steps, ordered by dependency

## Plan Format

```
# Plan: [short title]

## Requirements
[Restate in 2-3 sentences]

## Risks
- [risk]: [mitigation]

## Phases

### Phase 1: [name]
- [ ] specific action
- [ ] specific action

### Phase 2: [name]
- [ ] specific action

## Files to touch
- path/to/file.ts — why

## Validation
- how to verify it worked
```

## Critical Rules
- **DO NOT write any code** until the user confirms the plan
- If touching Convex schema: remind user about schema-first rule (edit `convex/schemas/*.ts` only, never `schema.ts` directly)
- If touching auth/RBAC: flag that all queries must use `requireRead`/`requireWrite`/`requireAdmin`
- If adding a new feature: note that tests must be written first (`/tdd`)

After presenting the plan, end with:
> **Waiting for confirmation.** Reply `yes` to proceed, or tell me what to change.
