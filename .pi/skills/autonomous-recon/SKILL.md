---
name: autonomous-recon
description: Mandatory recon phase before any file edits. Workers gather at least 8 of 10 facts about the area they're touching before writing code. Prevents duplicate implementations, style mismatches, and wasted tokens. Load when any worker agent starts an implementation task.
---

# Autonomous Recon

Before writing or editing any code, gather at least 10 facts about the area you're touching.

## Mandatory checks (do ALL before first edit)

1. `grep -r "<keyword>" <dir>` for the feature area
2. `ls` the target directory to understand structure
3. Read the file you're about to edit (full file, not just the function)
4. Check for existing types/interfaces in `types/` or `schema/`
5. Check existing tests for this module
6. Check what's imported in the file — available utilities
7. `git log --oneline -5` for the files you'll touch
8. Read any TODOs or FIXMEs in the area
9. Check if a similar feature was implemented elsewhere you can reference
10. Verify clean build: run quick verification

## Rule

If you haven't completed at least **8 of these 10**, you are NOT ready to edit.
Read more. Then edit.

## Exceptions

- Emergency hotfixes where every minute counts
- Trivial one-line changes (typo fixes, comment updates)
- Tasks where the lead already provided full file contents and locations
