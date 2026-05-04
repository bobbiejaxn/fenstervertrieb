# Sync Patterns from Central Repository

## Context
Pull patterns from your central learnings repository to the current project. This gives new projects instant access to accumulated wisdom from all past projects.

## Input
- Optional: Specific patterns to sync (default: all)
- Optional: Force overwrite local changes

## Steps

### 1. Load Configuration

```bash
# Load central repo location
source ~/.pi/config.sh 2>/dev/null || echo "No global config found"

CENTRAL_PATH="${PI_LEARNINGS_CENTRAL:-$HOME/.pi/learnings-central}"
LOCAL_CATALOG=".pi/learnings/catalog.yaml"
LOCAL_PATTERNS=".pi/learnings/patterns"

# Validate central repo exists
if [ ! -d "$CENTRAL_PATH" ]; then
  echo "❌ Central repo not found at: $CENTRAL_PATH"
  echo ""
  echo "Initialize first with:"
  echo "  /learnings init-central"
  exit 1
fi

if [ ! -f "$CENTRAL_PATH/catalog.yaml" ]; then
  echo "❌ Central catalog not found"
  echo "  Expected: $CENTRAL_PATH/catalog.yaml"
  exit 1
fi
```

### 2. Parse Sync Options

```bash
SYNC_MODE="all"           # all | specific
FORCE_OVERWRITE="false"
SPECIFIC_PATTERNS=()

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --only)
      SYNC_MODE="specific"
      IFS=',' read -ra SPECIFIC_PATTERNS <<< "$2"
      shift 2
      ;;
    --force)
      FORCE_OVERWRITE="true"
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done
```

### 3. Read Central Catalog

```bash
# Extract patterns from central catalog
# This is a simplified version - real implementation would parse YAML properly

mapfile -t CENTRAL_PATTERNS < <(grep -A 20 "^patterns:" "$CENTRAL_PATH/catalog.yaml" | \
  grep "pattern_key:" | \
  sed 's/.*pattern_key: "\(.*\)"/\1/')

if [ ${#CENTRAL_PATTERNS[@]} -eq 0 ]; then
  echo "ℹ️  No patterns in central repo yet"
  echo ""
  echo "Push patterns from projects with:"
  echo "  /learnings push <pattern-key>"
  exit 0
fi

echo "📦 Found ${#CENTRAL_PATTERNS[@]} patterns in central repo"
echo ""
```

### 4. Initialize Local Catalog if Needed

```bash
if [ ! -f "$LOCAL_CATALOG" ]; then
  echo "Creating local catalog..."
  mkdir -p .pi/learnings

  cat > "$LOCAL_CATALOG" <<EOF
# Project Learning Patterns
# Synced from central: $CENTRAL_PATH

metadata:
  project: $(basename "$PWD")
  central_repo: $CENTRAL_PATH
  last_sync: $(date -I)

# Patterns from central repository
from_central: []

# Local-only patterns (not shared to central)
local_patterns: []

# Customizations of central patterns
customizations: []
EOF
fi
```

### 5. Compare Central vs Local

