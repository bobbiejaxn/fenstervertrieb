---
description: Fix a bug from a symptom description — no GitHub issue required. Triage → investigate → fix → verify. For quick ad-hoc fixes.
---

Fix this bug: $@

## Your role

You are the orchestrator for a quick bug fix. No GitHub issue needed — the user describes the symptom and you fix it.

Use the **subagent tool** to delegate. Always use `agentScope: "project"` and `confirmProjectAgents: false`.

---

## Phase 0 — Load learnings

```json
{
  "agent": "learning-agent",
  "task": "Mode: session-start. Retrieve pending learnings and produce 'Inject into agent context' block.",
  "agentScope": "project"
}
```

Save as `LEARNINGS_CONTEXT`.

---

## Phase 1 — Fixer agent

Delegate the bug to the fixer agent with the user's exact symptom:

```json
{
  "agent": "fixer",
  "task": "Fix this bug.\n\nSymptom: [exact user description]\n[Error message if provided]\n[URL/page if provided]\n\nLearnings to apply:\n[LEARNINGS_CONTEXT]",
  "agentScope": "project"
}
```

### If fixer returns "Fixed":
→ Proceed to Phase 2 (verify)

### If fixer returns "Needs Decision" (1-3-1):
→ Present the 1-3-1 to the user. Wait for confirmation. Then re-invoke fixer with the chosen option:

```json
{
  "agent": "fixer",
  "task": "Implement Option [N] as confirmed by user.\n\n[paste the chosen option details]\n\nOriginal symptom: [symptom]\nLearnings:\n[LEARNINGS_CONTEXT]",
  "agentScope": "project"
}
```

---

## Phase 2 — Verify

Run static checks directly — scope to what the fixer changed:

**Frontend-only fix:**
```bash
cd frontend/ai-artifact-table && npx tsc --noEmit
```

**Backend fix:**
```bash
npx convex codegen && npx tsc --noEmit
```

**Any fix:**
```bash
./scripts/vibe-test.sh quick
```

If checks fail, delegate to fixer again with the error output. Max 2 attempts.

---

## Phase 3 — Commit

```bash
git add [specific files only]
git commit -m "fix: [short description of what was fixed]"
```

No PR required for ad-hoc fixes (they go directly on the current branch). If the user wants a PR, offer to create one.

---

## Phase 4 — Learning agent

```json
{
  "agent": "learning-agent",
  "task": "Mode: session-end. Log this fix session.\n\nBug: [symptom]\nRoot cause: [from fixer output]\nCategory: [from fixer output]\nFiles changed: [list]\nVerification: [pass/fail]\nNew patterns: [any]",
  "agentScope": "project"
}
```

---

## Phase 5 — Report

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FIXED: [Short description]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Symptom: [what user reported]
Root cause: [one sentence]

Files changed
─────────────
[file] — [what changed]

Verified
────────
✓ tsc: clean
✓ lint: clean
✓ tests: passing

Commit: [hash — message]

Ideas surfaced
──────────────
[List ideas from fixer, or "None"]
→ Want me to capture these to GitHub via /idea, or work on any now?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
