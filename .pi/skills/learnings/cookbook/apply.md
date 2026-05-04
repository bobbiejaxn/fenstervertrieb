# Apply a Pattern to Agent Definitions

## Context
Take a promoted pattern and inject its instructions into the relevant agent definition files. This closes the learning loop.

## Input
- Pattern key (e.g., "missing-returns-validator")

## Steps

### 1. Read the Pattern File

```bash
PATTERN_KEY="$1"
PATTERN_FILE=".pi/learnings/patterns/${PATTERN_KEY}.md"

if [ ! -f "$PATTERN_FILE" ]; then
  echo "Error: Pattern file not found: $PATTERN_FILE"
  exit 1
fi
```

Read the entire pattern file to extract:
- **applies_to**: List of agents (e.g., `[agent:implementer, agent:reviewer]`)
- **Agent Instruction Injection** sections for each agent

### 2. Parse applies_to

Extract the list of agents from the frontmatter:

```yaml
applies_to: [agent:implementer, agent:reviewer]
```

Parse into individual agent names:
- `agent:implementer` → `implementer`
- `agent:reviewer` → `reviewer`

### 3. For Each Agent: Extract Injection Instructions

Find sections like:

```markdown
### For: agent:implementer
**Location:** "## Rules — non-negotiable"
**Insert After:** Last rule
**Content:**
```markdown
- **New Rule**: Description
```
```

Extract:
- **Agent name**: implementer
- **Location**: Section header to find
- **Insert After**: Where to insert (can be "Last rule", "Before X", specific line)
- **Content**: The actual markdown to inject

### 4. Modify Each Agent File

For each agent in `applies_to`:

**a. Read the agent file:**
```bash
AGENT_FILE=".pi/agents/${agent}.md"
```

**b. Find the location section:**
Search for the section header (e.g., `## Rules — non-negotiable`)

**c. Determine insert point:**
- If "Last rule": Find last list item (`- `) before next section
- If "Before X": Find line containing X
- If specific line: Use that line number

**d. Check if already applied:**
Search the section for the content text. If found, skip (already applied).

**e. Insert the content:**
```bash
# Use sed or awk to insert at the determined line
# Insert with proper indentation matching the section
```

**f. Verify:**
- Content was inserted
- File is still valid markdown
- No duplicate insertions

### 5. Update Catalog

Read `.pi/learnings/catalog.yaml`, find the pattern entry, update:

```yaml
patterns:
  - pattern_key: "missing-returns-validator"
    # ... existing fields ...
    applied: true
    applied_date: "2026-03-17"
```

Add to `applied` section:

```yaml
applied:
  - pattern_key: "missing-returns-validator"
    applied_date: "2026-03-17"
    agents_modified: [implementer.md, reviewer.md]
```

### 6. Commit Changes

```bash
git add .pi/agents/*.md .pi/learnings/catalog.yaml
git commit -m "$(cat <<'EOF'
chore(learnings): apply pattern ${PATTERN_KEY}

Applied learning pattern to agent definitions:
- Modified agents: [list]
- Pattern: ${PATTERN_KEY}
- Impact: [high/medium/low]

This pattern occurred [N] times and has been promoted to active enforcement.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

### 7. Verify and Report

**Check:**
- All target agents were modified
- Content appears in correct locations
- Git commit succeeded
- Catalog updated

**Report to user:**
```
✅ Applied pattern: ${PATTERN_KEY}

Modified agents:
  - implementer.md
  - reviewer.md

Changes committed: [commit hash]

This pattern will now be enforced in future sessions.
```

## Example

Given pattern file `.pi/learnings/patterns/missing-returns.md`:

```markdown
---
pattern_key: "missing-returns"
applies_to: [agent:implementer]
---

# Pattern: Missing Returns Validator

## Agent Instruction Injection

### For: agent:implementer
**Location:** "## Rules — non-negotiable"
**Insert After:** Last rule
**Content:**
```markdown
- **Always `returns` validator**: Every Convex function must have explicit `returns` validator
```
```

**Process:**
1. Read pattern file
2. Extract `applies_to: [agent:implementer]`
3. Parse injection for implementer
4. Open `.pi/agents/implementer.md`
5. Find `## Rules — non-negotiable`
6. Find last list item in that section
7. Insert new rule after it
8. Update catalog
9. Commit changes

**Result:**
```markdown
## Rules — non-negotiable

- **Zero `any` types** — use proper types
- **No inline styles** — Tailwind only
- **Always `returns` validator**: Every Convex function must have explicit `returns` validator  ← NEW
```

## Error Handling

**Pattern not found:**
```
Error: Pattern 'xyz' not found in catalog.
Run /learnings status to see available patterns.
```

**Pattern not promoted:**
```
Error: Pattern 'xyz' has status 'pending' (occurrences: 2/3).
Wait for auto-promotion or use /learnings promote xyz to force.
```

**Already applied:**
```
Pattern 'xyz' already applied on 2026-03-15.
Content already present in target agents.
Skipping application.
```

**Agent file not found:**
```
Error: Agent 'implementer.md' not found in .pi/agents/
Check applies_to list in pattern.
```