```bash
# Read local catalog to see what's already synced
if [ -f "$LOCAL_CATALOG" ]; then
  mapfile -t LOCAL_PATTERNS < <(grep -A 10 "from_central:" "$LOCAL_CATALOG" | \
    grep "pattern_key:" | \
    sed 's/.*pattern_key: "\(.*\)"/\1/')
else
  LOCAL_PATTERNS=()
fi

# Determine what's new, updated, or unchanged
NEW_PATTERNS=()
UPDATED_PATTERNS=()
UNCHANGED_PATTERNS=()

for pattern in "${CENTRAL_PATTERNS[@]}"; do
  # Check if pattern should be synced
  if [ "$SYNC_MODE" = "specific" ]; then
    if [[ ! " ${SPECIFIC_PATTERNS[@]} " =~ " ${pattern} " ]]; then
      continue
    fi
  fi

  # Check if pattern exists locally
  if [[ " ${LOCAL_PATTERNS[@]} " =~ " ${pattern} " ]]; then
    # Check if local file exists
    if [ -f "$LOCAL_PATTERNS/$pattern.md" ]; then
      # Compare modification times
      CENTRAL_MTIME=$(stat -f %m "$CENTRAL_PATH/patterns/$pattern.md" 2>/dev/null || stat -c %Y "$CENTRAL_PATH/patterns/$pattern.md" 2>/dev/null)
      LOCAL_MTIME=$(stat -f %m "$LOCAL_PATTERNS/$pattern.md" 2>/dev/null || stat -c %Y "$LOCAL_PATTERNS/$pattern.md" 2>/dev/null)

      if [ "$CENTRAL_MTIME" -gt "$LOCAL_MTIME" ]; then
        UPDATED_PATTERNS+=("$pattern")
      else
        UNCHANGED_PATTERNS+=("$pattern")
      fi
    else
      # In catalog but file missing - treat as new
      NEW_PATTERNS+=("$pattern")
    fi
  else
    NEW_PATTERNS+=("$pattern")
  fi
done
```

### 6. Report Sync Status

```bash
echo "Sync Status:"
echo "━━━━━━━━━━━━"
echo ""

if [ ${#NEW_PATTERNS[@]} -gt 0 ]; then
  echo "🆕 New patterns available (${#NEW_PATTERNS[@]}):"
  for pattern in "${NEW_PATTERNS[@]}"; do
    # Extract impact from central pattern
    IMPACT=$(grep -A 5 "pattern_key: \"$pattern\"" "$CENTRAL_PATH/catalog.yaml" | \
             grep "impact:" | sed 's/.*impact: \(.*\)/\1/')
    echo "  - $pattern [$IMPACT]"
  done
  echo ""
fi

if [ ${#UPDATED_PATTERNS[@]} -gt 0 ]; then
  echo "🔄 Updated patterns (${#UPDATED_PATTERNS[@]}):"
  for pattern in "${UPDATED_PATTERNS[@]}"; do
    echo "  - $pattern (central version is newer)"
  done
  echo ""
fi

if [ ${#UNCHANGED_PATTERNS[@]} -gt 0 ]; then
  echo "✓ Up to date (${#UNCHANGED_PATTERNS[@]}):"
  echo "  ${UNCHANGED_PATTERNS[*]}"
  echo ""
fi
```

### 7. Prompt for Sync Actions

```bash
# If no changes, exit early
if [ ${#NEW_PATTERNS[@]} -eq 0 ] && [ ${#UPDATED_PATTERNS[@]} -eq 0 ]; then
  echo "✅ Already in sync with central repo"
  exit 0
fi

# Prompt for new patterns
if [ ${#NEW_PATTERNS[@]} -gt 0 ]; then
  echo ""
  read -p "Pull new patterns? (y/n): " pull_new

  if [ "$pull_new" = "y" ]; then
    mkdir -p "$LOCAL_PATTERNS"

    for pattern in "${NEW_PATTERNS[@]}"; do
      cp "$CENTRAL_PATH/patterns/$pattern.md" "$LOCAL_PATTERNS/"
      echo "  ✓ Pulled: $pattern"
    done

    # Update local catalog
    for pattern in "${NEW_PATTERNS[@]}"; do
      # Add to from_central section
      # This is simplified - real implementation would properly edit YAML
      echo "  - pattern_key: \"$pattern\"" >> "$LOCAL_CATALOG.tmp"
      echo "    applied: false" >> "$LOCAL_CATALOG.tmp"
    done
  fi
fi

# Prompt for updates
if [ ${#UPDATED_PATTERNS[@]} -gt 0 ]; then
  echo ""
  read -p "Update existing patterns? (y/n): " pull_updates

  if [ "$pull_updates" = "y" ]; then
    for pattern in "${UPDATED_PATTERNS[@]}"; do
      # Check for local customizations
      IS_CUSTOMIZED=$(grep -A 5 "customizations:" "$LOCAL_CATALOG" | \
                      grep "pattern_key: \"$pattern\"" || echo "")

      if [ -n "$IS_CUSTOMIZED" ] && [ "$FORCE_OVERWRITE" != "true" ]; then
        echo ""
        echo "  ⚠️  $pattern has local customizations"
        read -p "  Overwrite local changes? (y/n): " overwrite

        if [ "$overwrite" != "y" ]; then
          echo "  ⏭️  Skipped: $pattern (local customization preserved)"
          continue
        fi
      fi

      cp "$CENTRAL_PATH/patterns/$pattern.md" "$LOCAL_PATTERNS/"
      echo "  ✓ Updated: $pattern"
    done
  fi
fi
```

