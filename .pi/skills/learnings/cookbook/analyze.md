# Analyze Pattern Effectiveness

## Context
Measure whether an applied pattern actually improved outcomes. Did it reduce gate failures? Did it prevent the issue? Should it be kept or retired?

## Input
- Pattern key (e.g., "missing-returns-validator")
- Optional time window (e.g., "last 30 days", "since 2026-03-01")

## Steps

### 1. Verify Pattern is Applied

```bash
PATTERN_KEY="$1"
CATALOG=".pi/learnings/catalog.yaml"
PATTERN_FILE=".pi/learnings/patterns/${PATTERN_KEY}.md"

# Check if pattern exists and is applied
if ! grep -q "pattern_key: \"${PATTERN_KEY}\"" "$CATALOG"; then
  echo "Error: Pattern not found in catalog"
  exit 1
fi

# Extract applied status
APPLIED=$(grep -A 10 "pattern_key: \"${PATTERN_KEY}\"" "$CATALOG" | grep "applied:" | awk '{print $2}')

if [ "$APPLIED" != "true" ]; then
  echo "Error: Pattern must be applied before analyzing effectiveness"
  echo "Current status: pending or promoted"
  echo "Apply first with: /learnings apply ${PATTERN_KEY}"
  exit 1
fi
```

### 2. Extract Pattern Metadata

From pattern file frontmatter:
```yaml
---
pattern_key: "missing-returns-validator"
applied: true
applied_date: "2026-03-15"
impact: high
symptom: "tsc error: function has no return type"
---
```

From pattern body, extract:
- **Symptom**: What went wrong before
- **Fix**: What the pattern enforces
- **Verification**: How to check compliance

### 3. Define Measurement Window

**Default: Since applied_date**
```bash
APPLIED_DATE="2026-03-15"
TODAY="2026-03-17"
WINDOW="since $APPLIED_DATE"
```

**Custom window:**
```bash
/learnings analyze missing-returns --since 2026-03-10

# Or relative:
/learnings analyze missing-returns --last-30-days
```

### 4. Collect Evidence

**Before application (historical):**
- Count occurrences before `applied_date`
- Pattern file evidence section shows this

**After application:**
- Search git commits for symptom keywords
- Search issue tracker (if exists)
- Check test failures
- Check gate failures

**Example searches:**
```bash
# Search commits for symptom
git log --since="$APPLIED_DATE" --grep="return type" --oneline

# Search for related test failures
git log --since="$APPLIED_DATE" --grep="returns validator" --oneline

# Check if pattern still being logged
grep "missing-returns-validator" .pi/learnings/catalog.yaml | grep "last_seen"
```

### 5. Calculate Metrics

**Occurrence rate:**
```
Before: 3 occurrences in 10 days = 0.3/day
After:  0 occurrences in 2 days = 0.0/day
Change: -100%
```

**Gate impact:**
```
Before: 5 gate failures related to missing validators
After:  0 gate failures related to missing validators
Change: -100%
```

**Compliance rate:**
```
Sample 10 recent Convex functions:
- All 10 have returns validators
Compliance: 100%
```

### 6. Determine Effectiveness

**Effective (keep):**
- Occurrences dropped to 0 or near 0
- Gates stopped failing for this reason
- Compliance is high (80%+)
- Pattern is being followed

**Ineffective (consider retiring):**
- Occurrences unchanged or increased
- Gates still failing for same reason
- Compliance is low (<50%)
- Pattern is being ignored

**Needs adjustment (modify):**
- Some improvement but not enough
- Compliance is moderate (50-80%)
- Pattern needs clearer instructions
- Injection location is wrong

### 7. Generate Report

```
Pattern Effectiveness Analysis: missing-returns-validator
==========================================================

Applied: 2026-03-15 (2 days ago)
Impact: high
Symptom: tsc error: function has no return type

Metrics:
--------
Occurrence Rate:
  Before: 3 occurrences in 10 days (0.3/day)
  After:  0 occurrences in 2 days (0.0/day)
  Change: -100% ✅

Gate Failures:
  Before: 5 failures related to missing validators
  After:  0 failures related to missing validators
  Change: -100% ✅

Compliance Check (sampled 10 recent functions):
  Functions with returns validator: 10/10 (100%) ✅

Agent Behavior:
  implementer.md: Following pattern
  reviewer.md: Catching violations in review

Conclusion: EFFECTIVE ✅
-----------------------
This pattern successfully eliminated the issue.
Occurrences dropped to zero and compliance is 100%.

Recommendation: KEEP
```

