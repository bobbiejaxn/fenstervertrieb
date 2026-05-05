---
description: Full delivery workflow. Specialist agents in parallel where possible. Context-filtered, learning-aware. You confirm the spec — everything else is delegated. Output is a verified PR.
---

Ship this feature: $@

## Your role

You are the orchestrator. You delegate to specialist agents using the **subagent tool**. You maximize parallelism — when two agents don't depend on each other, run them simultaneously.

Always use `agentScope: "project"` so subagents from `.pi/agents/` are discovered.

**"Done" is defined by `run-ship.sh` — not by you.**

---

## Phase 0 — Load learnings

Use the subagent tool to retrieve learnings:

```json
{
  "agent": "learning-agent",
  "task": "Mode: session-start. Retrieve pending learnings, patterns approaching promotion, and produce the 'Inject into agent context' block.",
  "agentScope": "project"
}
```

Save the "Inject into agent context" output as `LEARNINGS_CONTEXT`. You will include it in every specialist task below.

---

## Phase 1 — Product Manager (GLM-5.1)

```json
{
  "agent": "product-manager",
  "task": "Interview the user about this feature and produce a confirmed USVA spec.\n\nFeature description: [what the user said]",
  "agentScope": "project"
}
```

**Wait for user confirmation of the spec before proceeding.**

---

## Phase 2 — Architect (GLM-5.1)

```json
{
  "agent": "architect",
  "task": "Read the confirmed USVA spec and produce a complete implementation plan.\n\nUSVA spec path: specs/usva/[feature].usva.md\nFeature slug: [slug]\n\nRun: ./scripts/build-context.sh architect \"[slug]\" \"specs/usva/[feature].usva.md\"\n\nLearnings to apply:\n[LEARNINGS_CONTEXT]",
  "agentScope": "project"
}
```

Review the plan. If wrong, send back. If right, proceed.

---

## Phase 2.5 — Team Detection (unless disabled)

Source `.pi/config.sh` and check `TEAMS_ENABLED`:

If `TEAMS_ENABLED == "true"` (default):
  Count distinct domains touched by the implementation plan:
  - Files in `$FRONTEND_DIR` → "frontend" domain
  - Files in `$BACKEND_DIR` or `$SCHEMA_DIR` → "backend" domain
  - Always → "validation" domain

  If `domains_touched >= $TEAMS_AUTO_ACTIVATE_DOMAINS` (default 3):
    **USE TEAM MODE** — Phases 3+4 and 5 delegate to team leads (see below)

  Else: proceed with flat agent flow (but still team-aware CEO)

If `TEAMS_ENABLED == "false"`: skip to flat flow (legacy mode)

---

## Phase 3+4 — Implementation (PARALLEL)

These don't depend on each other. Run them at the same time.

**Load design-principles skill if the plan touches UI/frontend files.**

**Load the relevant Google style guide skill based on file extensions in the plan:**
- `.ts` / `.tsx` → load `typescript` skill
- `.js` / `.jsx` → load `javascript` skill
- `.py` → load `python` skill
- `.go` → load `go` skill
- `.java` → load `java` skill
- `.sh` / `.bash` → load `shell` skill
- `.css` / `.html` → load `html-css` skill
- `.swift` → load `swift` skill
- `.json` → load `json` skill
- `.md` → load `markdown` skill

Pass the style guide content to implementer, reviewer, adversarial-tester, debug-agent, and test-writer as context.

### Flat mode (if teams disabled):

**Choose test writers based on scope:**
- Feature has UI/pages → include `test-writer` (Bowser spec)
- Feature has backend/Convex → include `unit-test-writer` (typed vitest)
- Both → include both

```json
{
  "tasks": [
    {
      "agent": "test-writer",
      "task": "Translate the USVA Gherkin into a Bowser spec.\n\nUSVA spec path: specs/usva/[feature].usva.md\nFeature slug: [slug]\nSelector hints: [paste from architect plan]\nOutput: tests/bowser/specs/[feature].md\n\nRun: ./scripts/build-context.sh test-writer \"[slug]\" \"specs/usva/[feature].usva.md\"\n\nLearnings:\n[selector learnings from LEARNINGS_CONTEXT]"
    },
    {
      "agent": "unit-test-writer",
      "task": "Write fully typed unit tests for this feature.\n\nUSVA spec path: specs/usva/[feature].usva.md\nArchitect plan:\n[paste relevant backend sections]\nFeature slug: [slug]\n\nZero any — use GenericId, typed contexts, @ts-expect-error with reasons.\n\nLearnings:\n[LEARNINGS_CONTEXT]"
    },
    {
      "agent": "implementer",
      "task": "Execute this implementation plan exactly.\n\nPlan:\n[paste full architect plan]\n\nUSVA spec: specs/usva/[feature].usva.md\nFeature slug: [slug]\n\nRun: ./scripts/build-context.sh implementer \"[slug]\"\n\nLearnings to apply:\n[LEARNINGS_CONTEXT]"
    }
  ],
  "agentScope": "project"
}
```

