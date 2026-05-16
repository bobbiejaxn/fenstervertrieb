---
description: Run a domain verifier as a sidecar loop. Re-checks builder claims up to 3 iterations. Usage: /verify-loop <domain> [claims]
---

Run a verify-loop for: $@

## Parse arguments

First argument is the domain. Remaining text is the claims to verify.

**Domains:**
- `typescript` → verifier-typescript
- `python` → verifier-python
- `sql` → verifier-sql
- `deploy` → verifier-deploy
- `ui` → verifier-ui
- `generic` → verifier (generic claim decomposition from `.pi/verifier/`)

If no domain specified or unknown domain, default to `generic`.

Get changed files:
```bash
git diff --name-only HEAD~1
```

## Loop (max 3 iterations)

### Iteration 1

```json
{
  "agent": "verifier-${DOMAIN}",
  "task": "Verify these builder claims for domain: ${DOMAIN}.\n\nClaims:\n${CLAIMS}\n\nChanged files:\n${CHANGED_FILES}\n\nSource .pi/config.sh for verify commands and hard rules.\n\nEmit a structured Report block with STATUS, CONFIDENCE, and per-claim results.",
  "agentScope": "project"
}
```

### Parse result

Read the verifier's Report block:
- `STATUS: verified` → **DONE**. Report success below.
- `STATUS: failed` AND iteration < 3 → **LOOP** with feedback
- `STATUS: failed` AND iteration >= 3 → **ESCALATE**

### Subsequent iterations

Include previous failure feedback so the builder knows what to fix:

```json
{
  "agent": "verifier-${DOMAIN}",
  "task": "Re-verify these claims (iteration ${ITERATION}/3).\n\nPrevious iteration found these failures:\n${PREVIOUS_FAILURES}\n\nOriginal claims:\n${CLAIMS}\n\nChanged files:\n${CHANGED_FILES}\n\nThe builder has been given this feedback. Re-check if failures are resolved.\n\nSource .pi/config.sh for verify commands and hard rules.\n\nEmit a structured Report block.",
  "agentScope": "project"
}
```

## Output

After loop completes:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VERIFY-LOOP: ${DOMAIN}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Iterations: ${N}/3
Status: verified | escalated
Claims checked: ${TOTAL}
Claims passed: ${PASSED}
Claims failed: ${FAILED}

Details
───────
${VERIFIER_REPORT}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If escalated: delegate to `issue-creator` with failure details and move on. Do not block the pipeline.