### 8. Update Pattern File

Add effectiveness analysis section:

```markdown
## Effectiveness Analysis

### Analysis 2026-03-17 (2 days after application)

**Metrics:**
- Occurrence rate: -100% (3 → 0)
- Gate failures: -100% (5 → 0)
- Compliance: 100% (10/10 functions)

**Status:** EFFECTIVE ✅
**Recommendation:** Keep

**Notes:**
Pattern completely eliminated the issue. All new Convex functions now include returns validators. No gate failures since application.

---
```

### 9. Commit Analysis

```bash
git add .pi/learnings/patterns/${PATTERN_KEY}.md
git commit -m "$(cat <<'EOF'
chore(learnings): effectiveness analysis for ${PATTERN_KEY}

Status: EFFECTIVE
Occurrence rate: ${BEFORE} → ${AFTER} (${CHANGE}%)
Compliance: ${COMPLIANCE}%

Recommendation: KEEP

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

## Example Analyses

### Effective Pattern

```
Pattern: missing-returns-validator
Applied: 2026-03-15

Before application:
  - 3 occurrences in 10 days
  - 5 gate failures
  - Compliance: unknown (not enforced)

After application (2 days):
  - 0 occurrences
  - 0 gate failures
  - Compliance: 100% (10/10 sampled)

Conclusion: EFFECTIVE ✅
Recommendation: KEEP
```

### Ineffective Pattern

```
Pattern: forgot-logging
Applied: 2026-03-01

Before application:
  - 5 occurrences in 20 days
  - 3 gate failures

After application (17 days):
  - 6 occurrences in 17 days (rate increased!)
  - 4 gate failures
  - Compliance: 30% (3/10 sampled)

Conclusion: INEFFECTIVE ❌
Recommendation: RETIRE

Reason: Pattern is being ignored. Agents are not following the rule.
Possible issues:
  - Injection location unclear
  - Rule too vague
  - Conflicting with another pattern
```

### Needs Adjustment

```
Pattern: no-inline-styles
Applied: 2026-03-10

Before application:
  - 8 occurrences in 15 days
  - 10 gate failures

After application (7 days):
  - 3 occurrences in 7 days (rate improved 50%)
  - 4 gate failures (improved 60%)
  - Compliance: 70% (7/10 sampled)

Conclusion: PARTIALLY EFFECTIVE ⚠️
Recommendation: ADJUST

Improvement seen but not enough. Pattern needs stronger enforcement.
Consider:
  - Move to "Rules - non-negotiable" section
  - Add to reviewer checklist
  - Make gate failure explicit
```

## Automated Analysis

**Periodic checks:**
```bash
# Run weekly analysis on all applied patterns
/learnings analyze --all --weekly-report

# Output:
Weekly Learning Effectiveness Report (2026-03-17)
==================================================

Effective Patterns (3):
  ✅ missing-returns-validator (-100% occurrences)
  ✅ always-use-auth (-95% occurrences)
  ✅ no-any-types (-90% occurrences)

Needs Review (1):
  ⚠️  forgot-logging (only -50% occurrences)

Ineffective Patterns (1):
  ❌ old-pattern (+20% occurrences, consider retiring)
```

## Integration with Retirement

If analysis shows pattern is ineffective:

```bash
# Automatically trigger retirement consideration
/learnings analyze missing-logging

# Output:
❌ Pattern is INEFFECTIVE
Occurrences increased after application.

Recommend retiring with:
  /learnings retire missing-logging --reason "Pattern not followed by agents"
```

## Metrics to Track

### Quantitative
- Occurrence rate (before vs after)
- Gate failure rate
- Compliance rate (% of code following pattern)
- Time to first violation after application

### Qualitative
- Agent feedback (are they following it?)
- Reviewer feedback (is it helpful?)
- Developer feedback (is it clear?)

## Error Handling

**Pattern not applied:**
```
Error: Cannot analyze 'xyz' - pattern not applied yet.

Current status: promoted
Apply first with: /learnings apply xyz
Then wait for data: recommend analyzing 7+ days after application
```

**Too soon:**
```
Warning: Pattern applied 1 day ago.
Recommendation: Wait at least 7 days for meaningful data.

Continue analysis anyway? (y/n)
```

**No data found:**
```
Warning: No occurrences found before or after application.

Possible reasons:
- Pattern addresses rare issue
- Insufficient historical data
- Pattern key changed

Manual verification needed.
```
