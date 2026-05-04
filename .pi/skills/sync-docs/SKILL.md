---
name: sync-docs
version: 1.0.0
description: Synchronize all documentation, counts, tables, and target projects after changes to pi_launchpad. Triggers on "sync docs", "update readme", "update everything", "sync all", "refresh docs", "update counts".
---

# Sync Docs — Keep Everything in Sync

You are a documentation synchronization engine. Your job is to scan the actual state of pi_launchpad and update every file that references it — README.md, AGENTS.md, registry.yaml, and target projects. Zero manual intervention needed.

## When to Run

- After adding/removing agents, skills, extensions, prompts, or scripts
- After changing agent model assignments
- After modifying any architectural feature
- When the user says "sync docs", "update everything", "update readme", "refresh docs"
- After any multi-commit session (auto-trigger at the end)

## What You Sync (in order)

### Step 1: Scan Actual State

Run these commands to get the ground truth. **Never trust what's written in docs — always count from files.**

```bash
cd "$REPO_ROOT"

# Agent counts
CORE_AGENTS=$(ls .pi/agents/*.md 2>/dev/null | wc -l | tr -d ' ')
BOARD_AGENTS=$(ls .pi/agents/board/*.md 2>/dev/null | wc -l | tr -d ' ')
TOTAL_AGENTS=$((CORE_AGENTS + BOARD_AGENTS))

# Extension count
EXTENSIONS=$(ls -d .pi/extensions/*/ 2>/dev/null | wc -l | tr -d ' ')

# Skill count
SKILLS=$(ls -d .pi/skills/*/ 2>/dev/null | wc -l | tr -d ' ')

# Prompt count
PROMPTS=$(ls .pi/prompts/*.md 2>/dev/null | wc -l | tr -d ' ')

# Script count
SCRIPTS=$(ls scripts/*.sh 2>/dev/null | wc -l | tr -d ' ')

# Test count
TESTS=$(find .pi -name "*.test.ts" -o -name "*.spec.ts" 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')

# Model distribution
grep '^model:' .pi/agents/*.md .pi/agents/board/*.md 2>/dev/null | sed 's/.*agents\///' | awk -F: '{print $3}' | sort | uniq -c | sort -rn

# Agent→model mapping (for the table)
for f in .pi/agents/*.md; do
  name=$(grep '^name:' "$f" | head -1 | sed 's/name: //')
  model=$(grep '^model:' "$f" | head -1 | sed 's/model: //')
  desc=$(grep '^description:' "$f" | head -1 | sed 's/description: //')
  echo "$name|$model|$desc"
done | sort
```

### Step 2: Update README.md

Update these sections with the scanned values. Use exact section headers as anchors.

#### 2a. Architecture block (line ~43)

Update the counts in the `.pi/` tree diagram:

```
├── agents/          {CORE} core agents + {BOARD} board advisors (.md definitions)
├── prompts/         {PROMPTS} orchestration workflows
├── extensions/      {EXTENSIONS} TypeScript extensions
├── skills/          {SKILLS} reusable patterns and domain expertise
```

And:
```
scripts/             {SCRIPTS} hard-enforcement and automation scripts
```

#### 2b. Section headers with counts

Update these section headers (the count is in the header text):

- `## Agents ({TOTAL} = {CORE} core + {BOARD} board)`
- `## Extensions ({EXTENSIONS})`
- `## Prompts ({PROMPTS} workflows)`
- `## Agent Skills ({SKILLS})`

#### 2c. Agent table (under ## Agents)

Replace the entire table between `## Agents` and `## Extensions`. Generate from actual files:

For each agent (core + board), output:
```
| **name** | Model Short Name | description |
```

Bold the agent name if it's a leadership/deep-reasoning role (ceo, architect, security-reviewer, gate-skeptic, adversarial-tester, validation-lead, frontend-lead, backend-lead, software-architect, harness-evolver, all board members).

