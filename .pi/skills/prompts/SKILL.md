---
name: prompts
description: "Composable, templated, version-controlled prompt templates for specialist agents and workflows"
argument-hint: "[command] [prompt-name or options]"
---

# Prompts - Reusable Workflow Templates

Pre-built prompt templates that define structured workflows for agents. Each prompt is a markdown file with YAML frontmatter that pi loads and interprets as instructions.

## What Are Prompts?

Prompts are structured workflow templates stored in `.pi/prompts/`. They:
- Define multi-step procedures with clear exit criteria
- Include guardrails and constraints
- Support variable substitution with `$@`
- Compose together (prompts can invoke other prompts or agents)
- Version control alongside code

## How It Works

```
User types: /feature Add export button
                ↓
Pi loads:       .pi/prompts/feature.md
                ↓
Substitutes:    $@ → "Add export button"
                ↓
Executes:       Step-by-step workflow from template
```

## Available Prompts

### Delivery Workflows

| Command | Purpose | Model Cost |
|---------|---------|------------|
| `/ship` | Full delivery pipeline: PM spec → architect plan → parallel implement+test → review → verify → PR | High (Opus+Sonnet) |
| `/ship-fast` | Streamlined delivery: skip PM/USVA/reviewer, direct implement → verify → PR | Medium (Sonnet) |
| `/feature` | Plan → TDD implement → review. Full feature cycle. | Medium |
| `/fix-gh-issue` | Fix GitHub issue end-to-end with full agent pipeline | Medium |
| `/fix-bug` | Triage and fix bug from symptoms (no GitHub issue required) | Medium |
| `/fix` | Alias for fix-gh-issue | Medium |

### Development Workflows

| Command | Purpose | Model Cost |
|---------|---------|------------|
| `/plan` | Create implementation plan, identify risks, wait for approval | Low |
| `/tdd` | RED → GREEN → REFACTOR cycle, 80%+ coverage required | Medium |
| `/review` | Pre-commit review: security, quality, standards | Low |
| `/verify` | Run verification checks (type check, lint, tests) | Minimal |

### Productivity

| Command | Purpose | Model Cost |
|---------|---------|------------|
| `/prime` | Orient on codebase, load learnings, check status | Low |
| `/status` | Pipeline health, what shipped, open issues by impact | Minimal |
| `/idea` | Capture idea to GitHub (pure capture, no planning) | Minimal (Haiku) |

### Research

| Command | Purpose | Model Cost |
|---------|---------|------------|
| `/research` | Quick web research via Perplexity Sonar (~1 coin) | ~1 coin |
| `/deep-research` | Deep multi-source analysis via Sonar Deep Research (~192 coins) | ~192 coins |

## Prompt Template Syntax

### YAML Frontmatter

Every prompt starts with YAML metadata:

```markdown
---
description: Brief description of what this prompt does
---
```

### Variable Substitution

Use `$@` to inject user input:

```markdown
Create an implementation plan for: $@
```

When user types `/plan Add export feature`, `$@` becomes "Add export feature".

### Agent Delegation

Prompts can delegate to specialist agents using JSON task definitions:

```markdown
Use the **subagent** tool with these parameters:
- agent: "researcher"
- task: "$@"
- agentScope: "both"
- confirmProjectAgents: false
```

### Structured Instructions

Use markdown headers and lists to structure workflows:

```markdown
## Step 1: Plan
- Restate requirements
- Identify risks
- Write phased plan

**STOP. Wait for user confirmation before continuing.**

## Step 2: Implement
After confirmation:
- Write tests first
- Implement minimally
- Verify coverage
```

### Command Blocks

Include bash commands for verification:

```bash
npm run test:once
npx tsc --noEmit
./scripts/vibe-test.sh quick
```

### Composition

Prompts reference other prompts or agents:

```markdown
### Step 1 — Plan
Follow the `/plan` protocol:
- Restate requirements
- Identify risks

### Step 2 — Implement
Delegate to implementer agent with learnings context.
```

## Creating Custom Prompts

### 1. Create Template File

```bash
touch .pi/prompts/my-workflow.md
```

### 2. Add Frontmatter

```markdown
---
description: What this prompt does, when to use it
---
```

### 3. Structure Workflow

Use clear sections, steps, and guardrails:

