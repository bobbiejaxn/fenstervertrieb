---
name: code-reuse
description: Search before you write, extend before you create. Prevents duplicate implementations and ensures code reuse across the project. Load when writing any new function, component, or utility.
---

# Code Reuse Rules

Find before you write. Extend before you create.

## Rules

1. **Search first** — `grep -r` for the functionality you're about to implement. If it exists, extend it.
2. **Check standard locations** — `src/lib/`, `src/utils/`, `src/hooks/`, `src/components/` before writing to these directories.
3. **~80% match = extend** — If something exists that does ~80% of what you need, add a parameter or variant. Do NOT create a parallel implementation.
4. **New = justify** — If nothing exists and you must create something new, add a brief comment explaining why existing solutions don't work.
5. **Follow neighbors** — Place new code where the project expects it. Follow the patterns in nearby files.

## Anti-patterns

- Creating a utility function when one already exists in `src/lib/`
- Creating a new component when an existing one can be extended with a prop
- Creating a new API endpoint when an existing one can be parameterized
- Writing a custom hook when a project-standard one does the job
- Ignoring existing patterns because "my way is cleaner"