Model short names (human-readable):
- `deepseek-v4-pro:cloud` → `DeepSeek V4 Pro`
- `deepseek-v4-flash:cloud` → `DeepSeek V4 Flash`
- `deepseek-v3.2:cloud` → `DeepSeek V3.2`
- `glm-5.1:cloud` → `GLM-5.1`
- `glm-5:cloud` → `GLM-5`
- `minimax-m2.7:cloud` → `MiniMax-M2.7`
- `straico/perplexity/sonar` → `Straico/Sonar`
- `straico/perplexity/sonar-deep-research` → `Straico/Sonar DR`

Sort: core agents first (alphabetical), then board agents (alphabetical).

#### 2d. Extensions table (under ## Extensions)

Replace the entire table between `## Extensions` and the next `##` section. Generate from actual directories:

```bash
for ext_dir in .pi/extensions/*/; do
  name=$(basename "$ext_dir")
  desc=""
  if [ -f "${ext_dir}index.ts" ]; then
    desc=$(grep -A2 'description\|register\|actions' "${ext_dir}index.ts" | head -3 | tr '\n' ' ')
  fi
  echo "$name|$desc"
done
```

Bold the extension name if it's a critical system component (ceo, subagent, model-router, trace-recorder, domain-enforcer).

#### 2e. Skills table (under ## Agent Skills)

Replace the entire table between `## Agent Skills` and the next `##` section. For each skill:

```bash
for skill_dir in .pi/skills/*/; do
  name=$(basename "$skill_dir")
  desc=$(grep '^description:' "${skill_dir}SKILL.md" | head -1 | sed 's/description: //')
  echo "$name|$desc"
done
```

Bold skills that are new or critical (builder-ethos, model-router, code-guardian, vibe-test-guardian, adversarial-related, proposal-deck-builder).

Group by category:
1. Core agent behaviors (mental-model, zero-micro-management, precise-worker, etc.)
2. Quality enforcement (code-guardian, vibe-test-guardian, vercel-deploy-guard, etc.)
3. Design (frontend-design, huashu-design, design-principles, cinematic-sites)
4. Content (proposal-deck-builder, obsidian-direct-write)
5. Infrastructure (drive, library, prompts, orchestrator, agentops)
6. OpenSpec (openspec-*)
7. Other

#### 2f. Model Providers table

Update the "Used by" column to reflect actual agent counts per provider:

```bash
grep '^model:' .pi/agents/*.md .pi/agents/board/*.md | awk -F: '{print $3}' | sort | uniq -c | sort -rn
```

Map to providers:
- `deepseek-v4-pro:cloud` + `deepseek-v4-flash:cloud` + `deepseek-v3.2:cloud` → Ollama Cloud
- `glm-5.1:cloud` + `glm-5:cloud` → ZAI API
- `minimax-m2.7:cloud` → MiniMax API
- `straico/*` → Straico

#### 2g. Multi-Provider Model Routing table

Regenerate from actual model distribution. Group by role type:
- Deep reasoning agents → their model
- Fast reasoning agents → their model
- Coding execution → their model
- Structured output → their model
- Research → their model

#### 2h. Architecture Decisions

Update the model-related decisions:
- `{Model} for {role}` — list all agents using that model

#### 2i. Testing section

Update test count and test file list:

```bash
find .pi -name "*.test.ts" -o -name "*.spec.ts" 2>/dev/null | grep -v node_modules
```

Count total test cases:
```bash
grep -c 'it\(' or 'test\(' across all test files
```

#### 2j. Setup "what gets created" block

Update the counts in the tree diagram under `### What setup creates`.

### Step 3: Update registry.yaml role_fit

For each model in the registry, update the `role_fit` list to match agents actually using that model:

```bash
# For each model in registry
for model in deepseek-v4-pro deepseek-v4-flash glm-5.1 minimax-m2.7; do
  agents=$(grep -l "model: ${model}" .pi/agents/*.md .pi/agents/board/*.md 2>/dev/null | xargs -I{} basename {} .md | tr '\n' ',' | sed 's/,$//')
  echo "$model → [$agents]"
done
```

