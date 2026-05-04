# Log a Pattern from Session

## Context
Capture a learning pattern from a session. This is called when gates fail, issues are found, or patterns are detected.

## Input
User provides:
- Pattern key (slug, e.g., "missing-returns-validator")
- Symptom (what went wrong)
- Root cause (why it happened)
- Fix (what was done)
- Impact (high/medium/low)
- Applies to (which agents, e.g., "implementer, reviewer")

## Steps

### 1. Parse Input

Extract from user's command:
```bash
/learnings log "missing-returns" \
  --symptom "tsc error on Convex function" \
  --cause "Function defined without returns validator" \
  --fix "Added returns: v.null()" \
  --impact high \
  --applies-to implementer,reviewer
```

Or accept natural language and extract details.

### 2. Generate Pattern Key

If not provided, generate from symptom:
- Lowercase
- Replace spaces with hyphens
- Remove special chars
- Max 50 chars

Example: "Missing returns validator" → "missing-returns-validator"

### 3. Check if Pattern Exists

Read `.pi/learnings/catalog.yaml`:

```bash
# Check if pattern_key already exists
grep "pattern_key: \"${PATTERN_KEY}\"" .pi/learnings/catalog.yaml
```

**If exists:**
- Increment `occurrences`
- Update `last_seen` date
- Add to evidence section
- Check if hits promotion threshold

**If new:**
- Create new pattern entry
- Set `occurrences: 1`
- Set `status: pending`
- Create pattern file

### 4. Create/Update Pattern File

**If new pattern**, create `.pi/learnings/patterns/${PATTERN_KEY}.md`:

```markdown
---
pattern_key: "${PATTERN_KEY}"
occurrences: 1
status: pending
impact: ${IMPACT}
applies_to: [agent:${AGENT1}, agent:${AGENT2}]
created: $(date -I)
last_seen: $(date -I)
---

# Pattern: ${TITLE}

**Symptom:** ${SYMPTOM}
**Root Cause:** ${ROOT_CAUSE}
**Impact:** ${IMPACT}

## Evidence
- Session $(date -I): ${DESCRIPTION}

## Agent Instruction Injection

### For: agent:${AGENT1}
**Location:** "## [Section to modify]"
**Insert After:** [Where to insert]
**Content:**
```markdown
[Instruction to add]
```

## Verification
[How to verify this pattern is followed]
```

**If existing pattern**, append to evidence:

```markdown
## Evidence
- Session 2026-03-15: Original occurrence
- Session 2026-03-17: [New occurrence]  ← ADD THIS
```

And update frontmatter:
```yaml
occurrences: 2  # Increment
last_seen: 2026-03-17  # Update
```

### 5. Update Catalog

**If new pattern:**

Add to `patterns` array in `.pi/learnings/catalog.yaml`:

```yaml
patterns:
  - pattern_key: "missing-returns-validator"
    occurrences: 1
    status: pending
    impact: high
    applies_to: [agent:implementer, agent:reviewer]
    source: .pi/learnings/patterns/missing-returns-validator.md
    created: 2026-03-17
    last_seen: 2026-03-17
    applied: false
```

**If existing pattern:**

Update the entry:
```yaml
patterns:
  - pattern_key: "missing-returns-validator"
    occurrences: 2  # Increment
    status: pending  # May change to promoted
    # ... other fields ...
    last_seen: 2026-03-17  # Update
```

### 6. Check for Auto-Promotion

Read `promotion_threshold` from catalog (default: 3).

If `occurrences >= promotion_threshold`:
1. Change `status: pending` → `status: promoted`
2. Notify user: "🎉 Pattern auto-promoted! Ready to apply."

### 7. Commit Changes

```bash
git add .pi/learnings/
git commit -m "$(cat <<'EOF'
chore(learnings): log pattern ${PATTERN_KEY}

Occurrences: ${OCCURRENCES}
Status: ${STATUS}
Impact: ${IMPACT}

${SYMPTOM}

This pattern affects: ${APPLIES_TO}

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

### 8. Report to User

```
✅ Pattern logged: ${PATTERN_KEY}

Status: ${STATUS}
Occurrences: ${OCCURRENCES}/${THRESHOLD}
Impact: ${IMPACT}
Applies to: ${AGENTS}

${IF_PROMOTED}
🎉 Pattern promoted! Ready to apply with:
   /learnings apply ${PATTERN_KEY}
${END_IF}
```

## Example Workflow

**First occurrence:**
```bash
/learnings log "missing-returns" \
  --symptom "tsc: function has no return type" \
  --fix "Added returns: v.null()" \
  --applies-to implementer,reviewer

# Output:
✅ Pattern logged: missing-returns
Status: pending
Occurrences: 1/3
Impact: high
Applies to: implementer, reviewer

Pattern file created: .pi/learnings/patterns/missing-returns.md
Catalog updated.
```

**Second occurrence:**
```bash
/learnings log "missing-returns"

# Output:
✅ Pattern updated: missing-returns
Status: pending
Occurrences: 2/3
Impact: high

One more occurrence will auto-promote this pattern.
```

**Third occurrence (auto-promotes):**
```bash
/learnings log "missing-returns"

# Output:
✅ Pattern updated: missing-returns
Status: promoted 🎉
Occurrences: 3/3
Impact: high

Pattern auto-promoted! Ready to apply with:
  /learnings apply missing-returns
```

## Handling Natural Language

If user says:
```
"We keep forgetting to add returns validators on Convex functions.
This happened again in the implementer. The fix was adding returns: v.null()."
```

**Extract:**
- Pattern key: "missing-returns-validators"
- Symptom: "Forgot to add returns validators"
- Applies to: "implementer"
- Fix: "Added returns: v.null()"
- Impact: (ask user or infer from context)

## Shorthand

If user just provides key and minimal context:

```bash
/learnings log "missing-returns"
```

**Agent prompts for missing fields:**
```
What was the symptom? (what went wrong)
What agents does this affect? (e.g., implementer, reviewer)
Impact level? (high/medium/low)
```

## Error Handling

**Invalid pattern key:**
```
Error: Pattern key must be lowercase, alphanumeric with hyphens only.
Examples: missing-returns, forgot-auth, no-team-scope
```

**No applies_to:**
```
Error: Must specify which agents this pattern affects.
Use --applies-to implementer,reviewer
```

**Unknown agent:**
```
Warning: Agent 'xyz' not found in .pi/agents/
Valid agents: [list from directory scan]
```
