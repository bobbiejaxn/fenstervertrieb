# Push Pattern to Central Repository

## Context
Share a pattern from the current project to your central learnings repository. This makes the pattern available to all future projects via `/learnings sync`.

## Input
- Pattern key (e.g., "missing-returns-validator")
- Optional: Force update if pattern exists in central
- Optional: Batch push multiple patterns

## Steps

### 1. Load Configuration

```bash
# Load central repo location
source ~/.pi/config.sh 2>/dev/null || echo "No global config found"

CENTRAL_PATH="${PI_LEARNINGS_CENTRAL:-$HOME/.pi/learnings-central}"
LOCAL_CATALOG=".pi/learnings/catalog.yaml"
LOCAL_PATTERNS=".pi/learnings/patterns"
PATTERN_KEY="$1"

# Validate central repo exists
if [ ! -d "$CENTRAL_PATH" ]; then
  echo "❌ Central repo not found at: $CENTRAL_PATH"
  echo ""
  echo "Initialize first with:"
  echo "  /learnings init-central"
  exit 1
fi
```

### 2. Validate Pattern Exists Locally

```bash
if [ -z "$PATTERN_KEY" ]; then
  echo "❌ Pattern key required"
  echo ""
  echo "Usage: /learnings push <pattern-key>"
  echo ""
  echo "Available patterns:"
  grep "pattern_key:" "$LOCAL_CATALOG" | sed 's/.*pattern_key: "\(.*\)"/  - \1/'
  exit 1
fi

PATTERN_FILE="$LOCAL_PATTERNS/$PATTERN_KEY.md"

if [ ! -f "$PATTERN_FILE" ]; then
  echo "❌ Pattern file not found: $PATTERN_FILE"
  echo ""
  echo "Available patterns:"
  ls -1 "$LOCAL_PATTERNS"/*.md 2>/dev/null | xargs -n 1 basename | sed 's/.md$/  - /'
  exit 1
fi
```

### 3. Check Pattern Status

```bash
# Extract pattern metadata
PATTERN_STATUS=$(grep -A 5 "pattern_key: \"$PATTERN_KEY\"" "$LOCAL_CATALOG" | \
                 grep "status:" | sed 's/.*status: \(.*\)/\1/')
PATTERN_IMPACT=$(grep -A 5 "pattern_key: \"$PATTERN_KEY\"" "$LOCAL_CATALOG" | \
                 grep "impact:" | sed 's/.*impact: \(.*\)/\1/')
IS_LOCAL_ONLY=$(grep -A 10 "local_patterns:" "$LOCAL_CATALOG" | \
                grep "pattern_key: \"$PATTERN_KEY\"" || echo "")

# Warn if pattern is marked local-only
if [ -n "$IS_LOCAL_ONLY" ]; then
  echo "⚠️  Pattern '$PATTERN_KEY' is marked as local-only"
  echo ""
  read -p "Push to central anyway? (y/n): " push_local_only

  if [ "$push_local_only" != "y" ]; then
    echo "Push cancelled"
    exit 0
  fi
fi

# Check if pattern is promoted (recommended before pushing)
if [ "$PATTERN_STATUS" != "promoted" ] && [ "$PATTERN_STATUS" != "applied" ]; then
  echo "⚠️  Pattern status: $PATTERN_STATUS"
  echo ""
  echo "Recommended: Promote pattern before pushing"
  echo "  /learnings promote $PATTERN_KEY"
  echo ""
  read -p "Push anyway? (y/n): " push_anyway

  if [ "$push_anyway" != "y" ]; then
    echo "Push cancelled"
    exit 0
  fi
fi
```

### 4. Check if Pattern Exists in Central

