# Debug Prompt Issues

Troubleshooting guide for when prompts don't work as expected.

## Common Issues

### Issue 1: Variable Not Substituting

**Symptom:**
Prompt shows `$@` literally instead of user input.

**Causes:**
1. Missing quotes around `$@`
2. Shell escaping issues
3. Variable used in wrong context

**Solutions:**

✅ **Correct usage:**
```markdown
Build feature: $@
```

✅ **In task delegation:**
```markdown
```json
{
  "agent": "implementer",
  "task": "Build: $@"
}
```
```

❌ **Common mistakes:**
```markdown
Build feature: "$@"  # Don't quote in markdown
Build feature: ${@}  # Wrong syntax
```

**Debug steps:**
1. Check if `$@` appears literally in output
2. Verify no quotes around `$@` in markdown
3. Test with simple input: `/my-prompt hello`

---

### Issue 2: Agent Not Found

**Symptom:**
Error: "Agent 'xyz' not found" or "No agents matched"

**Causes:**
1. Agent doesn't exist in `.pi/agents/`
2. Wrong `agentScope` setting
3. Typo in agent name
4. Agent file malformed

**Solutions:**

**Check agent exists:**
```bash
ls -1 .pi/agents/ | grep -i "implementer"
```

**Verify agentScope:**
```json
{
  "agent": "researcher",
  "agentScope": "both"  // Checks project AND global
}
```

| Scope | Where It Looks |
|-------|----------------|
| `"project"` | Only `.pi/agents/` |
| `"global"` | Only `~/.pi/agents/` |
| `"both"` | Project first, fallback to global |

**Validate agent file:**
```bash
cat .pi/agents/implementer.md
```

Check for:
- Valid YAML frontmatter
- `model:` field present
- No syntax errors

---

### Issue 3: Step Skipped

**Symptom:**
Prompt jumps to Step 3 without running Step 2.

**Causes:**
1. No explicit stop between steps
2. Conditional logic unclear
3. Agent returned early

**Solutions:**

✅ **Add explicit stops:**
```markdown
## Step 1: Plan
Create the plan.

**STOP. Wait for user approval before Step 2.**

## Step 2: Implement
[only runs after approval]
```

✅ **Make conditionals explicit:**
```markdown
## Step 2: Check Results

If tests passed:
- Proceed to Step 3

If tests failed:
- Fix failures
- Re-run tests
- **Do not continue until passing**
```

---

### Issue 4: Output Format Ignored

**Symptom:**
Agent returns freeform text instead of structured format.

**Causes:**
1. Format instructions unclear
2. Format buried in middle of prompt
3. No example provided
4. Agent output too long, truncated

**Solutions:**

✅ **Put format at end:**
```markdown
## Step 3: Report

[instructions]

## Output Format

**Use exactly this format:**

```
STATUS: [value]
────────────────
Item 1: [value]
Item 2: [value]
```
```

✅ **Provide example:**
```markdown
Example output:

```
STATUS: COMPLETE
────────────────
Tests: 15 passing
Coverage: 87%
```
```

✅ **Make it mandatory:**
```markdown
**You MUST use this exact format. Do not deviate.**
```

---

### Issue 5: Infinite Loop

**Symptom:**
Prompt keeps retrying same step, never progresses.

**Causes:**
1. No max retry limit
2. Exit condition unclear
3. Retry logic broken

**Solutions:**

✅ **Add retry limit:**
```markdown
## Phase 2: Implement → Review Loop

Try up to 3 times:

1. Implement
2. Review
3. If FAIL: fix and loop
4. If PASS: proceed

**After 3 failures: Stop and report blockers.**
```

✅ **Make exit condition explicit:**
```markdown
Continue looping while:
- Review returns FAIL
- Attempt count < 3
- User hasn't said "stop"

Stop when:
- Review returns PASS
- Max attempts reached
- Blocker found
```

✅ **Add escape hatch:**
```markdown
After each loop:
> Continue fixing? (yes / no / report blocker)

If user says "no" or "report blocker": stop immediately.
```

---

### Issue 6: Context Lost Between Steps

**Symptom:**
Step 2 doesn't know what Step 1 produced.

**Causes:**
1. Output not captured
2. Variable not passed forward
3. Agent can't see previous output

**Solutions:**

✅ **Capture output explicitly:**
```markdown
## Step 1: Plan
Delegate to architect.

**Save the output as `PLAN` for use in Step 2.**

## Step 2: Implement
Use the plan from Step 1:

```json
{
  "agent": "implementer",
  "task": "Execute this plan:\n\n[paste PLAN here]"
}
```
```

✅ **Pass context forward:**
```markdown
## Step 1: Research
Output saved as `RESEARCH_FINDINGS`.

## Step 2: Plan
Input: RESEARCH_FINDINGS
Output: IMPLEMENTATION_PLAN

## Step 3: Implement
Input: IMPLEMENTATION_PLAN
```