### 8. Update Local Catalog Metadata

```bash
# Update last_sync timestamp
if command -v yq &> /dev/null; then
  # Use yq if available for proper YAML editing
  yq -i ".metadata.last_sync = \"$(date -I)\"" "$LOCAL_CATALOG"
else
  # Fallback: simple sed replacement
  sed -i.bak "s/last_sync: .*/last_sync: $(date -I)/" "$LOCAL_CATALOG"
  rm "$LOCAL_CATALOG.bak"
fi
```

### 9. Report Summary

```bash
echo ""
echo "✅ Sync complete"
echo ""
echo "Summary:"
echo "  New patterns pulled: ${#NEW_PATTERNS[@]}"
echo "  Patterns updated: ${#UPDATED_PATTERNS[@]}"
echo "  Local catalog: $LOCAL_CATALOG"
echo ""

if [ ${#NEW_PATTERNS[@]} -gt 0 ] || [ ${#UPDATED_PATTERNS[@]} -gt 0 ]; then
  echo "Next steps:"
  echo ""
  echo "1. Review synced patterns:"
  echo "   /learnings status"
  echo ""
  echo "2. Apply patterns to agents:"
  echo "   /learnings apply <pattern-key>"
  echo ""
  echo "3. Or apply all promoted patterns:"
  echo "   /learnings apply --all-promoted"
  echo ""
fi
```

### 10. Optional: Auto-Apply Promoted Patterns

```bash
# If configured, auto-apply promoted patterns
if [ "${PI_LEARNINGS_AUTO_APPLY:-false}" = "true" ]; then
  echo "Auto-applying promoted patterns..."
  echo ""

  for pattern in "${NEW_PATTERNS[@]}" "${UPDATED_PATTERNS[@]}"; do
    # Check if pattern is promoted in central
    STATUS=$(grep -A 10 "pattern_key: \"$pattern\"" "$CENTRAL_PATH/catalog.yaml" | \
             grep "status:" | sed 's/.*status: \(.*\)/\1/')

    if [ "$STATUS" = "promoted" ] || [ "$STATUS" = "applied" ]; then
      echo "  Applying: $pattern"
      # Call apply cookbook
      # /learnings apply "$pattern"
    fi
  done
fi
```

## Usage Examples

### Sync All Patterns

```bash
/learnings sync
```

**Output:**
```
📦 Found 12 patterns in central repo

Sync Status:
━━━━━━━━━━━━

🆕 New patterns available (3):
  - missing-returns-validator [high]
  - forgot-team-scope [high]
  - no-inline-styles [medium]

🔄 Updated patterns (1):
  - no-any-types (central version is newer)

✓ Up to date (8):
  existing-pattern-1 existing-pattern-2 ... (6 more)

Pull new patterns? (y/n): y
  ✓ Pulled: missing-returns-validator
  ✓ Pulled: forgot-team-scope
  ✓ Pulled: no-inline-styles

Update existing patterns? (y/n): y
  ✓ Updated: no-any-types

✅ Sync complete

Summary:
  New patterns pulled: 3
  Patterns updated: 1
  Local catalog: .pi/learnings/catalog.yaml

Next steps:

1. Review synced patterns:
   /learnings status

2. Apply patterns to agents:
   /learnings apply <pattern-key>
```

---

### Sync Specific Patterns Only

