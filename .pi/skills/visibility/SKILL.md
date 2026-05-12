---
name: visibility
description: Ensure every completed task includes a clear verification path for the user. Provides preview URLs, test commands, and change summaries. Load when finishing any non-trivial task.
---

# Visibility During Work

Show the user how to verify. Never complete a task without a verification path.

## Rules

### For UI/frontend work
After making visual changes, tell the user how to preview:
```
Check the result at localhost:3000/settings
```
The user should see work BEFORE it's finalized. Show early, iterate fast.

### For backend work
After completing backend changes, tell the user how to verify:
```
Run the test: npx convex test
Check the dashboard: https://dashboard.convex.dev/your-project
```

### For all work
When completing a non-trivial task:
1. **What was changed** — file paths
2. **Why** — 1-line rationale per file
3. **How to verify** — specific test, URL, or command

## Anti-patterns

- Completing a UI task without telling the user where to preview
- Completing a backend task without telling the user how to test it
- Saying "the changes are ready" without a concrete verification step
- Making the user figure out how to check your work