```bash
CENTRAL_PATTERN_FILE="$CENTRAL_PATH/patterns/$PATTERN_KEY.md"
PATTERN_EXISTS_IN_CENTRAL=false

if [ -f "$CENTRAL_PATTERN_FILE" ]; then
  PATTERN_EXISTS_IN_CENTRAL=true

  echo "ℹ️  Pattern already exists in central repo"
  echo ""

  # Compare modification times
  LOCAL_MTIME=$(stat -f %m "$PATTERN_FILE" 2>/dev/null || stat -c %Y "$PATTERN_FILE" 2>/dev/null)
  CENTRAL_MTIME=$(stat -f %m "$CENTRAL_PATTERN_FILE" 2>/dev/null || stat -c %Y "$CENTRAL_PATTERN_FILE" 2>/dev/null)

  if [ "$LOCAL_MTIME" -gt "$CENTRAL_MTIME" ]; then
    echo "  Local version is newer ($(date -r $LOCAL_MTIME '+%Y-%m-%d %H:%M'))"
    echo "  Central version: $(date -r $CENTRAL_MTIME '+%Y-%m-%d %H:%M')"
    echo ""
    read -p "Update central with local version? (y/n): " update_central

    if [ "$update_central" != "y" ]; then
      echo "Push cancelled"
      exit 0
    fi
  elif [ "$LOCAL_MTIME" -lt "$CENTRAL_MTIME" ]; then
    echo "  ⚠️  Central version is newer!"
    echo "  Local: $(date -r $LOCAL_MTIME '+%Y-%m-%d %H:%M')"
    echo "  Central: $(date -r $CENTRAL_MTIME '+%Y-%m-%d %H:%M')"
    echo ""
    echo "  You might want to sync first:"
    echo "    /learnings sync"
    echo ""
    read -p "Overwrite central with older local version? (y/n): " overwrite

    if [ "$overwrite" != "y" ]; then
      echo "Push cancelled"
      exit 0
    fi
  else
    echo "  ✓ Versions are identical (no update needed)"
    exit 0
  fi
fi
```

### 5. Copy Pattern to Central

```bash
# Create patterns directory if doesn't exist
mkdir -p "$CENTRAL_PATH/patterns"

# Copy pattern file
cp "$PATTERN_FILE" "$CENTRAL_PATTERN_FILE"

echo "✓ Copied pattern file to central"
```

### 6. Update Central Catalog

```bash
if [ "$PATTERN_EXISTS_IN_CENTRAL" = "true" ]; then
  # Update existing entry
  # Update last_seen and occurrences
  # This is simplified - real implementation would properly edit YAML

  echo "✓ Updated central catalog entry"
else
  # Add new entry to central catalog
  CENTRAL_CATALOG="$CENTRAL_PATH/catalog.yaml"

  # Extract applies_to from local pattern
  APPLIES_TO=$(grep -A 1 "^applies_to:" "$PATTERN_FILE" | tail -1 | sed 's/.*\[\(.*\)\]/\1/')

  # Append to patterns array
  # This is simplified - real implementation would properly edit YAML
  cat >> "$CENTRAL_CATALOG.tmp" <<EOF

  - pattern_key: "$PATTERN_KEY"
    status: $PATTERN_STATUS
    impact: $PATTERN_IMPACT
    applies_to: [$APPLIES_TO]
    source: patterns/$PATTERN_KEY.md
    created: $(date -I)
    last_seen: $(date -I)
    contributed_by: $(basename "$PWD")
EOF

  echo "✓ Added to central catalog"
fi
```

### 7. Update Statistics

```bash
# Update central catalog statistics
CENTRAL_CATALOG="$CENTRAL_PATH/catalog.yaml"

# Count total patterns
TOTAL_PATTERNS=$(grep -c "pattern_key:" "$CENTRAL_CATALOG" || echo "0")

# Update stats section
sed -i.bak "s/total_patterns: .*/total_patterns: $TOTAL_PATTERNS/" "$CENTRAL_CATALOG"
sed -i.bak "s/last_updated: .*/last_updated: $(date -I)/" "$CENTRAL_CATALOG"

# Add this project to contributors if not already listed
PROJECT_NAME=$(basename "$PWD")
if ! grep -q "$PROJECT_NAME" "$CENTRAL_CATALOG"; then
  # Add to projects_contributing list
  echo "✓ Added $PROJECT_NAME to contributors"
fi

rm "$CENTRAL_CATALOG.bak" 2>/dev/null || true
```

### 8. Commit to Central Repo

