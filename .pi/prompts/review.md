---
description: Review uncommitted changes for security, quality, and ivi coding standards
---

Review all uncommitted changes and produce a structured report.

## Step 1: Get changes
```bash
git diff --name-only HEAD
git diff HEAD
```

## Step 2: Check each changed file for

**CRITICAL — Block commit if found:**
- Hardcoded API keys, tokens, secrets
- `any` type usage (zero tolerance in ivi)
- Direct edits to `convex/schema.ts` or `convex/extraction.ts` (use `convex/schemas/*.ts` instead)
- Missing `requireRead`/`requireWrite`/`requireAdmin` in Convex queries/mutations
- `// eslint-disable` comments
- SQL injection / XSS vulnerabilities

**HIGH — Must fix:**
- Missing error handling (`try/catch`)
- Functions over 50 lines
- Files over 800 lines
- Mutations (direct object mutation instead of spread)
- `console.log` statements left in source
- Inline styles (`style={{...}}`)
- Missing `returns` validator on Convex functions

**MEDIUM — Should fix:**
- Missing tests for new code
- TODO/FIXME comments without issue refs
- Missing explicit return types on non-component functions
- Convex queries using `.filter()` instead of indexes

## Step 3: Report

```
REVIEW: [PASS / NEEDS WORK / BLOCKED]

Critical: [count or NONE]
High:     [count or NONE]
Medium:   [count or NONE]

[list each issue with file:line and suggested fix]

Ready to commit: [YES / NO]
```

Never approve code with CRITICAL issues. For BLOCKED, state exactly what must be fixed first.
