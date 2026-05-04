# Customize Central Pattern for Local Project

## Context
Fork a pattern from central repository to create a project-specific customization. The local version overrides the central version and won't be overwritten by `/learnings sync`.

## Input
- Pattern key (e.g., "forgot-team-scope")
- Optional: Reason for customization

## Steps

### 1. Load Configuration

```bash
source ~/.pi/config.sh 2>/dev/null || echo "No global config found"

CENTRAL_PATH="${PI_LEARNINGS_CENTRAL:-$HOME/.pi/learnings-central}"
LOCAL_CATALOG=".pi/learnings/catalog.yaml"
LOCAL_PATTERNS=".pi/learnings/patterns"
PATTERN_KEY="$1"
CUSTOM_REASON="$2"
```

### 2. Validate Pattern Exists in Central

```bash
CENTRAL_PATTERN="$CENTRAL_PATH/patterns/$PATTERN_KEY.md"

if [ ! -f "$CENTRAL_PATTERN" ]; then
  echo "❌ Pattern not found in central: $PATTERN_KEY"
  echo ""
  echo "Available patterns in central:"
  ls -1 "$CENTRAL_PATH/patterns"/*.md 2>/dev/null | xargs -n 1 basename | sed 's/.md$/  - /'
  echo ""
  echo "Sync first with: /learnings sync"
  exit 1
fi
```

### 3. Check if Already Customized

```bash
LOCAL_PATTERN="$LOCAL_PATTERNS/$PATTERN_KEY.md"

if [ -f "$LOCAL_PATTERN" ]; then
  # Check if it's marked as customization
  IS_CUSTOMIZATION=$(grep -A 10 "customizations:" "$LOCAL_CATALOG" | \
                     grep "pattern_key: \"$PATTERN_KEY\"" || echo "")

  if [ -n "$IS_CUSTOMIZATION" ]; then
    echo "ℹ️  Pattern already customized locally"
    echo ""
    read -p "Re-customize (will backup existing)? (y/n): " recustomize

    if [ "$recustomize" != "y" ]; then
      echo "Customization cancelled"
      exit 0
    fi

    # Backup existing customization
    BACKUP_FILE="$LOCAL_PATTERN.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$LOCAL_PATTERN" "$BACKUP_FILE"
    echo "✓ Backed up existing customization: $BACKUP_FILE"
  fi
fi
```

### 4. Copy Pattern to Local

```bash
mkdir -p "$LOCAL_PATTERNS"

# Copy from central
cp "$CENTRAL_PATTERN" "$LOCAL_PATTERN"

echo "✓ Copied pattern from central to local"
echo "  Source: $CENTRAL_PATTERN"
echo "  Local:  $LOCAL_PATTERN"
```

### 5. Add Customization Header

```bash
# Add customization notice to pattern file
# Insert after frontmatter

# Read frontmatter (lines between --- markers)
FRONTMATTER_END=$(grep -n "^---$" "$LOCAL_PATTERN" | sed -n '2p' | cut -d: -f1)

if [ -n "$FRONTMATTER_END" ]; then
  # Insert customization info after frontmatter
  TEMP_FILE=$(mktemp)

  # First part (frontmatter)
  head -n "$FRONTMATTER_END" "$LOCAL_PATTERN" > "$TEMP_FILE"

  # Customization notice
  cat >> "$TEMP_FILE" <<EOF

<!-- CUSTOMIZATION NOTICE -->
<!-- This is a project-specific customization of the central pattern -->
<!-- Central source: $CENTRAL_PATH/patterns/$PATTERN_KEY.md -->
<!-- Customized: $(date -I) -->
<!-- Reason: ${CUSTOM_REASON:-Project-specific requirements} -->
<!-- This local version will NOT be overwritten by /learnings sync -->

EOF

  # Rest of file
  tail -n +$((FRONTMATTER_END + 1)) "$LOCAL_PATTERN" >> "$TEMP_FILE"

  mv "$TEMP_FILE" "$LOCAL_PATTERN"

  echo "✓ Added customization header"
fi
```

### 6. Update Local Catalog

```bash
# Add to customizations section

if ! grep -q "customizations:" "$LOCAL_CATALOG"; then
  # Create customizations section
  cat >> "$LOCAL_CATALOG" <<EOF

# Project-specific customizations of central patterns
customizations: []
EOF
fi

# Add customization entry
# This is simplified - real implementation would properly edit YAML
cat >> "$LOCAL_CATALOG.tmp" <<EOF
  - pattern_key: "$PATTERN_KEY"
    customized: true
    customized_date: $(date -I)
    reason: "${CUSTOM_REASON:-Project-specific requirements}"
    central_source: $CENTRAL_PATH/patterns/$PATTERN_KEY.md
    local_source: $LOCAL_PATTERNS/$PATTERN_KEY.md
EOF

echo "✓ Updated local catalog"
```

### 7. Open for Editing

