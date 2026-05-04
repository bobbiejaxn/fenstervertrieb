# Check Learning Catalog Status

## Context
Display the current state of the learning catalog - pending patterns, promoted patterns, applied patterns, and retired patterns.

## Input
Optional filters:
- `--pending`: Show only pending patterns
- `--promoted`: Show only promoted patterns
- `--applied`: Show only applied patterns
- `--retired`: Show only retired patterns
- `--pattern <key>`: Show specific pattern details

## Steps

### 1. Read Catalog

```bash
CATALOG=".pi/learnings/catalog.yaml"

if [ ! -f "$CATALOG" ]; then
  echo "Error: Catalog not found at $CATALOG"
  exit 1
fi
```

### 2. Parse Catalog Data

Extract from YAML:
- `promotion_threshold`: Number of occurrences needed for auto-promotion
- `patterns[]`: All pattern entries
- `applied[]`: Applied pattern history
- `retired[]`: Retired pattern history

For each pattern, extract:
- `pattern_key`
- `occurrences`
- `status` (pending, promoted, applied)
- `impact` (high, medium, low)
- `applies_to` (list of agents)
- `created`
- `last_seen`
- `applied` (boolean)
- `applied_date` (if applied)

### 3. Group by Status

**Pending patterns:**
- Status: pending
- Occurrences < promotion_threshold

**Promoted patterns (ready to apply):**
- Status: promoted
- Not yet applied

**Applied patterns:**
- Status: applied
- Or in `applied[]` array

**Retired patterns:**
- In `retired[]` array

### 4. Display Summary

```
Learning Catalog Status
=======================

Promotion Threshold: 3 occurrences

Pending Patterns (2):
  - missing-auth-check (2/3) [high] → implementer, reviewer
  - forgot-team-scope (1/3) [high] → architect, implementer

Promoted Patterns (1):
  🎉 missing-returns-validator (3/3) [high] → implementer, reviewer
     Ready to apply with: /learnings apply missing-returns-validator

Applied Patterns (2):
  ✅ no-inline-styles (applied 2026-03-15)
  ✅ always-use-auth (applied 2026-03-14)

Retired Patterns (1):
  🗑️  old-pattern (retired 2026-03-10)
     Reason: No longer relevant after architecture change

Total: 6 patterns
```

### 5. Display Pattern Details

If `--pattern <key>` specified:

```
Pattern: missing-returns-validator
===================================

Status: promoted
Occurrences: 3/3
Impact: high
Applies to: implementer, reviewer
Created: 2026-03-15
Last seen: 2026-03-17

Evidence:
  - Session 2026-03-15: Original occurrence
  - Session 2026-03-16: Second occurrence
  - Session 2026-03-17: Third occurrence (auto-promoted)

Next steps:
  Apply this pattern with: /learnings apply missing-returns-validator
```

### 6. Filtered Views

**Show only pending:**
```bash
/learnings status --pending

Pending Patterns (2):
  - missing-auth-check (2/3) [high] → implementer, reviewer
    Last seen: 2026-03-17
    One more occurrence will auto-promote.

  - forgot-team-scope (1/3) [high] → architect, implementer
    Last seen: 2026-03-16
    Two more occurrences needed for promotion.
```

**Show only promoted:**
```bash
/learnings status --promoted

Promoted Patterns (1):
  🎉 missing-returns-validator (3/3) [high]
     Applies to: implementer, reviewer
     Ready to apply with: /learnings apply missing-returns-validator
```

**Show only applied:**
```bash
/learnings status --applied

Applied Patterns (2):
  ✅ no-inline-styles
     Applied: 2026-03-15
     Modified: implementer.md, frontend-design-agent.md

  ✅ always-use-auth
     Applied: 2026-03-14
     Modified: implementer.md, reviewer.md, architect.md
```

## Example Outputs

### Healthy System
```
Learning Catalog Status
=======================

Promotion Threshold: 3 occurrences

Pending Patterns (2):
  - forgot-error-handling (1/3) [medium] → implementer
  - missing-logging (2/3) [low] → implementer, debugger

Promoted Patterns (0):
  No patterns ready for application.

Applied Patterns (5):
  ✅ missing-returns-validator (applied 2026-03-17)
  ✅ no-inline-styles (applied 2026-03-15)
  ✅ always-use-auth (applied 2026-03-14)
  ✅ forgot-team-scope (applied 2026-03-12)
  ✅ no-any-types (applied 2026-03-10)

Total: 7 patterns
System is healthy. 5 patterns applied, 2 pending observation.
```

### Needs Attention
```
Learning Catalog Status
=======================

Promotion Threshold: 3 occurrences

Pending Patterns (5):
  - missing-returns (2/3) [high] → implementer, reviewer
  - forgot-auth (2/3) [high] → implementer
  - no-team-scope (2/3) [high] → architect
  - missing-types (1/3) [medium] → implementer
  - forgot-tests (1/3) [medium] → implementer

Promoted Patterns (3):
  🎉 missing-error-handling (3/3) [high] → implementer
  🎉 no-validation (3/3) [high] → implementer, reviewer
  🎉 forgot-logging (3/3) [medium] → implementer

Applied Patterns (1):
  ✅ no-inline-styles (applied 2026-03-15)

Total: 9 patterns

⚠️  3 promoted patterns ready to apply!
    Run /learnings apply <pattern-key> to fix these issues.
```

## Integration with Session

**Session start:**
```bash
/learnings status --promoted

# If promoted patterns exist:
⚠️  Warning: 2 promoted patterns not yet applied
    - missing-returns-validator
    - forgot-auth-check

Apply them with: /learnings apply <pattern-key>
```

## Error Handling

**Empty catalog:**
```
Learning Catalog Status
=======================

No patterns logged yet.

Start logging patterns with:
  /learnings log <pattern-key> --symptom "..." --fix "..."
```

**Pattern not found:**
```
Error: Pattern 'xyz' not found in catalog.

Available patterns:
  - missing-returns-validator
  - forgot-team-scope
  - no-inline-styles
```

## Output Format Options

**JSON output (for scripting):**
```bash
/learnings status --json

{
  "promotion_threshold": 3,
  "pending": [...],
  "promoted": [...],
  "applied": [...],
  "retired": [...],
  "summary": {
    "total": 7,
    "pending_count": 2,
    "promoted_count": 1,
    "applied_count": 4,
    "retired_count": 0
  }
}
```

**Compact format:**
```bash
/learnings status --compact

7 patterns: 2 pending, 1 promoted, 4 applied, 0 retired
```