### Team mode (if activated in Phase 2.5):

Run in parallel:

**frontend-lead** (if frontend files in plan):
```json
{
  "agent": "frontend-lead",
  "task": "Team: frontend\nWorkers: implementer, ui-reviewer, test-writer, unit-test-writer\nDomain write: [FRONTEND_DIR]\nHard rules: no-inline-styles, no-any\n\nFeature: [feature]\nUSVA spec: specs/usva/[feature].usva.md\nPlan: [paste frontend sections]\n\nBreak into sub-tasks, delegate to workers in parallel, synthesize output.",
  "agentScope": "project"
}
```

**backend-lead** (if backend/schema files in plan):
```json
{
  "agent": "backend-lead",
  "task": "Team: backend\nWorkers: implementer, database-optimizer, sre, unit-test-writer\nDomain write: [BACKEND_DIR], [SCHEMA_DIR]\nHard rules: no-any, explicit-return-types\n\nFeature: [feature]\nUSVA spec: specs/usva/[feature].usva.md\nPlan: [paste backend sections]\n\nBreak into sub-tasks, delegate to workers in parallel, synthesize output.",
  "agentScope": "project"
}
```

After both complete:
- Check implementer output for "Out-of-scope issues found" → delegate each to `issue-creator`
- Check test-writer output for "SKIP" flags → note them in the report
- Check architect + implementer output for "Ideas surfaced" → collect them for Phase 8

---

## Out-of-scope issues

When any agent reports something out of scope, fire off issue creators in parallel if multiple:

```json
{
  "tasks": [
    {
      "agent": "issue-creator",
      "task": "Create a GitHub issue.\nTitle: [title 1]\nType: bug\nFound during: shipping [feature]\nLocation: [file]\nSymptom: [error]\nContext: [why]\nAffects: [who]\nBowser test: [test]"
    },
    {
      "agent": "issue-creator",
      "task": "Create a GitHub issue.\nTitle: [title 2]\n..."
    }
  ],
  "agentScope": "project"
}
```

---

## Phase 5 — Validation

### Flat mode (if teams disabled):

```json
{
  "agent": "reviewer",
  "task": "Review the diff against ivi rules. Return PASS or FAIL.\n\nFeature slug: [slug]\n\nRun: ./scripts/build-context.sh reviewer \"[slug]\"\n\nLearnings:\n[review-pattern learnings from LEARNINGS_CONTEXT]",
  "agentScope": "project"
}
```

If FAIL: send findings to implementer to fix, then re-run reviewer. Chain this:

```json
{
  "chain": [
    {
      "agent": "implementer",
      "task": "Fix these specific review findings. Do not touch anything else.\n\nFindings:\n[paste reviewer FAIL output]"
    },
    {
      "agent": "reviewer",
      "task": "Re-review the diff. The implementer fixed the previous findings. Check again.\n\nRun: ./scripts/build-context.sh reviewer \"[slug]\"\n\nPrevious findings that should be fixed: {previous}"
    }
  ],
  "agentScope": "project"
}
```

Repeat until PASS (max 3 rounds).

#### Phase 5.5 — Adversarial Testing (flat mode)

After reviewer passes, run the adversarial-tester to actively break the implementation:

```json
{
  "agent": "adversarial-tester",
  "task": "Red-team this feature. Feed edge-case inputs, test boundary conditions, probe RBAC, challenge the spec, hunt for failure modes the happy-path tests miss.\n\nFeature slug: [slug]\nFeature: [feature]\nUSVA spec: specs/usva/[feature].usva.md\n\nRun: ./scripts/build-context.sh adversarial-tester \"[slug]\"\n\nReturn BROKEN (with reproducible failures) or SURVIVED.\n\nLearnings:\n[LEARNINGS_CONTEXT]",
  "agentScope": "project"
}
```

If BROKEN with CRITICAL/HIGH findings: send findings to implementer to fix, then re-run adversarial-tester. Max 2 rounds.
If SURVIVED: proceed to gate-skeptic.

#### Phase 5.5.5 — Live Verifier (optional, for critical features)

For critical features, launch the two-agent verifier system alongside the implementer:

