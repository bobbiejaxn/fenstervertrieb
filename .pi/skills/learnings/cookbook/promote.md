# Manually Promote a Pattern

## Context
Force-promote a pattern from `pending` to `promoted` status before it reaches the auto-promotion threshold. Use when you're confident a pattern is valid even with fewer occurrences.

## Input
- Pattern key (e.g., "missing-returns-validator")
- Optional reason for early promotion

## Steps

### 1. Verify Pattern Exists

```bash
PATTERN_KEY="$1"
CATALOG=".pi/learnings/catalog.yaml"
PATTERN_FILE=".pi/learnings/patterns/${PATTERN_KEY}.md"

if [ ! -f "$PATTERN_FILE" ]; then
  echo "Error: Pattern file not found: $PATTERN_FILE"
  echo "Run /learnings status to see available patterns."
  exit 1
fi
```

### 2. Check Current Status

Read pattern frontmatter:
```yaml
---
pattern_key: "missing-returns-validator"
occurrences: 2
status: pending
---
```

**Verify:**
- Status is `pending` (not already promoted or applied)
- Pattern has at least 1 occurrence

**If already promoted:**
```
Pattern 'missing-returns-validator' is already promoted.
Status: promoted
Occurrences: 3

Apply it with: /learnings apply missing-returns-validator
```

**If already applied:**
```
Pattern 'missing-returns-validator' is already applied.
Applied date: 2026-03-15
Modified agents: implementer.md, reviewer.md

To review: cat .pi/agents/implementer.md
```

### 3. Update Pattern File Frontmatter

Change `status: pending` → `status: promoted`:

```yaml
---
pattern_key: "missing-returns-validator"
occurrences: 2
status: promoted  # Changed from pending
impact: high
applies_to: [agent:implementer, agent:reviewer]
created: 2026-03-15
last_seen: 2026-03-17
promoted_manually: true  # Add this flag
promotion_reason: "Critical security issue, promoting early"  # Optional
---
```

### 4. Update Catalog

Find pattern entry in `.pi/learnings/catalog.yaml`:

```yaml
patterns:
  - pattern_key: "missing-returns-validator"
    occurrences: 2
    status: pending  # Change to promoted
    # ... rest of fields ...
```

Update to:

```yaml
patterns:
  - pattern_key: "missing-returns-validator"
    occurrences: 2
    status: promoted
    impact: high
    applies_to: [agent:implementer, agent:reviewer]
    source: .pi/learnings/patterns/missing-returns-validator.md
    created: 2026-03-15
    last_seen: 2026-03-17
    applied: false
    promoted_manually: true
    promotion_reason: "Critical security issue, promoting early"
```

### 5. Add Promotion Note to Pattern File

Append to pattern file:

```markdown
## Promotion History

- **Manual Promotion**: 2026-03-17
  - Reason: Critical security issue, promoting early
  - Occurrences at promotion: 2/3
  - Promoted by: learning-agent
```

### 6. Commit Changes

```bash
git add .pi/learnings/patterns/${PATTERN_KEY}.md .pi/learnings/catalog.yaml
git commit -m "$(cat <<'EOF'
chore(learnings): manually promote pattern ${PATTERN_KEY}

Promoted before auto-threshold (${OCCURRENCES}/${THRESHOLD})
Reason: ${PROMOTION_REASON}

Pattern ready to apply with:
  /learnings apply ${PATTERN_KEY}

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

### 7. Report to User

```
✅ Pattern promoted: missing-returns-validator

Status: pending → promoted
Occurrences: 2/3 (promoted early)
Reason: Critical security issue, promoting early

This pattern is now ready to apply:
  /learnings apply missing-returns-validator

Applies to:
  - implementer.md
  - reviewer.md
```

## Use Cases

### Critical Security Issue

```bash
/learnings promote missing-auth-check \
  --reason "Security vulnerability, needs immediate enforcement"

# Output:
✅ Pattern promoted: missing-auth-check
Reason: Security vulnerability, needs immediate enforcement
Occurrences: 1/3 (promoted early)

Apply immediately with:
  /learnings apply missing-auth-check
```

### High Confidence Pattern

```bash
/learnings promote forgot-team-scope \
  --reason "Clear pattern from architecture review"

# Output:
✅ Pattern promoted: forgot-team-scope
Reason: Clear pattern from architecture review
Occurrences: 2/3 (promoted early)
```

### No Reason Given

```bash
/learnings promote missing-types

# Prompts for reason:
Why promote this pattern early? (optional)
> Manual review confirmed this is a critical issue

✅ Pattern promoted: missing-types
Reason: Manual review confirmed this is a critical issue
Occurrences: 1/3 (promoted early)
```

## Validation Checklist

Before promoting, verify:
- [ ] Pattern is well-documented
- [ ] Agent injection instructions are clear
- [ ] Pattern applies to correct agents
- [ ] Impact level is accurate
- [ ] Evidence is specific and actionable
- [ ] Fix is validated (tested in at least one session)

## Anti-Patterns

**❌ Don't promote without validation:**
```bash
# Bad: Promoting unproven pattern
/learnings promote theoretical-issue

# Pattern has 0 occurrences and no evidence
# This should stay pending until actually seen
```

**❌ Don't promote vague patterns:**
```markdown
---
pattern_key: "bad-code"
symptom: "Code is bad"
fix: "Write better code"
---

# Too vague, needs specific details
```

**❌ Don't promote duplicate patterns:**
```bash
# Bad: Promoting when similar pattern exists
/learnings promote missing-returns-v2

# Check if 'missing-returns-validator' already covers this
```

## Error Handling

**Pattern not found:**
```
Error: Pattern 'xyz' not found.

Available patterns:
  - missing-returns-validator (pending, 2/3)
  - forgot-team-scope (pending, 1/3)
  - no-inline-styles (applied)

Run /learnings status to see all patterns.
```

**Already promoted:**
```
Pattern 'missing-returns-validator' is already promoted.

Next step: Apply it to agents
  /learnings apply missing-returns-validator
```

**No occurrences:**
```
Warning: Pattern 'theoretical-issue' has 0 occurrences.

Promotion requires at least 1 real-world occurrence with evidence.
Add evidence first with:
  /learnings log theoretical-issue
```

## Demotion

If a promoted pattern needs to be demoted back to pending:

```bash
# Not implemented yet, but could be added
/learnings demote <pattern-key> --reason "Need more validation"

# For now, manually edit:
# 1. Pattern file frontmatter: status: promoted → pending
# 2. Catalog entry: status: promoted → pending
# 3. Commit with reason
```

## Integration with Auto-Promotion

Manual promotion and auto-promotion can coexist:

```
Pattern lifecycle:
1. Log occurrence 1 → status: pending
2. Manual promotion → status: promoted (skip threshold)
3. Apply → status: applied

OR:

1. Log occurrence 1 → status: pending
2. Log occurrence 2 → status: pending
3. Log occurrence 3 → status: promoted (auto)
4. Apply → status: applied
```

Both paths lead to the same outcome, but manual promotion allows earlier enforcement when confidence is high.
