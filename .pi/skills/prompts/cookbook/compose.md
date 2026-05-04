# Compose Prompts with Agents

How to orchestrate multiple agents from a prompt template.

## When to Use

Use prompt composition when:
- A workflow needs multiple specialist agents
- Agents can run in parallel
- Different phases need different models
- You want to maximize cost efficiency

## Delegation Patterns

### Pattern 1: Sequential Delegation

One agent, then another:

```markdown
---
description: Plan, implement, then review
---

Build feature: $@

## Phase 1: Planning
Delegate to architect:
```json
{
  "agent": "architect",
  "task": "Create implementation plan for: $@\n\nOutput: Full plan with files to touch.",
  "agentScope": "project"
}
```

**Wait for plan approval before continuing.**

## Phase 2: Implementation
Delegate to implementer with plan:
```json
{
  "agent": "implementer",
  "task": "Execute this plan:\n\n[paste plan from Phase 1]",
  "agentScope": "project"
}
```

## Phase 3: Review
Delegate to reviewer:
```json
{
  "agent": "reviewer",
  "task": "Review the diff. Return PASS or FAIL.",
  "agentScope": "project"
}
```

If FAIL, loop back to implementer.
```

### Pattern 2: Parallel Delegation

Multiple agents at once:

```markdown
---
description: Frontend + backend in parallel
---

Build feature: $@

## Phase 1: Parallel Implementation

Run these agents simultaneously:

**Frontend:**
```json
{
  "agent": "ui-implementer",
  "task": "Build UI for: $@\n\nComponents: [list]",
  "agentScope": "project"
}
```

**Backend:**
```json
{
  "agent": "implementer",
  "task": "Build API for: $@\n\nEndpoints: [list]",
  "agentScope": "project"
}
```

**Tests:**
```json
{
  "agent": "test-writer",
  "task": "Write E2E tests for: $@",
  "agentScope": "project"
}
```

Wait for all three to complete before proceeding.

## Phase 2: Integration
Verify all pieces work together.
```

### Pattern 3: Conditional Delegation

Delegate based on conditions:

```markdown
---
description: Research before implementing
---

Implement: $@

## Phase 1: Check Existing Solutions

Scan codebase:
```bash
rg "similar-pattern" --type ts
```

**If found:** Reuse existing pattern, skip research.

**If not found:** Delegate to researcher:
```json
{
  "agent": "researcher",
  "task": "Find best practices for: $@",
  "agentScope": "both"
}
```

## Phase 2: Implement
Use findings from Phase 1 to implement.
```

### Pattern 4: Chain with Retry

Implement → Review → Fix → Review loop:

```markdown
---
description: Implement with review loop
---

Build: $@

## Implementation Loop

```json
{
  "chain": [
    {
      "agent": "implementer",
      "task": "Implement: $@"
    },
    {
      "agent": "reviewer",
      "task": "Review the diff. Return PASS or FAIL."
    }
  ],
  "agentScope": "project"
}
```

If reviewer returns FAIL:

```json
{
  "chain": [
    {
      "agent": "implementer",
      "task": "Fix these review findings:\n\n[paste FAIL output]"
    },
    {
      "agent": "reviewer",
      "task": "Re-review. Previous findings should be fixed."
    }
  ],
  "agentScope": "project"
}
```

Max 3 retry loops.
```

## Agent Scope

Control which agents are available:

| Scope | What It Does |
|-------|--------------|
| `"project"` | Only agents in `.pi/agents/` |
| `"global"` | Only agents in `~/.pi/agents/` |
| `"both"` | Project agents override global ones |

Example:

```json
{
  "agent": "researcher",
  "task": "$@",
  "agentScope": "both"
}
```

Use `"both"` for research agents (often global).
Use `"project"` for project-specific specialists.

## Context Passing

### Pass Static Context

Include project-specific details:

```json
{
  "agent": "implementer",
  "task": "Build feature: $@\n\nRules:\n- Use Convex for backend\n- All queries need requireRead\n- Zero any types\n\nFiles to touch:\n- convex/queries/users.ts\n- frontend/components/UserList.tsx",
  "agentScope": "project"
}
```

### Pass Dynamic Context

Include output from previous agents:

```markdown
## Phase 1: Plan
Delegate to architect.
Save output as `PLAN`.

## Phase 2: Implement
Delegate to implementer:
```json
{
  "agent": "implementer",
  "task": "Execute this plan:\n\n[paste PLAN here]\n\nFeature: $@",
  "agentScope": "project"
}
```
```

### Pass Learnings Context

Include accumulated patterns:

```markdown
## Phase 0: Load Learnings

```json
{
  "agent": "learning-agent",
  "task": "Mode: session-start. Retrieve pending learnings.",
  "agentScope": "project"
}
```

Save the "Inject into agent context" block as `LEARNINGS_CONTEXT`.

## Phase 1: Implement with Learnings

```json
{
  "agent": "implementer",
  "task": "Build: $@\n\nLearnings to apply:\n[paste LEARNINGS_CONTEXT]",
  "agentScope": "project"
}
```
```