---

### Issue 7: Guardrails Ignored

**Symptom:**
Prompt does things it shouldn't (skips tests, uses `any`, etc).

**Causes:**
1. Guardrails buried in text
2. No consequences stated
3. Contradicting instructions

**Solutions:**

✅ **Make guardrails bold and explicit:**
```markdown
**CRITICAL — STOP IF VIOLATED:**

- NO `any` types (zero tolerance)
- NO skipping tests
- NO committing secrets

**If you find these, STOP and report. Do not continue.**
```

✅ **Add consequences:**
```markdown
**DO NOT commit if:**
- Tests failing → BLOCKED
- Types don't compile → BLOCKED
- Secrets in code → BLOCKED

**BLOCKED means: report the issue, wait for fix, do not proceed.**
```

✅ **Check for contradictions:**

❌ **Contradicting:**
```markdown
1. Write tests first (TDD)
2. Implement quickly to meet deadline
```

✅ **Consistent:**
```markdown
1. Write tests first (TDD)
2. Implement minimally to pass tests
3. Speed comes from clear process, not skipping steps
```

---

### Issue 8: Slow Execution

**Symptom:**
Prompt takes 5+ minutes when it should be <1 minute.

**Causes:**
1. Sequential agents that could be parallel
2. Reading entire codebase
3. Expensive model for simple task
4. Too much context passed

**Solutions:**

✅ **Parallelize independent work:**

❌ **Slow (sequential):**
```markdown
1. Write frontend
2. Write backend
3. Write tests
```

✅ **Fast (parallel):**
```markdown
Run simultaneously:
- Agent 1: Frontend
- Agent 2: Backend
- Agent 3: Tests
```

✅ **Filter context:**
```bash
# Don't read everything
find . -name "*.ts" -exec cat {} \;

# Read only what's needed
cat src/specific/file.ts
```

✅ **Use cheaper models:**
```markdown
# For simple tasks
{
  "agent": "issue-creator",  # Uses Haiku (fast)
  "task": "..."
}

# For complex reasoning
{
  "agent": "architect",  # Uses Opus (slow but thorough)
  "task": "..."
}
```

---

## Debugging Process

### Step 1: Isolate the Problem

Run prompt with minimal input:
```bash
/my-prompt test
```

Does it work with simple input?
- Yes → Issue is with complex input
- No → Issue is in prompt logic

### Step 2: Check Each Phase

Add debug output:
```markdown
## Phase 1: Plan
[instructions]

**Debug checkpoint:**
Echo the plan before proceeding.
```

### Step 3: Validate Agent Delegation

Test agent directly:
```bash
# Test if agent works standalone
pi run .pi/agents/implementer.md "simple task"
```

If agent fails standalone, issue is with agent (not prompt).

### Step 4: Check Variable Substitution

Add explicit echo:
```markdown
## Step 1: Echo Input
User requested: $@

Continue? (yes/no)
```

Verify `$@` substitutes correctly.

### Step 5: Simplify

Remove complexity until it works:
1. Start with 1 step
2. Add steps one at a time
3. When it breaks, you found the problem

---

## Prevention Checklist

Before sharing a prompt:

- [ ] Test with simple input
- [ ] Test with complex input
- [ ] Test with invalid input
- [ ] Verify all agents exist
- [ ] Check `agentScope` is correct
- [ ] Add explicit stops between phases
- [ ] Include retry limits
- [ ] Make output format mandatory
- [ ] Add debug checkpoints
- [ ] Validate guardrails work
- [ ] Parallelize where possible
- [ ] Pass only needed context

---

## Getting Help

### Check Logs

Look for errors in:
```bash
# Pi logs
tail -f ~/.pi/logs/latest.log

# Agent execution logs
tail -f .pi/logs/agent-execution.log

# Cron logs (if using automated workflows)
tail -f logs/cron/session-current.log
```

### Enable Debug Mode

Add to prompt:
```markdown
**Debug mode: ON**

After each step:
1. State what you just did
2. State what you're about to do
3. Ask: Continue?
```

### Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| "Agent not found" | Wrong name or scope | Check `.pi/agents/`, fix `agentScope` |
| "Task format invalid" | Malformed JSON | Validate JSON syntax |
| "No response from agent" | Agent crashed | Check agent logs, simplify task |
| "Context limit exceeded" | Too much input | Filter context, use summaries |
| "Rate limit hit" | Too many API calls | Add delays, reduce parallel agents |

---

## See Also

- [Create Custom Prompt](./create.md) - Build prompts correctly from start
- [Compose Prompts](./compose.md) - Agent orchestration patterns
- [Best Practices](../SKILL.md#best-practices) - Design principles
