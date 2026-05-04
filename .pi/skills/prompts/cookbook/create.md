# Create Custom Prompt

Step-by-step guide to creating a new prompt template.

## When to Use

Create a custom prompt when:
- You've repeated a workflow 3+ times
- The workflow has 5+ structured steps
- You need to coordinate multiple agents
- Specific output format is critical
- The workflow needs guardrails

## Prerequisites

- [ ] You understand what the workflow does
- [ ] You can write the steps in order
- [ ] You know what "done" looks like

## Steps

### 1. Create the File

```bash
touch .pi/prompts/my-workflow.md
```

**Naming:**
- Use kebab-case: `fix-bug`, `deploy-feature`
- Action-oriented: start with verb
- Keep it short: 1-2 words ideal

### 2. Add YAML Frontmatter

Open the file and add metadata:

```markdown
---
description: [One-line summary of what this does and when to use it]
---
```

Example:
```markdown
---
description: Deploy feature to staging, run smoke tests, promote to production if passing
---
```

### 3. Write the Workflow

Use this template structure:

```markdown
---
description: [your description]
---

[What this does]: $@

## Step 1: [First Phase Name]
[Clear instructions]
- [ ] Specific action
- [ ] Specific action

**STOP if [condition].**

## Step 2: [Second Phase Name]
[Clear instructions]

```bash
# Commands to run
npm test
```

## Step 3: [Third Phase Name]
[Clear instructions]

## Output

Define exact output format:

```
[Format name]: [title]
────────────────────
[Key info 1]: [value]
[Key info 2]: [value]

[Summary section]
```
```

### 4. Add Guardrails

Include explicit constraints:

```markdown
**DO NOT:**
- [thing to avoid]
- [thing to avoid]

**MUST:**
- [required step]
- [required step]

**STOP AND ASK if:**
- [ambiguous situation]
- [blocking issue]
```

### 5. Add Variable Substitution

Use `$@` for user input:

```markdown
Process this request: $@
```

Document expected input format:

```markdown
Expected format:
- "Add [feature] to [component]"
- "Fix [bug] in [area]"

If format doesn't match, clarify with user.
```

### 6. Test the Prompt

```bash
# Use the prompt
/my-workflow Test input here
```

Verify:
- [ ] All steps execute in order
- [ ] Variables substitute correctly
- [ ] Output format is correct
- [ ] Guardrails work as expected
- [ ] Error handling is clear

### 7. Iterate

Refine based on:
- Did any step fail?
- Were instructions ambiguous?
- Did you need to add steps?
- Was output format unclear?

### 8. Document Edge Cases

Add a section for special cases:

```markdown
## Edge Cases

**If X happens:**
Do Y instead.

**If dependency Z fails:**
1. Check logs
2. Report error
3. Stop (don't continue)
```

### 9. Share to Library

```bash
/library push prompt:my-workflow
```

Now available to all projects.

## Full Example

Here's a complete custom prompt:

```markdown
---
description: Run security audit and create report with severity-ranked findings
---

Audit security for: $@

## Prerequisites

Check these exist:
- [ ] `.env.example` file
- [ ] Auth middleware
- [ ] Test coverage >70%

If missing, stop and report.

## Step 1: Static Analysis

```bash
npm audit
npx eslint . --ext .ts,.tsx --max-warnings 0
```

## Step 2: Manual Review

Check each file in scope for:

**CRITICAL:**
- Hardcoded secrets (API keys, passwords)
- SQL injection vectors
- XSS vulnerabilities
- Missing auth checks

**HIGH:**
- Missing rate limiting
- Unvalidated user input
- Missing CSRF protection
- Exposed error messages

**MEDIUM:**
- Missing security headers
- Weak session config
- Missing audit logging

## Step 3: Validate Fixes

For each finding:
1. State the issue
2. Show the vulnerable code
3. Suggest a fix
4. Wait for user confirmation

## Step 4: Verify

After fixes applied:
```bash
npm test
npm audit
```

Must pass before finishing.

## Output

```
SECURITY AUDIT — [scope]
═══════════════════════════════════

Findings by severity
────────────────────
Critical: [N] — [MUST FIX before deploy]
High:     [N] — [Should fix this sprint]
Medium:   [N] — [Backlog for next sprint]

Critical findings
─────────────────
1. [file:line] — [description]
   Fix: [specific action]

High findings
─────────────
[...]

Status
──────
Ready to deploy: [YES / NO]
[If NO: list blockers]
```

**DO NOT:**
- Skip critical findings
- Approve code with secrets
- Auto-fix without confirmation

**MUST:**
- Report all findings
- Wait for user approval on fixes
- Re-run audit after changes
```

## Tips

### Keep Steps Focused

Each step should:
- Do one thing
- Take <5 minutes
- Have clear done criteria

### Use Composition

Reference other prompts and agents:

```markdown
## Step 1
Follow `/plan` protocol.

## Step 2
Delegate to `implementer` agent with context:
- Feature spec: [link]
- Learnings: [inject here]
```

### Make Output Scannable

Use:
- Clear headers with emoji or symbols
- Aligned columns
- Consistent formatting
- Status flags (✓/✗, PASS/FAIL)

### Test Edge Cases

Before sharing, test:
- Invalid input
- Missing dependencies
- Failed steps
- Partial completion

## Common Mistakes

### ❌ Too Vague

```markdown
## Step 1: Do stuff
Make the changes.
```

### ✅ Specific

```markdown
## Step 1: Update Schema
Edit `convex/schemas/user.ts`:
1. Add `emailVerified` field
2. Set type to `v.boolean()`
3. Add to validator
```

### ❌ Missing Guardrails

```markdown
## Step 2: Deploy
Push to production.
```

### ✅ With Guardrails

```markdown
## Step 2: Deploy

**STOP if:**
- Tests failing
- Critical findings unfixed
- No approval from user

If all clear:
```bash
npm run deploy
```
```

### ❌ Unclear Output

```markdown
Report the results.
```

### ✅ Structured Output

```markdown
## Output

```
RESULT: [success / partial / failed]
Time: [duration]
Changed: [file count]
Next: [concrete action]
```
```

## Validation Checklist

Before sharing your prompt:

- [ ] YAML frontmatter present
- [ ] Description is clear and concise
- [ ] Steps are ordered and numbered
- [ ] Each step has clear done criteria
- [ ] Guardrails defined (DO NOT, MUST)
- [ ] Output format is structured
- [ ] Variables use `$@` correctly
- [ ] Edge cases documented
- [ ] Tested with real input
- [ ] No ambiguous instructions

## See Also

- [Examples](../SKILL.md#examples) - More complete prompt examples
- [Best Practices](../SKILL.md#best-practices) - Design principles
- [Prompt vs Agent vs Skill](../SKILL.md#prompt-vs-agent-vs-skill) - When to use each
