---
name: ralph-harness-gate
description: Verification gate for Ralph loops. Ensures every Ralph COMPLETE declaration is backed by actual verification evidence — not just "it compiles." Load when running Ralph loops that produce UI, code, or any user-facing output. Prevents premature completion declarations.
---

# Ralph Harness Gate

## The Problem This Solves

Agents declare `<promise>COMPLETE</promise>` after writing code that compiles, without ever verifying it actually works. "It compiles" ≠ "it works." This skill adds a mandatory verification step before Ralph completion.

## Rules

### Before EVERY `<promise>COMPLETE</promise>`, you MUST:

1. **Run the verify commands** from `.pi/config.sh` (`VERIFY_COMMANDS` array)
2. **For UI changes:** Open the page in a browser OR take a screenshot OR check the dev server output for render errors
3. **For API changes:** Make at least one real request and verify the response
4. **For test changes:** Run the tests and confirm they pass
5. **Document verification evidence** in the Ralph task file under `## Verification`

### Verification Evidence Format

Add this to your `.ralph/<task>.md` before completing:

```markdown
## Verification

### Checks Run
- [x] `npx tsc --noEmit` — passed
- [x] `npm run lint` — passed  
- [x] `npm run test` — 12/12 passed
- [x] Dev server started, loaded /dashboard — renders correctly
- [x] Screenshot taken: .pi/sessions/current/artifacts/dashboard-final.png

### What I Verified Visually
- Home page: 6 columns visible, data loads
- Detail page: all sections render, no 500 errors
- Mobile: responsive layout works at 375px

### What I Did NOT Verify
- (list anything you couldn't check and why)
```

### The Checklist Before COMPLETE

```
□ All checklist items marked [x]
□ VERIFY_COMMANDS pass (tsc, lint, etc.)
□ UI changes: visually verified (screenshot or browser)
□ API changes: tested with real request
□ Tests: run and passing
□ Verification evidence written to task file
□ No known broken paths left undocumented
```

**If any box is unchecked, do NOT declare COMPLETE.** Either fix it or document it as a known issue in the task file.

### What Counts as Visual Verification

| Method | Acceptable? |
|--------|-------------|
| `npm run build` passes | ❌ No — build passing doesn't mean it renders |
| `curl localhost:3000` returns 200 | ⚠️ Partial — confirms server responds, not that UI renders |
| Dev server log shows no errors | ⚠️ Partial — some render errors only show in browser |
| Screenshot of the running page | ✅ Yes |
| Playwright/E2E test passes | ✅ Yes |
| Drive screenshot of the terminal UI | ✅ Yes |
| Manual browser check described in detail | ✅ Yes |

### Integration with Trace Recorder

When running inside a traced session (`TRACE_RUN_ID` is set), your verification evidence is automatically captured in the traces. The harness evolver uses this to detect patterns like "agent never runs visual verification" and proposes prompt improvements.

### After Ralph COMPLETE

The trace recorder captures whether verification happened. If you declare COMPLETE without verification evidence in the task file, the evolver will eventually:
1. Detect the pattern in traces
2. Propose adding stricter verification to the relevant agent prompt
3. The pattern won't repeat

But prevention is better than correction. **Verify first. Declare done second.**
