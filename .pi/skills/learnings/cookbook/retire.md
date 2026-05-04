# Retire an Ineffective Pattern

## Context
Remove a pattern that is ineffective, no longer relevant, or causing problems. Retiring a pattern:
- Removes it from agent definitions
- Moves it to `retired` section in catalog
- Preserves historical record
- Allows re-activation if needed

## Input
- Pattern key (e.g., "old-pattern")
- Retirement reason (required)

## Steps

### 1. Verify Pattern Exists and is Applied

```bash
PATTERN_KEY="$1"
REASON="$2"
CATALOG=".pi/learnings/catalog.yaml"
PATTERN_FILE=".pi/learnings/patterns/${PATTERN_KEY}.md"

if [ ! -f "$PATTERN_FILE" ]; then
  echo "Error: Pattern not found: $PATTERN_FILE"
  exit 1
fi

# Check if applied
APPLIED=$(grep -A 10 "pattern_key: \"${PATTERN_KEY}\"" "$CATALOG" | grep "applied:" | awk '{print $2}')

if [ "$APPLIED" != "true" ]; then
  echo "Warning: Pattern not applied yet."
  echo "You can retire pending/promoted patterns without removing from agents."
  echo ""
  echo "Continue retirement? (y/n)"
  # If yes, skip agent removal step
fi
```

### 2. Validate Retirement Reason

**Require explicit reason:**
```bash
if [ -z "$REASON" ]; then
  echo "Error: Retirement reason required."
  echo ""
  echo "Usage: /learnings retire <pattern-key> --reason \"explanation\""
  echo ""
  echo "Valid reasons:"
  echo "  - Pattern not followed by agents (ineffective)"
  echo "  - Architecture change made pattern obsolete"
  echo "  - Pattern caused unexpected side effects"
  echo "  - Pattern conflicts with another pattern"
  echo "  - Issue resolved at framework level"
  exit 1
fi
```

### 3. Remove from Agent Definitions

**Only if pattern was applied:**

For each agent in `applies_to`:

**a. Read pattern file to find injection instructions:**
```markdown
### For: agent:implementer
**Location:** "## Rules — non-negotiable"
**Content:**
- **Always `returns` validator**: Every Convex function must have explicit `returns` validator
```

**b. Find and remove the injected content:**
```bash
AGENT_FILE=".pi/agents/implementer.md"

# Search for the exact content
CONTENT="- **Always \`returns\` validator**: Every Convex function must have explicit \`returns\` validator"

# Remove line (use sed or edit tool)
# Verify removal by checking file
```

**c. Verify removal:**
- Content is gone
- File is still valid markdown
- No broken references

### 4. Update Pattern File

Add retirement metadata to frontmatter:

```yaml
---
pattern_key: "old-pattern"
occurrences: 5
status: retired  # Changed from applied
impact: high
applies_to: [agent:implementer, agent:reviewer]
created: 2026-03-10
last_seen: 2026-03-15
applied: true
applied_date: 2026-03-12
retired: true
retired_date: 2026-03-17
retirement_reason: "Pattern not followed by agents, ineffective"
---
```

Add retirement section to pattern body:

```markdown
## Retirement

**Date:** 2026-03-17
**Reason:** Pattern not followed by agents, ineffective

**Effectiveness Analysis:**
- Applied: 2026-03-12
- Analyzed: 2026-03-17 (5 days)
- Occurrence rate: Increased from 0.3/day to 0.5/day
- Compliance: 30% (3/10 sampled functions)

**Conclusion:**
Pattern was not effective. Agents ignored the rule despite injection into definitions. Issue may require different approach or stronger enforcement mechanism.

**Removed from agents:**
- implementer.md
- reviewer.md
```

### 5. Update Catalog

**Remove from `patterns` array:**
```yaml
patterns:
  - pattern_key: "missing-returns-validator"
    # ... keep this one ...

  # Remove old-pattern entry
```

**Remove from `applied` array (if present):**
```yaml
applied:
  # Remove old-pattern entry
```

**Add to `retired` array:**
```yaml
retired:
  - pattern_key: "old-pattern"
    retired_date: 2026-03-17
    retirement_reason: "Pattern not followed by agents, ineffective"
    was_applied: true
    applied_duration: "5 days (2026-03-12 to 2026-03-17)"
    final_status: "ineffective"
    agents_modified: [implementer.md, reviewer.md]
```

### 6. Commit Changes

```bash
git add .pi/agents/*.md .pi/learnings/patterns/${PATTERN_KEY}.md .pi/learnings/catalog.yaml
git commit -m "$(cat <<'EOF'
chore(learnings): retire pattern ${PATTERN_KEY}

Reason: ${REASON}

Removed from agents:
${AGENTS_LIST}

This pattern was ineffective and has been retired.
Historical record preserved in catalog.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

### 7. Report to User

```
✅ Retired pattern: old-pattern

