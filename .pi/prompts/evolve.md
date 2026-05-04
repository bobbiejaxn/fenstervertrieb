---
description: Run the harness evolver to analyze traces and propose improvements to agent prompts, skills, and configuration.
---

# /evolve — Harness Evolution

Evolve focus: $@

Analyze execution traces and improve the agent harness.

## Workflow

1. **Snapshot** current harness version
2. **Delegate** to the `harness-evolver` agent with full trace access
3. **Review** the proposal — confirm or reject
4. **Apply** if approved
5. **Track** the result after next run

## Steps

### Step 1: Snapshot current harness

```bash
./scripts/harness-version.sh snapshot
```

### Step 2: Run the evolver

Invoke the `harness-evolver` agent:

```json
{
  "agent": "harness-evolver",
  "agentScope": "project",
  "task": "Read the trace index at .pi/traces/index.json. Identify the most impactful failure pattern across recent runs. Diagnose the root cause by reading specific trace files. Propose ONE targeted change to improve the harness. Write the proposal to .pi/traces/analysis/proposals/ and apply the change."
}
```

If you want to focus the evolver on a specific area:

```
/evolve cost        → "Focus on reducing token costs. Find the most expensive agents and propose model downgrades or context reductions."
/evolve gates       → "Focus on improving gate pass rate. Find the most common gate failures and propose harness changes to prevent them."  
/evolve speed       → "Focus on reducing wall-clock time. Find bottlenecks in the agent pipeline and propose parallelization or simplification."
/evolve <run-id>    → "Diagnose why run <run-id> failed. Read its traces, identify the root cause, and propose a fix."
```

### Step 3: Review the proposal

Read the proposal at `.pi/traces/analysis/proposals/proposal-NNN.md`. Verify:
- The diagnosis cites specific trace evidence
- The change is small and reversible
- The expected impact is realistic

### Step 4: Apply or reject

If approved, the evolver has already applied the change and snapshotted.
If rejected: `./scripts/harness-version.sh rollback`

### Step 5: Track

After the next `/ship` or `/fix` run, compare metrics against the baseline.