```markdown
Build X: $@

## Step 1 — Validate Input
Check that the request is valid.
If not, stop and ask for clarification.

## Step 2 — Execute
[concrete steps]

## Step 3 — Verify
[validation steps]

## Output
End with structured summary:
- What was done
- Files changed
- Next steps
```

### 4. Test It

```bash
/my-workflow Some test input
```

### 5. Share It

```bash
/library push prompt:my-workflow
```

## Examples

### Example 1: Simple Task Prompt

```markdown
---
description: Run type check and report errors
---

Check TypeScript types and report any errors.

```bash
npx tsc --noEmit 2>&1
```

If errors found, categorize:
- **Critical**: Type errors in auth/payment
- **High**: Type errors in user-facing code
- **Medium**: Type errors in utilities

Report:
```
TYPE CHECK: [PASS / FAIL]
Critical: [count]
High: [count]
Medium: [count]

[List each error with file:line]
```
```

### Example 2: Multi-Step Workflow

```markdown
---
description: Add new API endpoint with tests
---

Add this API endpoint: $@

## Step 1: Schema
Define types and validation.

## Step 2: Tests (RED)
Write failing tests for:
- Happy path
- Error cases
- Edge cases

Run and confirm RED state.

## Step 3: Implement (GREEN)
Write minimal code to pass tests.

## Step 4: Verify
```bash
npm test -- endpoint.test.ts
npm run lint
```

## Output
- Endpoint: [path]
- Tests: [count] passing
- Coverage: [%]
```

### Example 3: Agent Orchestration

```markdown
---
description: Parallel frontend + backend implementation
---

Build feature: $@

## Phase 1: Plan
Delegate to architect agent:
- Load USVA spec
- Generate implementation plan
- Wait for user approval

## Phase 2: Parallel Implementation
Run simultaneously:

**Frontend team:**
- test-writer: Create E2E tests
- ui-implementer: Build components

**Backend team:**
- unit-test-writer: Create unit tests
- implementer: Build backend logic

## Phase 3: Integration
- Run full test suite
- Verify API contracts
- Check responsive design

## Output
Report what works, what's left, any blockers.
```

### Example 4: Research Delegation

```markdown
---
description: Research and implement best practice
---

Research best practices for: $@

## Step 1: Research
Delegate to researcher agent for quick overview.

If insufficient, ask user:
> "Want deep research? (~192 coins)"

## Step 2: Plan
Use research findings to create implementation plan.

## Step 3: Execute
Implement the recommended approach.

## Output
- Research findings: [summary]
- Approach chosen: [why]
- Implementation: [what was built]
```

### Example 5: Quality Gate

```markdown
---
description: Pre-merge quality checklist
---

Run all quality gates before merging.

## Gate 1: Tests
```bash
npm run test:all
```
Must: 100% pass, 80%+ coverage

## Gate 2: Types
```bash
npx tsc --noEmit
```
Must: Zero errors

## Gate 3: Lint
```bash
npm run lint
```
Must: Zero warnings

## Gate 4: Security
Check for:
- Hardcoded secrets
- SQL injection risks
- XSS vulnerabilities

## Output
```
QUALITY GATES
─────────────
Gate 1: [✓ PASS / ✗ FAIL] — Tests
Gate 2: [✓ PASS / ✗ FAIL] — Types
Gate 3: [✓ PASS / ✗ FAIL] — Lint
Gate 4: [✓ PASS / ✗ FAIL] — Security

Ready to merge: [YES / NO]
[If NO: list blockers]
```
```

## Prompt Design Principles

### 1. Clear Entry and Exit

**Entry criteria:**
```markdown
Prerequisites:
- [ ] USVA spec exists
- [ ] Plan approved
- [ ] Tests scaffolded
```

**Exit criteria:**
```markdown
Done when:
- [ ] All tests pass
- [ ] 80%+ coverage
- [ ] Types compile
- [ ] Review approved
```

### 2. Guardrails

Include explicit constraints:

```markdown
**DO NOT:**
- Skip tests
- Use `any` types
- Edit generated files
- Commit secrets

**MUST:**
- Wait for approval before proceeding
- Run verification after each phase
- Report blockers immediately
```

### 3. Structured Output

Define exact output format:

```markdown
## Output Format

```
FEATURE: [name]
──────────────────
Built:
- [file:line]

Tests: [X/Y] passing
Coverage: [%]