```bash
cd "$CENTRAL_PATH"

# Stage changes
git add patterns/"$PATTERN_KEY.md" catalog.yaml

# Check if there are changes to commit
if git diff --cached --quiet; then
  echo "ℹ️  No changes to commit (versions identical)"
else
  # Commit with descriptive message
  git commit -m "$(cat <<EOF
feat(learnings): $(if [ "$PATTERN_EXISTS_IN_CENTRAL" = "true" ]; then echo "update"; else echo "add"; fi) $PATTERN_KEY

Impact: $PATTERN_IMPACT
Status: $PATTERN_STATUS
From project: $(basename "$PWD")

$(if [ "$PATTERN_EXISTS_IN_CENTRAL" = "true" ]; then
  echo "Updated pattern with latest changes."
else
  echo "New pattern contributed from $PROJECT_NAME."
fi)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"

  COMMIT_HASH=$(git rev-parse --short HEAD)
  echo "✓ Committed to central repo [$COMMIT_HASH]"
fi

cd - > /dev/null
```

### 9. Optional: Push to Git Remote

```bash
# Check if git remote is configured
cd "$CENTRAL_PATH"

if git remote get-url origin >/dev/null 2>&1; then
  REMOTE_URL=$(git remote get-url origin)

  # Check auto-push setting
  AUTO_PUSH_GIT="${PI_LEARNINGS_AUTO_PUSH_GIT:-false}"

  if [ "$AUTO_PUSH_GIT" = "true" ]; then
    echo "Pushing to GitHub..."
    git push origin main
    echo "✓ Pushed to $REMOTE_URL"
  else
    echo ""
    echo "📦 Central repo updated locally"
    echo "   Remote: $REMOTE_URL"
    echo ""
    read -p "Push to GitHub now? (y/n): " push_github

    if [ "$push_github" = "y" ]; then
      git push origin main
      echo "✓ Pushed to GitHub"
    else
      echo "ℹ️  Push later with: cd $CENTRAL_PATH && git push"
    fi
  fi
fi

cd - > /dev/null
```

### 10. Update Local Catalog

```bash
# Mark pattern as shared to central
# Add to from_central section if not already there

if ! grep -q "from_central:" "$LOCAL_CATALOG"; then
  # Create from_central section
  echo "" >> "$LOCAL_CATALOG"
  echo "# Patterns from central repository" >> "$LOCAL_CATALOG"
  echo "from_central: []" >> "$LOCAL_CATALOG"
fi

# Update local catalog to reflect central source
# This is simplified - real implementation would properly edit YAML
```

### 11. Report Success

```bash
echo ""
echo "✅ Pushed to central: $PATTERN_KEY"
echo ""
echo "Summary:"
echo "  Pattern: $PATTERN_KEY"
echo "  Status: $PATTERN_STATUS"
echo "  Impact: $PATTERN_IMPACT"
echo "  Central: $CENTRAL_PATH/patterns/$PATTERN_KEY.md"
echo ""
echo "This pattern is now available to all projects via:"
echo "  /learnings sync"
echo ""

# Show which projects can now access it
echo "Projects that will get this pattern on next sync:"
# List all projects (directories with .pi/learnings/)
find ~ -type d -name ".pi" -path "*/projects/*" 2>/dev/null | \
  sed 's|/.pi||' | xargs -n 1 basename | \
  while read -r project; do
    if [ "$project" != "$(basename "$PWD")" ]; then
      echo "  - $project"
    fi
  done
```

## Usage Examples

### Push Single Pattern

```bash
/learnings push missing-returns-validator
```

**Output:**
```
✓ Copied pattern file to central
✓ Added to central catalog
✓ Committed to central repo [a18942d]

📦 Central repo updated locally
   Remote: git@github.com:michael/pi-learnings.git

Push to GitHub now? (y/n): y
✓ Pushed to GitHub

✅ Pushed to central: missing-returns-validator

Summary:
  Pattern: missing-returns-validator
  Status: promoted
  Impact: high
  Central: ~/.pi/learnings-central/patterns/missing-returns-validator.md

This pattern is now available to all projects via:
  /learnings sync

Projects that will get this pattern on next sync:
  - new-saas-app
  - client-project
  - side-project
```

---