Update the `role_fit:` line for each model entry.

### Step 4: Verify Consistency

Run these consistency checks. Report any mismatches.

```bash
# README count vs actual
echo "README agents count:"
grep '## Agents' README.md | grep -oE '[0-9]+' | head -1
echo "Actual: $TOTAL_AGENTS"

echo "README skills count:"
grep '## Agent Skills' README.md | grep -oE '[0-9]+'
echo "Actual: $SKILLS"

echo "README extensions count:"
grep '## Extensions' README.md | grep -oE '[0-9]+'
echo "Actual: $EXTENSIONS"

echo "README scripts count:"
grep 'scripts.*hard-enforcement' README.md | grep -oE '[0-9]+'
echo "Actual: $SCRIPTS"

# Model distribution consistency
echo "Models in agent files:"
grep '^model:' .pi/agents/*.md .pi/agents/board/*.md | awk -F: '{print $3}' | sort | uniq -c | sort -rn

echo "Models in README agent table:"
grep -oE 'DeepSeek V4 Pro|DeepSeek V4 Flash|GLM-5|MiniMax-M2.7|Straico' README.md | sort | uniq -c | sort -rn
```

### Step 5: Update AGENTS.md (if needed)

Check if AGENTS.md references specific counts or agent lists that need updating. Key sections:

- Specialist agents table
- Team orchestration table
- Validation team workers list
- Available skills list (if present)

Only update if the actual state differs from what's documented.

### Step 6: Git Commit + Push

```bash
git add -A
git commit -m "docs: sync all documentation with actual state

Agents: {TOTAL} ({CORE} core + {BOARD} board)
Extensions: {EXTENSIONS}
Skills: {SKILLS}
Prompts: {PROMPTS}
Scripts: {SCRIPTS}
Tests: {TESTS}

Model distribution:
{model distribution output}

Generated by sync-docs skill."
git push
```

### Step 7: Sync Target Projects

If target projects are known (from config or prior syncs), run:

```bash
# For each target project
./scripts/update.sh --local "$REPO_ROOT" --target /path/to/target/project
```

Common targets (check with user if not in config):
- ~/Projects/active/agent0/usr/projects/ivi (if included)
- ~/Projects/sela-clean
- ~/Projects/prompt-spaghetti
- ~/Projects/content-bank
- ~/Projects/PKM
- Other projects with pi_launchpad installed

Ask the user: "Sync target projects too? Which ones?"

## Output Format

When done, print a summary:

```
SYNC COMPLETE
═════════════

Agents:      {TOTAL} ({CORE} core + {BOARD} board)
Extensions:  {EXTENSIONS}
Skills:      {SKILLS}
Prompts:     {PROMPTS}
Scripts:     {SCRIPTS}
Tests:       {TESTS}

Model distribution:
  DeepSeek V4 Flash:  {N} agents
  DeepSeek V4 Pro:    {N} agents
  MiniMax-M2.7:       {N} agents
  GLM-5.1:            {N} agents
  Straico/Sonar:      {N} agents

README updated:       ✓
AGENTS.md updated:    ✓ (or "no changes needed")
Registry updated:     ✓
Committed + pushed:   {hash}
Target projects:      {synced list or "skipped"}
```

## Rules

1. **Always scan first, then update.** Never trust what's already written.
2. **Use edit tool for targeted changes.** Don't rewrite the entire README — find the exact section and replace only what changed.
3. **Preserve markdown formatting.** Tables, headers, bold, code blocks — keep the style consistent.
4. **Don't change meaning.** If a description is accurate, keep it. Only update counts, model assignments, and lists.
5. **Don't add filler.** If a new skill has no description in SKILL.md, write one line from its triggers, not a paragraph.
6. **Commit once.** All doc changes in a single commit, then push.