Next: [concrete next step]
```
```

### 4. Composability

Reference other prompts and agents:

```markdown
## Step 1
Follow `/plan` protocol.

## Step 2
Delegate to `implementer` agent.

## Step 3
Run `/verify` before finishing.
```

### 5. Variable Context

Use `$@` for user input, but also document expected format:

```markdown
Add feature: $@

Expected format:
- "Add [action] to [component]"
- "Fix [symptom] in [location]"

If input doesn't match, ask for clarification.
```

## Cookbook

### List All Prompts

```bash
ls -1 .pi/prompts/*.md | xargs -I {} basename {} .md
```

### View Prompt Source

```bash
cat .pi/prompts/feature.md
```

### Test Prompt Variables

```bash
# Simulate variable substitution
echo "Input: Add export button"
sed 's/\$@/Add export button/g' .pi/prompts/feature.md
```

### Create from Template

```bash
# Copy existing prompt as starting point
cp .pi/prompts/feature.md .pi/prompts/my-feature.md

# Edit for your needs
vim .pi/prompts/my-feature.md
```

### Share to Library

```bash
# Push to central library
/library push prompt:my-feature

# Install from library in another project
/library install prompt:my-feature
```

### Version Prompts

```bash
# Prompts are versioned with git
git add .pi/prompts/my-feature.md
git commit -m "feat(prompts): add my-feature workflow"
```

### A/B Test Variants

Create variants and compare outcomes:

```bash
# Create variant
cp .pi/prompts/ship.md .pi/prompts/ship-v2.md

# Edit ship-v2.md with changes
# Use both and track:
# - Time to completion
# - Quality of output
# - Number of retry cycles
```

## Best Practices

### When to Create a Prompt

Create a prompt when:
- You repeat the same workflow 3+ times
- The workflow has 5+ steps
- Multiple agents need coordination
- Specific output format is required
- Guardrails and constraints are critical

### When NOT to Create a Prompt

Don't create a prompt for:
- One-off tasks
- Simple single-step operations
- Highly variable workflows
- User-specific procedures

### Prompt vs Agent vs Skill

| Use | When |
|-----|------|
| **Prompt** | Multi-step workflow, structured procedure, agent orchestration |
| **Agent** | Specialist role, reusable across many prompts, specific model tuning |
| **Skill** | Complex capability, multiple cookbooks, state management, external tools |

Example mappings:
- `/ship` is a **prompt** that orchestrates multiple **agents** (product-manager, architect, implementer)
- `implementer.md` is an **agent** used by prompts like `/ship`, `/feature`, `/fix`
- `/learnings` is a **skill** with its own commands, state, and cookbooks

### Naming Conventions

**Good prompt names:**
- Action-oriented: `ship`, `plan`, `review`, `fix`
- Descriptive: `fix-gh-issue`, `deep-research`
- Short: 1-2 words max

**Bad prompt names:**
- Vague: `do-stuff`, `handle-things`
- Too specific: `add-export-button-to-dashboard`
- Confusing: `thing1`, `flow-alpha`

### Documentation Standards

Every prompt should have:

```markdown
---
description: One-line summary (what it does, when to use it)
---

# Optional: Overview section

## Required: Step-by-step instructions

## Required: Output format

## Optional: Examples
```

## Exit Criteria

A complete prompts skill has:

- [x] All commands documented with clear purpose
- [x] Template syntax explained (YAML, `$@`, composition)
- [x] 5+ concrete examples covering different patterns
- [x] Best practices for creating custom prompts
- [x] Cookbook sections for common operations
- [x] Guardrails (when to use prompts vs agents vs skills)
- [x] Clear naming conventions
- [x] Integration with library system

## Related Skills

- **[/library](../library/SKILL.md)** - Share prompts across projects
- **[/learnings](../learnings/SKILL.md)** - Apply accumulated patterns to prompts
- **[/commit](../code-guardian/SKILL.md)** - Use prompts in commit workflow

## Further Reading

- [AGENTS.md](/Users/michaelguiao/Projects/pi_launchpad/AGENTS.md) - Agent definitions and model selection
- [README.md](/Users/michaelguiao/Projects/pi_launchpad/README.md) - Full system overview
- [.pi/prompts/](/Users/michaelguiao/Projects/pi_launchpad/.pi/prompts/) - Browse all available prompts