```bash
# Prompt user to edit now or later
echo ""
echo "Pattern ready for customization!"
echo ""
echo "File: $LOCAL_PATTERN"
echo ""
read -p "Edit now? (y/n): " edit_now

if [ "$edit_now" = "y" ]; then
  # Use editor from environment or default to nano
  EDITOR="${EDITOR:-nano}"
  $EDITOR "$LOCAL_PATTERN"

  echo ""
  echo "✓ Pattern customized"
else
  echo ""
  echo "Edit later with:"
  echo "  \$EDITOR $LOCAL_PATTERN"
fi
```

### 8. Report What Can Be Customized

```bash
echo ""
echo "📝 Customization Guide"
echo "━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Common customizations:"
echo ""
echo "1. Agent Injection Instructions"
echo "   Modify the 'Agent Instruction Injection' section"
echo "   Change where/how pattern is injected into agents"
echo ""
echo "2. Symptom/Fix Details"
echo "   Adjust symptom description for this project's context"
echo "   Update fix instructions for project-specific approach"
echo ""
echo "3. Verification Steps"
echo "   Add project-specific verification commands"
echo "   Update test patterns for this project's structure"
echo ""
echo "4. Impact Level"
echo "   Change impact: high/medium/low based on project"
echo ""
echo "5. Applies To"
echo "   Add/remove agents that this pattern affects"
echo "   Example: Add project-specific agents"
echo ""
```

### 9. Commit Customization

```bash
echo ""
read -p "Commit customization? (y/n): " do_commit

if [ "$do_commit" = "y" ]; then
  git add .pi/learnings/

  git commit -m "$(cat <<EOF
feat(learnings): customize $PATTERN_KEY for $(basename "$PWD")

Reason: ${CUSTOM_REASON:-Project-specific requirements}

Customized from central pattern:
  $CENTRAL_PATH/patterns/$PATTERN_KEY.md

Local version will override central on sync.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"

  echo "✓ Committed customization"
fi
```

### 10. Remind About Sync Behavior

```bash
echo ""
echo "ℹ️  Sync Behavior"
echo ""
echo "When you run /learnings sync:"
echo "  - Central updates for '$PATTERN_KEY' will be SKIPPED"
echo "  - Your local customization will be PRESERVED"
echo "  - To get central updates, you must manually merge or revert"
echo ""
echo "To see central vs local diff:"
echo "  /learnings diff $PATTERN_KEY"
echo ""
echo "To revert to central version:"
echo "  /learnings revert-to-central $PATTERN_KEY"
echo ""
```

## Usage Examples

### Basic Customization

```bash
/learnings customize forgot-team-scope
```

**Output:**
```
✓ Copied pattern from central to local
  Source: ~/.pi/learnings-central/patterns/forgot-team-scope.md
  Local:  .pi/learnings/patterns/forgot-team-scope.md

✓ Added customization header
✓ Updated local catalog

Pattern ready for customization!

File: .pi/learnings/patterns/forgot-team-scope.md

Edit now? (y/n): y

[Opens editor with pattern file]

✓ Pattern customized

📝 Customization Guide
━━━━━━━━━━━━━━━━━━━━

Common customizations:

1. Agent Injection Instructions
   Modify the 'Agent Instruction Injection' section
   Change where/how pattern is injected into agents
...

Commit customization? (y/n): y
✓ Committed customization

ℹ️  Sync Behavior

When you run /learnings sync:
  - Central updates for 'forgot-team-scope' will be SKIPPED
  - Your local customization will be PRESERVED
  - To get central updates, you must manually merge or revert
```

---

### Customization with Reason

```bash
/learnings customize forgot-team-scope \
  --reason "This project uses org_id instead of team_id"
```

**Output:**
```
✓ Copied pattern from central to local
✓ Added customization header
  Reason: This project uses org_id instead of team_id
✓ Updated local catalog

Pattern ready for customization!
```

---

### Re-customization (Backup Existing)

```bash
/learnings customize forgot-team-scope
```

**Output:**
```
ℹ️  Pattern already customized locally

Re-customize (will backup existing)? (y/n): y

✓ Backed up existing customization:
  .pi/learnings/patterns/forgot-team-scope.md.backup.20260318_143052

✓ Copied fresh version from central
✓ Pattern ready for customization
```

---

## Example: Customizing Team Scope Pattern

**Scenario:** Central pattern assumes `team_id`, but your project uses `org_id`.

### 1. Customize the pattern

```bash
/learnings customize forgot-team-scope
```

### 2. Edit the pattern file

**Central version (before):**
```markdown
### For: agent:implementer
**Location:** "## Rules — non-negotiable"
**Content:**
```markdown
- **Always add team_id scoping**: Every query must filter by team_id
  - Use `ctx.auth.getTeam()` to get team_id
  - Add `.filter(q => q.eq(q.field("team_id"), teamId))`
```

**Local customization (after):**
```markdown
### For: agent:implementer
**Location:** "## Rules — non-negotiable"
**Content:**
```markdown
- **Always add org_id scoping**: Every query must filter by org_id
  - Use `ctx.auth.getOrganization()` to get org_id
  - Add `.filter(q => q.eq(q.field("org_id"), orgId))`
  - Note: This project uses org_id, not team_id
```

### 3. Apply customized pattern

