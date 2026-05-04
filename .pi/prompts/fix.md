---
description: Fix a GitHub issue end-to-end using specialist subagents. Parallel where possible, context-filtered, learning-aware. Read issue → architect → implement → review → verify → PR closes issue.
---

Fix this: $@

## Your role

You are the orchestrator for a bug fix. Use the **subagent tool** to delegate. Always use `agentScope: "project"` and `confirmProjectAgents: false` on every subagent call. These are trusted project agents — no confirmation prompts.

Read the repo from config:
```bash
source .pi/config.sh
echo "$REPO"
```

---

## Phase 0 — Load learnings + read issue (PARALLEL)

```json
{
  "tasks": [
    {
      "agent": "learning-agent",
      "task": "Mode: session-start. Retrieve pending learnings and produce 'Inject into agent context' block."
    },
    {
      "agent": "architect",
      "task": "Read this GitHub issue and extract: location, symptom, context, affected users, E2E test, fix instructions.\n\nRun: source .pi/config.sh && gh issue view [ISSUE_NUMBER] --repo \"$REPO\" --json title,body,labels,comments\n\nReturn the extracted fields as structured output."
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
      "task": "Review the diff against project rules. Return PASS or FAIL.\n\nFeature slug: [slug]\nRun: ./scripts/build-context.sh reviewer \"[slug]\""
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

After reviewer passes, run adversarial pre-gate check:

```json
{
  "agent": "gate-skeptic",
  "task": "Run adversarial readiness check on this fix before verification.\n\nFeature slug: [slug]\nFix: #[ISSUE_NUMBER]\n\nDefault verdict: NOT READY. Check:\n1. The specific root cause from the issue is actually fixed\n2. No new regressions introduced\n3. Edge cases around the fix are handled\n4. No happy-path-only fix\n5. Git tree clean\n\nRun: ./scripts/build-context.sh reviewer \"[slug]\"",
  "agentScope": "project"
}
```

If NOT READY: fix specific blockers via implementer. Max 2 rounds.

---

## Phase 4 — Verification gates

Run verification commands from config:

```bash
source .pi/config.sh
for cmd in "${VERIFY_COMMANDS[@]}"; do eval "$cmd"; done
./scripts/capture-dev-logs.sh 20
eval "$TEST_COMMAND \"[test name from issue]\""
eval "$TEST_COMMAND \"$P0_TESTS\""
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

Commit first:

```bash
source .pi/config.sh
git add [specific files only]
git commit -m "fix: [description]

fixes #[ISSUE_NUMBER]"
```

Then in parallel:

```json
{
  "tasks": [
    {
      "agent": "architect",
      "task": "Write PR body to /tmp/fix-pr-[ISSUE_NUMBER].md with: fixes #[ISSUE_NUMBER], root cause, what changed, verified checkboxes.\nThen run: source .pi/config.sh && gh pr create --repo \"$REPO\" --title 'fix: [Issue Title]' --body-file /tmp/fix-pr-[ISSUE_NUMBER].md --base main"
    },
    {
      "agent": "learning-agent",
      "task": "Mode: session-end. Log this fix session and auto-promote patterns at 3+ recurrences.\n\nIssue: #[ISSUE_NUMBER]\nRoot cause: [one sentence]\nGate fixes: [list or 'none']\nOut-of-scope issues: [list or 'none']\nLearnings applied: [list]\nNew patterns: [any new]"
    }
  ],
  "agentScope": "project"
}
```

---

## Phase 6 — Report

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FIXED: #[N] [Issue Title]
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
✓ [E2E test]: passing
✓ P0 regressions: clean

PR
──
[URL — merging closes #N]

Learnings
─────────
Applied: [which helped]
New: [what was logged]
Promoted: [if any]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
