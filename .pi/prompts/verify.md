---
description: Run full verification: build, types, lint, tests. Accepts: quick, full, pre-commit
---

Run verification checks. Mode: ${1:-full}

## Checks

### quick
```bash
npx convex codegen
npx tsc --noEmit
npm run lint
```

### full (default)
```bash
npx convex codegen
npx tsc --noEmit
npm run lint
npm run test:once
./scripts/vibe-test.sh quick
```

### pre-commit
```bash
npx convex codegen
npx tsc --noEmit
npm run lint
./scripts/vibe-test.sh quick
git diff --name-only HEAD
```

### pre-deploy
```bash
npx convex codegen
npx tsc --noEmit
npm run lint
./scripts/vibe-test.sh full
./scripts/health-check.sh
```

## Report format

```
VERIFICATION: [PASS / FAIL]

Convex codegen:  [OK / FAIL]
TypeScript:      [OK / X errors]
Lint:            [OK / X issues]
Tests:           [X/Y passed]
Coverage:        [X%]

Ready: [YES / NO — reason if no]
```

If any check fails, list every error with file:line and the exact fix needed.