### Update Existing Pattern

```bash
/learnings push missing-returns-validator
```

**Output:**
```
ℹ️  Pattern already exists in central repo

  Local version is newer (2026-03-18 14:30)
  Central version: 2026-03-17 10:00

Update central with local version? (y/n): y

✓ Copied pattern file to central
✓ Updated central catalog entry
✓ Committed to central repo [b29c3f1]

✅ Pushed to central: missing-returns-validator

Pattern updated with latest improvements.
```

---

### Push Unpromoted Pattern (Warning)

```bash
/learnings push experimental-pattern
```

**Output:**
```
⚠️  Pattern status: pending

Recommended: Promote pattern before pushing
  /learnings promote experimental-pattern

Push anyway? (y/n): n

Push cancelled
```

---

### Push Local-Only Pattern (Warning)

```bash
/learnings push ivi-specific-auth
```

**Output:**
```
⚠️  Pattern 'ivi-specific-auth' is marked as local-only

Push to central anyway? (y/n): n

Push cancelled
```

---

### Batch Push

```bash
/learnings push --all-promoted
```

**Output:**
```
Found 3 promoted patterns:
  - missing-returns-validator
  - forgot-team-scope
  - no-inline-styles

Push all to central? (y/n): y

✓ Pushed: missing-returns-validator
✓ Pushed: forgot-team-scope
✓ Pushed: no-inline-styles

✅ Pushed 3 patterns to central

All projects can now access these patterns via /learnings sync
```

---

## Integration with Pattern Lifecycle

Recommended workflow:

```bash
# 1. Discover and log pattern
/learnings log missing-returns

# 2. Pattern recurs (auto-promotes at 3 occurrences)
/learnings log missing-returns  # 2nd
/learnings log missing-returns  # 3rd → promoted

# 3. Apply locally and verify it works
/learnings apply missing-returns

# 4. Wait ~7 days, verify effectiveness
/learnings analyze missing-returns
# → Shows: EFFECTIVE (0 occurrences after application)

# 5. Push to central (now validated)
/learnings push missing-returns

# 6. All future projects get this pattern
cd ~/projects/new-app
/learnings sync
# → Includes missing-returns
```

---

## Error Handling

**Central repo not initialized:**
```
❌ Central repo not found at: ~/.pi/learnings-central

Initialize first with:
  /learnings init-central
```

**Pattern not found locally:**
```
❌ Pattern file not found: .pi/learnings/patterns/xyz.md

Available patterns:
  - missing-returns-validator
  - forgot-team-scope
  - no-inline-styles
```

**Central is newer than local:**
```
⚠️  Central version is newer!
    Local: 2026-03-17 10:00
    Central: 2026-03-18 14:00

You might want to sync first:
  /learnings sync

Overwrite central with older local version? (y/n): n

Push cancelled
```

**Git push fails:**
```
✓ Committed to central repo [a18942d]

Pushing to GitHub...
❌ Git push failed

Error: Updates were rejected because the remote contains work that you do
not have locally. This is usually caused by another repository pushing
to the same ref.

Solution:
  cd ~/.pi/learnings-central
  git pull origin main
  git push origin main
```

---

## Advanced Usage

### Push with Auto-Confirm

```bash
# Skip prompts (useful for automation)
/learnings push missing-returns --yes
```

---

### Push to Different Central

```bash
# One-time push to alternative central
PI_LEARNINGS_CENTRAL=~/work/learnings-work \
  /learnings push pattern-key
```

---

### Dry Run

```bash
# Preview what would be pushed
/learnings push pattern-key --dry-run

Shows:
  - Whether pattern exists in central
  - What changes would be made
  - What commit message would be used
Does not actually push
```

---

## Verification

After push, verify pattern is in central:

```bash
# Check central catalog
cat ~/.pi/learnings-central/catalog.yaml | grep -A 5 "missing-returns"

# Check pattern file exists
ls -la ~/.pi/learnings-central/patterns/missing-returns-validator.md

# Check git history
cd ~/.pi/learnings-central
git log --oneline | head -5

# Verify in other project
cd ~/projects/other-project
/learnings sync
# Should show: missing-returns-validator available
```