```bash
/learnings apply forgot-team-scope

# Uses local customization, not central version
✓ Applied customized pattern: forgot-team-scope
  Modified: .pi/agents/implementer.md
  Using: local customization (org_id instead of team_id)
```

---

## Common Customization Scenarios

### 1. Different Framework/Library

**Central:** Uses Convex
**Project:** Uses Supabase

```bash
/learnings customize database-queries

# Edit to replace Convex patterns with Supabase patterns
```

---

### 2. Different Naming Conventions

**Central:** Uses camelCase
**Project:** Uses snake_case

```bash
/learnings customize variable-naming

# Edit to enforce snake_case instead of camelCase
```

---

### 3. Additional Agents

**Central:** Applies to implementer, reviewer
**Project:** Also needs to apply to project-specific agent

```bash
/learnings customize pattern-xyz

# Edit frontmatter:
# applies_to: [agent:implementer, agent:reviewer, agent:ivi-specialist]
```

---

### 4. Stricter Requirements

**Central:** Recommends returning types
**Project:** REQUIRES returns validators (stricter)

```bash
/learnings customize missing-returns

# Edit to make it non-negotiable rule instead of recommendation
```

---

## Tracking Customizations

### View All Customizations

```bash
/learnings status --customizations
```

**Output:**
```
Customizations (3):
━━━━━━━━━━━━━━━━━

  forgot-team-scope
    Customized: 2026-03-18
    Reason: Uses org_id instead of team_id
    Central: ~/.pi/learnings-central/patterns/forgot-team-scope.md
    Local: .pi/learnings/patterns/forgot-team-scope.md

  database-queries
    Customized: 2026-03-17
    Reason: Project uses Supabase not Convex
    Central: ~/.pi/learnings-central/patterns/database-queries.md
    Local: .pi/learnings/patterns/database-queries.md

  variable-naming
    Customized: 2026-03-16
    Reason: Project enforces snake_case
    Central: ~/.pi/learnings-central/patterns/variable-naming.md
    Local: .pi/learnings/patterns/variable-naming.md
```

---

### Compare Local vs Central

```bash
/learnings diff forgot-team-scope
```

**Output:**
```
Comparing: forgot-team-scope
━━━━━━━━━━━━━━━━━━━━━━━━━━

Central: ~/.pi/learnings-central/patterns/forgot-team-scope.md
Local:   .pi/learnings/patterns/forgot-team-scope.md

Differences:
━━━━━━━━━━

--- Central
+++ Local
@@ -42,7 +42,7 @@
-  - Use `ctx.auth.getTeam()` to get team_id
-  - Add `.filter(q => q.eq(q.field("team_id"), teamId))`
+  - Use `ctx.auth.getOrganization()` to get org_id
+  - Add `.filter(q => q.eq(q.field("org_id"), orgId))`

Summary: 2 lines changed (team_id → org_id)
```

---

## Sync Behavior with Customizations

### Scenario: Central pattern updates, local is customized

```bash
# In central repo (simulating update from another project)
cd ~/.pi/learnings-central
# Someone improved the pattern
echo "Improved example" >> patterns/forgot-team-scope.md
git commit -am "improve: better examples for team scoping"

# Back to project with customization
cd ~/projects/ivi
/learnings sync
```

**Output:**
```
Updated patterns (1):
  forgot-team-scope (central version is newer)

Update existing patterns? (y/n): y

  ⚠️  forgot-team-scope has local customizations

  Options:
    1. Keep local (skip update)
    2. Use central (discard customization)
    3. Show diff and merge manually
    4. Backup local and pull central

  Choice: 1

  ⏭️  Skipped: forgot-team-scope (local customization preserved)
```

---

## Error Handling

**Pattern not in central:**
```
❌ Pattern not found in central: xyz

Available patterns in central:
  - missing-returns-validator
  - forgot-team-scope
  - no-inline-styles

Sync first with: /learnings sync
```

**Pattern not yet synced to project:**
```
❌ Pattern not in local catalog: xyz

Sync pattern from central first:
  /learnings sync --only xyz

Then customize:
  /learnings customize xyz
```

---

## Revert Customization

```bash
/learnings revert-to-central forgot-team-scope
```

**Output:**
```
⚠️  This will discard local customizations

Local changes will be lost:
  - Customized: 2026-03-18
  - Reason: Uses org_id instead of team_id

Backup created: .pi/learnings/patterns/forgot-team-scope.md.backup

Continue? (y/n): y

✓ Reverted to central version
✓ Removed from customizations list

Pattern now matches central.
Future syncs will update this pattern.
```

---

## Best Practices

1. **Document why you customized**
   - Use `--reason` flag
   - Helps future you understand the decision

2. **Keep customizations minimal**
   - Only change what's necessary
   - Easier to merge central updates later

3. **Review central updates periodically**
   - Use `/learnings diff` to see what changed
   - Manually merge improvements

4. **Consider pushing general improvements**
   - If your customization is broadly useful
   - Edit central pattern and push instead

5. **Track customization count**
   - Too many customizations = pattern too generic
   - Consider creating project-specific patterns instead