Reason: Pattern not followed by agents, ineffective
Applied: 2026-03-12 to 2026-03-17 (5 days)

Removed from agents:
  - implementer.md
  - reviewer.md

Pattern moved to retired section in catalog.
Historical record preserved for future reference.

If this issue resurfaces, consider:
  - Different enforcement mechanism
  - Clearer instructions
  - Alternative approach
```

## Retirement Scenarios

### Ineffective Pattern

```bash
/learnings retire forgot-logging \
  --reason "Pattern not followed by agents, ineffective"

# Effectiveness analysis showed:
# - Compliance: 30%
# - Occurrences increased after application
# - Agents are ignoring the rule

✅ Retired: forgot-logging
Reason: Pattern not followed by agents

Next steps:
- Consider why pattern was ineffective
- May need different approach
- Monitor if issue resurfaces
```

### Architecture Change

```bash
/learnings retire manual-auth-check \
  --reason "Framework now handles auth automatically"

# Architecture changed, pattern no longer needed
# Not ineffective, just obsolete

✅ Retired: manual-auth-check
Reason: Framework now handles auth automatically

Pattern was effective but no longer necessary.
```

### Pattern Conflict

```bash
/learnings retire verbose-logging \
  --reason "Conflicts with new minimal-logging pattern"

# Two patterns can't coexist
# Retire older one

✅ Retired: verbose-logging
Reason: Conflicts with new minimal-logging pattern

Newer pattern takes precedence.
```

### Framework Resolution

```bash
/learnings retire missing-returns-check \
  --reason "Convex v1.5 now enforces returns validators at build time"

# Framework update solved the problem
# Pattern no longer needed

✅ Retired: missing-returns-check
Reason: Convex v1.5 now enforces returns validators at build time

Issue resolved at framework level.
```

## Retire vs Remove

**Retire** (recommended):
- Moves to `retired` section
- Preserves history
- Can be re-activated
- Shows what was tried
- Learns from failures

**Remove** (not recommended):
- Deletes pattern file
- Loses historical context
- Can't analyze why it failed
- No institutional memory

**Always retire, never remove.**

## Re-activation

If a retired pattern becomes relevant again:

```bash
/learnings reactivate old-pattern \
  --reason "Issue resurface after framework downgrade"

# Process:
# 1. Move from retired to patterns
# 2. Change status: retired → pending
# 3. Update frontmatter
# 4. Can log new occurrences
# 5. Can promote and apply again

✅ Reactivated: old-pattern
Status: pending
Occurrences: 0 (reset)

Pattern is now active for logging.
Log occurrences with: /learnings log old-pattern
```

## Error Handling

**Pattern not found:**
```
Error: Pattern 'xyz' not found in catalog.

Available patterns:
  - missing-returns-validator (applied)
  - forgot-team-scope (promoted)
  - no-inline-styles (pending)

Run /learnings status to see all patterns.
```

**No retirement reason:**
```
Error: Retirement reason required.

Usage: /learnings retire <pattern-key> --reason "explanation"

Common reasons:
  - Pattern not followed by agents (ineffective)
  - Architecture change made pattern obsolete
  - Pattern caused unexpected side effects
  - Issue resolved at framework level
```

**Already retired:**
```
Pattern 'old-pattern' is already retired.

Retired: 2026-03-15
Reason: Pattern not followed by agents

To view details: /learnings status --pattern old-pattern
To reactivate: /learnings reactivate old-pattern
```

## Retirement Analysis

**After retiring, document lessons:**

```markdown
## Lessons Learned

**Why pattern failed:**
- Instructions were too vague
- Injection location was wrong (not visible enough)
- Conflicted with existing habits
- Required too much manual work

**What would work better:**
- Automated enforcement via linter
- Pre-commit hook
- IDE extension
- Framework-level solution

**Future considerations:**
- Don't inject vague rules
- Test compliance before applying
- Start with small scope
- Get agent feedback
```

## Batch Retirement

```bash
# Retire multiple patterns at once
/learnings retire old-pattern-1 old-pattern-2 \
  --reason "Architecture refactor made these obsolete"

✅ Retired 2 patterns:
  - old-pattern-1
  - old-pattern-2

Reason: Architecture refactor made these obsolete
```

## Integration with Analysis

Retirement often follows effectiveness analysis:

```
/learnings analyze old-pattern
# → Shows pattern is ineffective

❌ Pattern is INEFFECTIVE
Recommendation: RETIRE

/learnings retire old-pattern \
  --reason "Analysis showed ineffective (compliance: 30%)"

✅ Retired based on effectiveness analysis
```
