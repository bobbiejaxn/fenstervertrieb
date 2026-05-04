---
description: Fix a GitHub issue end-to-end using specialist subagents. Requires a GH issue number. Parallel where possible, context-filtered, learning-aware. Read issue → architect → implement → review → verify → PR closes issue.
---

Fix GitHub issue: $@

## Your role

You are the orchestrator for a bug fix. Use the **subagent tool** to delegate. Always use `agentScope: "project"`.

---

## Phase 0 — Load learnings + read issue (PARALLEL)

These don't depend on each other. Run simultaneously:

```json
{
  "tasks": [
    {
      "agent": "learning-agent",
      "task": "Mode: session-start. Retrieve pending learnings and produce 'Inject into agent context' block."
    },
    {
      "agent": "worker",
      "task": "Read this GitHub issue and extract: location, symptom, context, affected users, Bowser test, fix instructions.\n\nRun: gh issue view $1 --repo $REPO --json title,body,labels,comments\n\nReturn the extracted fields as structured output."
    }
  ],
  "agentScope": "project"
}
```

Save learnings as `LEARNINGS_CONTEXT`. Derive a feature slug from the issue title.

---

## Phase 1 — Architect (GLM-5.1)

```json
{
  "agent": "architect",
  "task": "Read this issue and produce a minimal fix plan.\n\nIssue:\n[paste extracted issue fields]\n\nGoal: Fix only the root cause. Do not refactor.\nFeature slug: [slug]\n\nRun: ./scripts/build-context.sh architect \"[slug]\"\n\nLearnings to apply:\n[LEARNINGS_CONTEXT]",
  "agentScope": "project"
}
```

---

## Phase 2 — Implementer (GLM-5)

```json
{
  "agent": "implementer",
  "task": "Execute this fix plan exactly.\n\nPlan:\n[paste architect plan]\nFeature slug: [slug]\n\nRun: ./scripts/build-context.sh implementer \"[slug]\"\n\nLearnings to apply:\n[LEARNINGS_CONTEXT]",
  "agentScope": "project"
}
```

If out-of-scope findings: delegate to `issue-creator`.

---

## Phase 3 — Review → fix cycle (CHAIN)

```json
{
  "chain": [
    {
      "agent": "reviewer",
      "task": "Review the diff against ivi rules. Return PASS or FAIL.\n\nFeature slug: [slug]\nRun: ./scripts/build-context.sh reviewer \"[slug]\""
    },
    {
      "agent": "implementer",
      "task": "If the previous reviewer output says FAIL, fix the specific findings. If PASS, output 'No fixes needed.'\n\nReviewer output:\n{previous}"
    }
  ],
  "agentScope": "project"
}
```

If still FAIL after chain, run one more round. Max 3 total.

---

## Phase 4 — Static checks + dev log + Bowser

Run verification commands directly (these are deterministic gates, not agent tasks):

```bash
npx convex codegen && npx tsc --noEmit && npm run lint && ./scripts/vibe-test.sh quick
./scripts/capture-dev-logs.sh 20
cd tests/bowser && node run-tests-interactive.js "[test name from issue]"
cd tests/bowser && node run-tests-interactive.js "Login,Fund,Company,Document,Duplicate,Validation,Workflow"
```

If any fail: delegate to `debug-agent`. Two-attempt rule.

```json
{
  "agent": "debug-agent",
  "task": "Fix this gate failure.\n\nGate: [name]\nFailure output:\n[paste exact output]\nFeature slug: [slug]\n\nRun: ./scripts/build-context.sh debug-agent \"[slug]\"",
  "agentScope": "project"
}
```

---

## Phase 5 — Commit, PR, learning (PARALLEL where possible)

Commit and open PR first:

```bash
git add [specific files only]
git commit -m "fix: [description]

fixes #$1"
```

Then in parallel — open PR and log learnings:

```json
{
  "tasks": [
    {
      "agent": "worker",
      "task": "Write PR body to /tmp/fix-pr-$1.md with: fixes #$1, root cause, what changed, verified checkboxes. Then run:\ngh pr create --repo $REPO --title 'fix: [Issue Title]' --body-file /tmp/fix-pr-$1.md --base main"
    },
    {
      "agent": "learning-agent",
      "task": "Mode: session-end. Log this fix session and auto-promote patterns at 3+ recurrences.\n\nIssue: #$1\nRoot cause: [one sentence]\nGate fixes: [list or 'none']\nOut-of-scope issues: [list or 'none']\nLearnings applied: [list]\nNew patterns: [any new]"
    }
  ],
  "agentScope": "project"
}
```

---

## Phase 6 — Report

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FIXED: #$1 [Issue Title]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Root cause
──────────
[One sentence]

What changed
────────────
[file] — [what changed]

Verified
────────
✓ Dev logs: clean
✓ [Bowser test]: passing
✓ P0 regressions: clean

PR
──
[URL — merging closes #$1]

Learnings
─────────
Applied: [which helped]
New: [what was logged]
Promoted: [if any]

Ideas surfaced
──────────────
[List ideas from architect/implementer/reviewer, or "None"]
→ Want me to capture these to GitHub via /idea, or work on any now?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
