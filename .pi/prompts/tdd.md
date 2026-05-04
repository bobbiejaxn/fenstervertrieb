---
description: Implement using test-driven development. Write failing tests first, then implement to pass. 80%+ coverage required.
---

Implement using TDD: $@

## TDD Cycle

**RED → GREEN → REFACTOR → REPEAT**

### Step 1: Scaffold Interface
Define types/interfaces first. No implementation yet.

### Step 2: Write Failing Tests (RED)
- Write tests that WILL FAIL because the code doesn't exist
- Run them and confirm they fail for the right reason
- Cover: happy path, edge cases, error conditions

### Step 3: Implement (GREEN)
- Write the minimal code to make tests pass
- No gold-plating — just enough to pass

### Step 4: Run & Verify
```bash
npm run test:once         # Convex/backend tests
# OR
cd frontend/ai-artifact-table && pnpm run test:run   # Frontend tests
```

### Step 5: Refactor
- Improve code while keeping tests green
- Run tests again to confirm

### Step 6: Coverage Check
Target: 80%+ lines and branches. 100% for financial logic, auth, schema validators.

## ivi-Specific Rules

**Convex functions:**
- Always include `args` and `returns` validators
- Use `QueryCtx`/`MutationCtx` — never `any`
- Test with `convex-test` library

**TypeScript:**
- Zero `any` types — use `unknown` + type guards
- Explicit return types on all non-component functions

**React components:**
- Test behavior, not implementation
- Use `data-testid` for selectors

**Before writing any test**, confirm the approach with the user if the feature touches:
- Auth / RBAC
- Schema (Convex)
- Financial calculations