```bash
./scripts/launch-verifier.sh --agent sqlite  # or python, image, verifier (generic)
```

The verifier watches the builder's session JSONL and sends corrective feedback in real-time.
This is a separate Pi process running in its own terminal — not a subagent.

To use programmatically in /ship:
```bash
# Start builder with verifier attached
pi -e apps/verifier/verifiable.ts -e apps/verifier/cross-agent.ts --verifiable --verifier-agent verify_sqlite
```

Available domain verifiers:
- `verify_sqlite` — schemas, FKs, indexes, integrity (script: verify_sqlite.py)
- `verify_python` — type-check, lint, format, tests (script: verify_python.py)
- `verify_image` — vision-based image verification
- `verifier` — generic claim decomposition (no script)

This phase is manual/opt-in. It does not block the /ship pipeline.
If run, its findings supplement adversarial-tester output.

#### Phase 5.6 — Adversarial Readiness Check

After adversarial testing passes, run the gate-skeptic for an adversarial pre-gate check:

```json
{
  "agent": "gate-skeptic",
  "task": "Run adversarial readiness check on this feature before gates.\n\nFeature slug: [slug]\nFeature: [feature]\n\nDefault verdict: NOT READY. Require overwhelming evidence to flip.\n\nRun: ./scripts/build-context.sh reviewer \"[slug]\"\n\nCheck:\n1. All verification commands pass\n2. Backend deployed if changed\n3. All acceptance criteria verified\n4. No happy-path-only implementations\n5. No platform-specific build risks\n6. Git tree clean\n\nLearnings:\n[LEARNINGS_CONTEXT]",
  "agentScope": "project"
}
```

If NOT READY: fix specific blockers via implementer, then re-run gate-skeptic. Max 2 rounds.
If READY: proceed to Phase 6.

### Team mode (if activated in Phase 2.5):

Delegate to `validation-lead` instead of `reviewer`:

```json
{
  "agent": "validation-lead",
  "task": "Team: validation\nWorkers: reviewer, security-reviewer, adversarial-tester, gate-skeptic\nDomain: read-only\n\nFeature: [feature]\nFeature slug: [slug]\n\nRun: ./scripts/build-context.sh reviewer \"[slug]\"\nCoordinate your team in order:\n1. reviewer → code quality (PASS/FAIL)\n2. security-reviewer → security audit (SECURE/FINDINGS)\n3. adversarial-tester → active red-team testing (SURVIVED/BROKEN)\n4. gate-skeptic → readiness evidence check (READY/NOT READY)\n\nEach worker runs sequentially — fix failures before moving to next. Return APPROVED / NEEDS_REWORK / REJECTED with evidence.",
  "agentScope": "project"
}
```

If NEEDS_REWORK: delegate back to appropriate team lead (max 2 rounds). If REJECTED: escalate to user.

---

## Phase 6 — Run the gates

```bash
./scripts/run-ship.sh "[Feature Name]"
```

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

## Phase 7 — Learning agent (session end)

```json
{
  "agent": "learning-agent",
  "task": "Mode: session-end. Log this session and auto-promote patterns at 3+ recurrences.\n\nFeature: [feature]\nGate fixes required: [list or 'none']\nOut-of-scope issues: [list or 'none']\nBowser attempts: [1 or 2]\nLearnings applied: [list from architect + implementer outputs]\nNew patterns: [from debug-agent if any]",
  "agentScope": "project"
}
```

---

## Phase 8 — Report

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SHIPPED: [Feature Name]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

What passed
───────────
✓ [Feature test] — [X/Y steps]
✓ P0 regressions — clean
✓ Dev logs — clean

Exit criteria
─────────────
✓ [each from USVA]

What the user can now do
────────────────────────
[Specific. Exact action, exact outcome.]

PR
──
[URL]

Agents used
───────────
product-manager (GLM-5.1) — spec + USVA
architect (GLM-5.1) — plan
implementer (GLM-5)      ──┐
test-writer (GLM-5)      ──┤ parallel
unit-test-writer (GLM-5) ─┘ (if backend)
reviewer (GLM-5.1) → implementer → reviewer (chain, if needed)
[debug-agent (GLM-5) — if needed]
learning-agent (GLM-5.1) — logged + [N promoted]

Learnings
─────────
Applied: [which previous learnings were used]
New: [what was logged]
Promoted: [rules auto-written to skill files, if any]

Issues logged
─────────────
[#N — title, or "None"]

Ideas surfaced
──────────────
[List ideas from architect/implementer/reviewer, or "None"]
→ Want me to capture these to GitHub via /idea, or work on any now?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
