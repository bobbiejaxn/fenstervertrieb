---
name: mandatory-verify
description: Enforce verification after every batch of edits. Runs vibe-verify.sh to catch TypeScript and lint errors before declaring work done. Load after completing any implementation task.
---

# Mandatory Verification

"Done" without verification is not done.

## Rules

After completing ALL file edits in a task:

1. **Run quick verification** — `./scripts/vibe-verify.sh --quick`
2. **If it fails** — fix the errors, re-run
3. **If it passes** — report completion with verification output
4. **Never skip** — even for "small" changes, even for "obvious" fixes

## Verification command

```bash
./scripts/vibe-verify.sh --quick    # tsc + lint combined
```

If `vibe-verify.sh` doesn't exist, fall back to:
```bash
npx tsc --noEmit 2>&1 | tail -5
```

## Completion format

When reporting done, include:
```
## Completed
What was done.

## Verification
✅ vibe-verify.sh --quick passed (or fix summary)

## Files Changed
- `path/to/file.ts` — what changed
```

## Anti-patterns

- Declaring "done" without running verification
- Saying "this should work" without evidence
- Skipping verification because "it's just a small change"
- Running only tsc OR only lint — run the combined check