## Model Selection

Choose agents based on task complexity:

| Task | Agent | Model |
|------|-------|-------|
| Planning, architecture | `architect` | Opus (high reasoning) |
| Implementation | `implementer` | Sonnet (balanced) |
| Review | `reviewer` | Sonnet (pattern matching) |
| Simple tasks | `issue-creator` | Haiku (fast, cheap) |
| Research | `researcher` | Sonar (web access) |

Example multi-model workflow:

```markdown
## Phase 1: Architecture (Opus)
```json
{
  "agent": "architect",
  "task": "Design system for: $@"
}
```

## Phase 2: Implementation (Sonnet)
```json
{
  "agent": "implementer",
  "task": "Implement from plan"
}
```

## Phase 3: Capture Issues (Haiku)
```json
{
  "agent": "issue-creator",
  "task": "Create issue for deferred items"
}
```
```

## Error Handling

### Handle Agent Failures

```markdown
## Phase 1: Implement
Delegate to implementer.

**If implementer reports "Out of scope":**
1. Create issue for out-of-scope item
2. Continue with in-scope work

**If implementer fails after 2 attempts:**
1. Report partial completion
2. List blockers
3. Stop (don't continue)
```

### Retry with Different Agent

```markdown
## Phase 1: Implement (Primary)
Try implementer first.

**If fails:**
```json
{
  "agent": "fixer",
  "task": "Fix what implementer couldn't:\n\n[paste failure]"
}
```

Fixer has different approach, may succeed.
```

## Full Example: Ship Workflow

Complete prompt orchestrating 5+ agents:

```markdown
---
description: Full delivery pipeline with parallel agents
---

Ship feature: $@

## Phase 0: Load Learnings
```json
{
  "agent": "learning-agent",
  "task": "Mode: session-start",
  "agentScope": "project"
}
```
Save output as `LEARNINGS`.

## Phase 1: Spec (Opus)
```json
{
  "agent": "product-manager",
  "task": "Interview user about: $@",
  "agentScope": "project"
}
```
**STOP. Wait for user approval.**

## Phase 2: Plan (Opus)
```json
{
  "agent": "architect",
  "task": "Read spec, create plan.\n\nLearnings:\n[LEARNINGS]",
  "agentScope": "project"
}
```
Save output as `PLAN`.

## Phase 3: Parallel Build (Sonnet × 3)

Frontend:
```json
{
  "agent": "ui-implementer",
  "task": "Build UI from PLAN.\n\nLearnings:\n[LEARNINGS]"
}
```

Backend:
```json
{
  "agent": "implementer",
  "task": "Build backend from PLAN.\n\nLearnings:\n[LEARNINGS]"
}
```

Tests:
```json
{
  "agent": "test-writer",
  "task": "Write E2E tests from spec."
}
```

Run all three simultaneously.

## Phase 4: Review (Sonnet)
```json
{
  "agent": "reviewer",
  "task": "Review diff. PASS or FAIL."
}
```

If FAIL: fix and re-review (max 3 loops).

## Phase 5: Verify
```bash
./scripts/run-ship.sh "$@"
```

## Phase 6: Log Learnings (Opus)
```json
{
  "agent": "learning-agent",
  "task": "Mode: session-end. Log patterns.",
  "agentScope": "project"
}
```

## Output
```
SHIPPED: $@
─────────────────
Agents: PM (Opus) → Architect (Opus) → [UI + Backend + Tests] (Sonnet) → Reviewer (Sonnet)
Time: [duration]
Learnings: [N] applied, [N] logged
PR: [URL]
```
```

## Tips

### Parallelize When Possible

**❌ Sequential (slow):**
```markdown
1. Build frontend
2. Wait
3. Build backend
4. Wait
5. Write tests
```

**✅ Parallel (fast):**
```markdown
1. Launch frontend, backend, tests simultaneously
2. Wait for all
3. Integrate
```

### Minimize Context Passing

Only pass what agents need:

**❌ Too much:**
```json
{
  "task": "Implement X.\n\n[entire spec]\n\n[entire plan]\n\n[all learnings]"
}
```

**✅ Focused:**
```json
{
  "task": "Implement X.\n\nRelevant plan:\n- API: endpoints.ts\n- UI: Dashboard.tsx\n\nKey constraint: Use requireRead"
}
```

### Use Explicit Stops

Force user confirmation at key points:

```markdown
## Phase 1: Plan
[create plan]

**STOP. Present plan to user. Wait for "yes" before continuing.**

## Phase 2: Implement
[only runs after user says yes]
```

## See Also

- [Agent Definitions](../../agents/) - Available agents and their models
- [Create Custom Prompt](./create.md) - How to build prompts
- [Best Practices](../SKILL.md#best-practices) - Design principles