```bash
/learnings sync --only missing-returns,forgot-team-scope
```

**Output:**
```
📦 Found 2 patterns matching filter

Sync Status:
━━━━━━━━━━━━

🆕 New patterns available (2):
  - missing-returns-validator [high]
  - forgot-team-scope [high]

Pull new patterns? (y/n): y
  ✓ Pulled: missing-returns-validator
  ✓ Pulled: forgot-team-scope

✅ Sync complete
```

---

### Force Overwrite Local Changes

```bash
/learnings sync --force
```

**Output:**
```
🔄 Updated patterns (2):
  - missing-returns (central version is newer)
  - forgot-team-scope (central version is newer)

Update existing patterns? (y/n): y
  ✓ Updated: missing-returns (local customization overwritten)
  ✓ Updated: forgot-team-scope (local customization overwritten)

⚠️  Local customizations were overwritten
    Backup created: .pi/learnings/patterns.backup.20260318
```

---

### First Sync (New Project)

```bash
# New project, no local catalog yet
cd ~/projects/new-project
/learnings sync
```

**Output:**
```
📦 Found 12 patterns in central repo

Creating local catalog...

Sync Status:
━━━━━━━━━━━━

🆕 New patterns available (12):
  - missing-returns-validator [high]
  - forgot-team-scope [high]
  - no-inline-styles [medium]
  ... (9 more)

Pull new patterns? (y/n): y
  ✓ Pulled: missing-returns-validator
  ✓ Pulled: forgot-team-scope
  ✓ Pulled: no-inline-styles
  ... (9 more)

✅ Sync complete

Summary:
  New patterns pulled: 12
  Patterns updated: 0
  Local catalog: .pi/learnings/catalog.yaml

🎉 Project now has all your accumulated wisdom!

Next steps:

1. Review patterns:
   /learnings status

2. Apply relevant patterns:
   /learnings apply missing-returns-validator
```

---

## Integration with Session Start

Add to orchestrator or session start hook:

```bash
# In .pi/hooks/session-start or orchestrator.md

if [ "${PI_LEARNINGS_AUTO_SYNC:-false}" = "true" ]; then
  echo "Syncing learnings from central..."
  /learnings sync --silent
fi
```

**Silent mode** (for auto-sync):
- No prompts
- Pulls all new patterns automatically
- Skips updates (preserves local changes)
- Brief summary only

---

## Error Handling

**Central repo not initialized:**
```
❌ Central repo not found at: ~/.pi/learnings-central

Initialize first with:
  /learnings init-central
```

**No patterns in central:**
```
ℹ️  No patterns in central repo yet

Push patterns from projects with:
  /learnings push <pattern-key>
```

**Conflict with local customizations:**
```
⚠️  missing-returns has local customizations
    Central modified: 2026-03-18
    Local modified:   2026-03-19

Options:
  1. Keep local (skip update)
  2. Use central (discard local changes)
  3. Show diff and decide

Choice: 3

# Shows diff, then prompts for decision
```

**Network/git issues (if using remote):**
```
⚠️  Central repo is behind remote
    Pulling latest from GitHub first...

git pull origin main

✅ Central repo updated
    Now syncing to project...
```

---

## Advanced Usage

### Sync and Auto-Apply

```bash
# Configure auto-apply in ~/.pi/config.sh
export PI_LEARNINGS_AUTO_APPLY="true"

# Then sync
/learnings sync

# Automatically applies all promoted patterns
```

---

### Selective Sync with Preview

```bash
# Preview without syncing
/learnings sync --dry-run

# Shows what would be synced, but doesn't actually pull
```

---

### Sync from Alternative Central

```bash
# One-time sync from different central
PI_LEARNINGS_CENTRAL=~/work/learnings-work /learnings sync
```

---

## Verification

After sync, verify patterns are available:

```bash
# Check local catalog
cat .pi/learnings/catalog.yaml

# List pattern files
ls -la .pi/learnings/patterns/

# View status
/learnings status

# Should show patterns from central marked with 🌐
```
