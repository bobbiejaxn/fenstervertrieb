---
description: Streamlined delivery workflow. No PM, no USVA, no reviewer, no test-writer. Architect plans from your description, implementer builds, run-ship.sh gates verify. For medium-complexity features where you already know what you want.
---

Ship (fast): $@

## Your role

You are the orchestrator. You delegate to specialist agents using the **subagent tool**. Always use `agentScope: "project"` and `confirmProjectAgents: false`.

**"Done" is defined by `run-ship.sh` — not by you.**

---

## Phase 0 — Load learnings

```json
{
  "agent": "learning-agent",
  "task": "Mode: session-start. Retrieve pending learnings, patterns approaching promotion, and produce the 'Inject into agent context' block.",
  "agentScope": "project"
}
```

Save as `LEARNINGS_CONTEXT`.

---

## Phase 1 — Architect (direct from description)

No PM, no USVA. The user's description IS the spec. Feed it directly to the architect:

```json
{
  "agent": "architect",
  "task": "Produce an implementation plan from this feature description. No USVA spec exists — work from the description directly.\n\nFeature description:\n[what the user said]\n\nFeature slug: [slug]\n\nRun: ./scripts/build-context.sh architect \"[slug]\"\n\nLearnings to apply:\n[LEARNINGS_CONTEXT]",
  "agentScope": "project"
}
```

Skim the plan for obvious issues. If it looks right, proceed immediately — do not ask the user to confirm.

---

## Phase 2 — Implementer

```json
{
  "agent": "implementer",
  "task": "Execute this implementation plan exactly.\n\nPlan:\n[paste full architect plan]\n\nFeature slug: [slug]\n\nRun: ./scripts/build-context.sh implementer \"[slug]\"\n\nLearnings to apply:\n[LEARNINGS_CONTEXT]",
  "agentScope": "project"
}
```

If the implementer subagent fails (no output / error), implement the plan yourself directly — read the files, write the code, run the checks.

After implementation:
- If implementer reports "Out-of-scope issues found" → delegate each to `issue-creator` in parallel
- Commit the work:

```bash
git add [specific files]
git commit -m "feat: [description]"
```

---

## Phase 3 — Run the gates

```bash
./scripts/run-ship.sh "[Feature Name]"
```

**The gates ARE the review.** No separate reviewer agent — tsc, lint, unit tests, dev logs, and Bowser regressions catch real issues.

**If a gate fails:** delegate to debug-agent:

```json
{
  "agent": "debug-agent",
  "task": "Fix this gate failure.\n\nGate: [N] — [name]\nFailure output:\n[paste exact output]\nFeature: [feature]\nFeature slug: [slug]\n\nRun: ./scripts/build-context.sh debug-agent \"[slug]\"",
  "agentScope": "project"
}
```

Max two debug-agent attempts per gate. After two: create issue, report partial.

---

## Phase 4 — Learning agent + report

```json
{
  "agent": "learning-agent",
  "task": "Mode: session-end. Log this session and auto-promote patterns at 3+ recurrences.\n\nFeature: [feature]\nGate fixes required: [list or 'none']\nOut-of-scope issues: [list or 'none']\nLearnings applied: [list]\nNew patterns: [from debug-agent if any]",
  "agentScope": "project"
}
```

### Report

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SHIPPED (fast): [Feature Name]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

What changed
────────────
[file] — [what]

Gates
─────
✓ codegen + tsc + lint + unit tests
✓ Dev logs — clean
✓ Bowser regressions — clean

PR
──
[URL]

Issues logged
─────────────
[#N — title, or "None"]

Ideas surfaced
──────────────
[List ideas from architect/implementer, or "None"]
→ Want me to capture these to GitHub via /idea, or work on any now?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
