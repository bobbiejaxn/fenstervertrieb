# Sync Artifacts from Central Library

## Context
Pull artifacts (skills, agents, prompts, workflows, MCP configs, extensions, learnings) from your central library repository to the current project. This gives new projects instant access to all accumulated artifacts from past projects.

## Input
- Optional: Specific artifact types to sync (default: all)
- Optional: Specific artifacts to sync (default: all in selected types)
- Optional: Force overwrite local customizations
- Optional: Silent mode for orchestrator auto-sync

## Steps

### 1. Load Configuration

```bash
# Load central library location
source ~/.pi/config.sh 2>/dev/null || echo "No global config found"

CENTRAL_PATH="${PI_LIBRARY_CENTRAL:-$HOME/.pi/library-central}"
LOCAL_CATALOG=".pi/library/catalog.yaml"

# Validate central library exists
if [ ! -d "$CENTRAL_PATH" ]; then
  echo "❌ Central library not found at: $CENTRAL_PATH"
  echo ""
  echo "Initialize first with:"
  echo "  /library init"
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
SYNC_MODE="all"                # all | specific | filtered
SYNC_TYPES=()                  # Empty = all types
SPECIFIC_ARTIFACTS=()          # Empty = all artifacts
FORCE_OVERWRITE="false"
SILENT_MODE="false"            # For orchestrator auto-sync
DRY_RUN="false"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --only)
      # --only skills,agents OR --only skill:commit,agent:implementer
      SYNC_MODE="filtered"
      IFS=',' read -ra ITEMS <<< "$2"

      for item in "${ITEMS[@]}"; do
        if [[ "$item" == *:* ]]; then
          # Specific artifact (skill:commit)
          SPECIFIC_ARTIFACTS+=("$item")
        else
          # Type filter (skills)
          SYNC_TYPES+=("$item")
        fi
      done
      shift 2
      ;;
    --force)
      FORCE_OVERWRITE="true"
      shift
      ;;
    --silent)
      SILENT_MODE="true"
      shift
      ;;
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo ""
      echo "Usage: /library sync [options]"
      echo ""
      echo "Options:"
      echo "  --only TYPE[,TYPE...]      Sync specific types (skills,agents,prompts,etc)"
      echo "  --only ARTIFACT[,...]      Sync specific artifacts (skill:commit,agent:implementer)"
      echo "  --force                    Overwrite local customizations"
      echo "  --silent                   Silent mode for auto-sync"
      echo "  --dry-run                  Preview without syncing"
      exit 1
      ;;
  esac
done

# Default to all types if none specified
if [ ${#SYNC_TYPES[@]} -eq 0 ] && [ ${#SPECIFIC_ARTIFACTS[@]} -eq 0 ]; then
  SYNC_TYPES=(skills agents prompts workflows mcp_configs extensions learnings)
fi
```

### 3. Read Central Catalog

```bash
# Extract artifacts from central catalog
# Real implementation should use proper YAML parser (yq)

declare -A CENTRAL_ARTIFACTS
declare -A ARTIFACT_VERSIONS
declare -A ARTIFACT_DEPENDENCIES
declare -A ARTIFACT_DESCRIPTIONS

# For each artifact type
for type in "${SYNC_TYPES[@]}"; do
  # Convert plural to singular for artifact IDs
  TYPE_SINGULAR="${type%s}"  # skills -> skill

  # Extract artifacts from catalog
  mapfile -t artifacts < <(
    grep -A 10 "^${type}:" "$CENTRAL_PATH/catalog.yaml" | \
    grep "name:" | \
    sed 's/.*name: "\?\([^"]*\)"\?/\1/'
  )

  for artifact in "${artifacts[@]}"; do
    artifact_id="${TYPE_SINGULAR}:${artifact}"
    CENTRAL_ARTIFACTS["$artifact_id"]="$type"

    # Extract version
    version=$(grep -A 20 "name: \"$artifact\"" "$CENTRAL_PATH/catalog.yaml" | \
              grep "version:" | head -1 | \
              sed 's/.*version: "\?\([^"]*\)"\?/\1/')
    ARTIFACT_VERSIONS["$artifact_id"]="$version"

    # Extract description
    desc=$(grep -A 20 "name: \"$artifact\"" "$CENTRAL_PATH/catalog.yaml" | \
           grep "description:" | head -1 | \
           sed 's/.*description: "\(.*\)"/\1/')
    ARTIFACT_DESCRIPTIONS["$artifact_id"]="$desc"

    # Extract dependencies
    deps=$(grep -A 30 "name: \"$artifact\"" "$CENTRAL_PATH/catalog.yaml" | \
           grep -A 10 "dependencies:" | \
           grep -v "dependencies:" | \
           grep "^[[:space:]]*-" | \
           sed 's/^[[:space:]]*-[[:space:]]*//' | \
           tr '\n' ',' | sed 's/,$//')
    ARTIFACT_DEPENDENCIES["$artifact_id"]="$deps"
  done
done

if [ ${#CENTRAL_ARTIFACTS[@]} -eq 0 ]; then
  echo "ℹ️  No artifacts in central library yet"
  echo ""
  echo "Push artifacts from projects with:"
  echo "  /library push skill:my-skill"
  echo "  /library push agent:my-agent"
  exit 0
fi

if [ "$SILENT_MODE" != "true" ]; then
  echo "📦 Found ${#CENTRAL_ARTIFACTS[@]} artifacts in central library"
  echo ""
fi
```

### 4. Initialize Local Catalog if Needed

```bash
if [ ! -f "$LOCAL_CATALOG" ]; then
  if [ "$SILENT_MODE" != "true" ]; then
    echo "Creating local catalog..."
  fi

  mkdir -p .pi/library

  cat > "$LOCAL_CATALOG" <<EOF
# Project Library Catalog
# Synced from central: $CENTRAL_PATH

metadata:
  project: $(basename "$PWD")
  central_repo: $CENTRAL_PATH
  last_sync: $(date -u +"%Y-%m-%d %H:%M:%S UTC")

# Artifacts synced from central
from_central:
  skills: []
  agents: []
  prompts: []
  workflows: []
  mcp_configs: []
  extensions: []
  learnings: []

# Project-only artifacts (not in central)
local_only:
  skills: []
  agents: []
  prompts: []
  workflows: []
  mcp_configs: []
  extensions: []
  learnings: []

# Local customizations of central artifacts
customizations:
  # artifact_id: modification_date
EOF
fi
```

### 5. Compare Central vs Local

```bash
declare -A LOCAL_ARTIFACTS
declare -A LOCAL_VERSIONS
declare -A LOCAL_CUSTOMIZATIONS

# Read local catalog to see what's already synced
if [ -f "$LOCAL_CATALOG" ]; then
  for type in "${SYNC_TYPES[@]}"; do
    TYPE_SINGULAR="${type%s}"

    mapfile -t local_arts < <(
      grep -A 10 "^[[:space:]]*${type}:" "$LOCAL_CATALOG" | \
      grep "name:" | \
      sed 's/.*name: "\?\([^"]*\)"\?/\1/'
    )

    for artifact in "${local_arts[@]}"; do
      artifact_id="${TYPE_SINGULAR}:${artifact}"
      LOCAL_ARTIFACTS["$artifact_id"]="$type"

      # Check for local version
      version=$(grep -A 20 "name: \"$artifact\"" "$LOCAL_CATALOG" | \
                grep "version:" | head -1 | \
                sed 's/.*version: "\?\([^"]*\)"\?/\1/')
      LOCAL_VERSIONS["$artifact_id"]="$version"
    done
  done

  # Read customizations
  mapfile -t customs < <(
    grep -A 50 "^customizations:" "$LOCAL_CATALOG" | \
    grep -E "^[[:space:]]+[a-z]+:" | \
    sed 's/^[[:space:]]*\([^:]*\):.*/\1/'
  )

  for custom in "${customs[@]}"; do
    LOCAL_CUSTOMIZATIONS["$custom"]="true"
  done
fi

# Determine what's new, updated, unchanged
declare -A NEW_ARTIFACTS
declare -A UPDATED_ARTIFACTS
declare -A UNCHANGED_ARTIFACTS
declare -A SKIPPED_ARTIFACTS

for artifact_id in "${!CENTRAL_ARTIFACTS[@]}"; do
  type="${CENTRAL_ARTIFACTS[$artifact_id]}"

  # Check if artifact should be synced
  if [ "$SYNC_MODE" = "specific" ]; then
    if [[ ! " ${SPECIFIC_ARTIFACTS[@]} " =~ " ${artifact_id} " ]]; then
      continue
    fi
  fi

  # Check if artifact exists locally
  if [[ -v LOCAL_ARTIFACTS["$artifact_id"] ]]; then
    # Check for local customization
    if [[ -v LOCAL_CUSTOMIZATIONS["$artifact_id"] ]]; then
      if [ "$FORCE_OVERWRITE" != "true" ]; then
        SKIPPED_ARTIFACTS["$artifact_id"]="customized"
        continue
      fi
    fi

    # Compare versions
    central_version="${ARTIFACT_VERSIONS[$artifact_id]}"
    local_version="${LOCAL_VERSIONS[$artifact_id]}"

    if [ "$central_version" != "$local_version" ]; then
      # Check if files actually differ
      artifact_name="${artifact_id#*:}"
      TYPE_SINGULAR="${type%s}"

      central_file="$CENTRAL_PATH/$type/$artifact_name"
      local_file=".pi/$type/$artifact_name"

      # Handle different file patterns
      case "$TYPE_SINGULAR" in
        skill)
          central_file="$CENTRAL_PATH/$type/$artifact_name/SKILL.md"
          local_file=".pi/$type/$artifact_name/SKILL.md"
          ;;
        agent)
          central_file="$CENTRAL_PATH/$type/$artifact_name.md"
          local_file=".pi/$type/$artifact_name.md"
          ;;
        prompt)
          central_file="$CENTRAL_PATH/$type/$artifact_name.md"
          local_file=".pi/$type/$artifact_name.md"
          ;;
        pattern)
          central_file="$CENTRAL_PATH/learnings/patterns/$artifact_name.md"
          local_file=".pi/learnings/patterns/$artifact_name.md"
          ;;
        mcp)
          central_file="$CENTRAL_PATH/mcp-configs/$artifact_name.json"
          local_file=".pi/mcp-configs/$artifact_name.json"
          ;;
        ext)
          central_file="$CENTRAL_PATH/extensions/$artifact_name/"
          local_file=".pi/extensions/$artifact_name/"
          ;;
      esac

      if [ -f "$local_file" ] || [ -d "$local_file" ]; then
        # Compare modification times or content
        UPDATED_ARTIFACTS["$artifact_id"]="$central_version"
      else
        # In catalog but file missing - treat as new
        NEW_ARTIFACTS["$artifact_id"]="$central_version"
      fi
    else
      UNCHANGED_ARTIFACTS["$artifact_id"]="$central_version"
    fi
  else
    NEW_ARTIFACTS["$artifact_id"]="${ARTIFACT_VERSIONS[$artifact_id]}"
  fi
done
```

### 6. Resolve Dependencies

```bash
# For each artifact to sync, resolve dependencies
declare -A DEPS_TO_INSTALL

resolve_dependencies() {
  local artifact_id="$1"
  local deps="${ARTIFACT_DEPENDENCIES[$artifact_id]}"

  if [ -z "$deps" ]; then
    return
  fi

  IFS=',' read -ra dep_array <<< "$deps"

  for dep in "${dep_array[@]}"; do
    dep=$(echo "$dep" | xargs)  # Trim whitespace

    # Check if dependency is already satisfied
    if [[ -v LOCAL_ARTIFACTS["$dep"] ]]; then
      continue
    fi

    # Check if dependency exists in central
    if [[ -v CENTRAL_ARTIFACTS["$dep"] ]]; then
      DEPS_TO_INSTALL["$dep"]="auto"

      # Recursively resolve dependencies
      resolve_dependencies "$dep"
    else
      echo "⚠️  Warning: Dependency $dep not found in central library"
    fi
  done
}

# Resolve for new artifacts
for artifact_id in "${!NEW_ARTIFACTS[@]}"; do
  resolve_dependencies "$artifact_id"
done

# Resolve for updated artifacts
for artifact_id in "${!UPDATED_ARTIFACTS[@]}"; do
  resolve_dependencies "$artifact_id"
done
```

### 7. Report Sync Status

```bash
if [ "$SILENT_MODE" != "true" ]; then
  echo "Sync Status:"
  echo "━━━━━━━━━━━━"
  echo ""

  # Group by artifact type
  declare -A NEW_BY_TYPE
  declare -A UPDATED_BY_TYPE
  declare -A UNCHANGED_BY_TYPE
  declare -A SKIPPED_BY_TYPE
  declare -A DEPS_BY_TYPE

  for artifact_id in "${!NEW_ARTIFACTS[@]}"; do
    type="${CENTRAL_ARTIFACTS[$artifact_id]}"
    NEW_BY_TYPE["$type"]+="$artifact_id "
  done

  for artifact_id in "${!UPDATED_ARTIFACTS[@]}"; do
    type="${CENTRAL_ARTIFACTS[$artifact_id]}"
    UPDATED_BY_TYPE["$type"]+="$artifact_id "
  done

  for artifact_id in "${!UNCHANGED_ARTIFACTS[@]}"; do
    type="${CENTRAL_ARTIFACTS[$artifact_id]}"
    UNCHANGED_BY_TYPE["$type"]+="$artifact_id "
  done

  for artifact_id in "${!SKIPPED_ARTIFACTS[@]}"; do
    type="${CENTRAL_ARTIFACTS[$artifact_id]}"
    SKIPPED_BY_TYPE["$type"]+="$artifact_id "
  done

  for artifact_id in "${!DEPS_TO_INSTALL[@]}"; do
    type="${CENTRAL_ARTIFACTS[$artifact_id]}"
    DEPS_BY_TYPE["$type"]+="$artifact_id "
  done

  # Report new artifacts
  for type in skills agents prompts workflows mcp_configs extensions learnings; do
    if [ -n "${NEW_BY_TYPE[$type]}" ]; then
      echo "🆕 New $type available:"
      for artifact_id in ${NEW_BY_TYPE[$type]}; do
        version="${ARTIFACT_VERSIONS[$artifact_id]}"
        desc="${ARTIFACT_DESCRIPTIONS[$artifact_id]}"
        echo "  - $artifact_id (v$version)"
        if [ -n "$desc" ]; then
          echo "    $desc"
        fi
      done
      echo ""
    fi
  done

  # Report dependencies
  if [ ${#DEPS_TO_INSTALL[@]} -gt 0 ]; then
    echo "📦 Dependencies to install (${#DEPS_TO_INSTALL[@]}):"
    for artifact_id in "${!DEPS_TO_INSTALL[@]}"; do
      echo "  - $artifact_id (required by other artifacts)"
    done
    echo ""
  fi

  # Report updated artifacts
  for type in skills agents prompts workflows mcp_configs extensions learnings; do
    if [ -n "${UPDATED_BY_TYPE[$type]}" ]; then
      echo "🔄 Updated $type available:"
      for artifact_id in ${UPDATED_BY_TYPE[$type]}; do
        central_version="${ARTIFACT_VERSIONS[$artifact_id]}"
        local_version="${LOCAL_VERSIONS[$artifact_id]}"
        echo "  - $artifact_id (v$local_version → v$central_version)"
      done
      echo ""
    fi
  done

  # Report skipped artifacts
  for type in skills agents prompts workflows mcp_configs extensions learnings; do
    if [ -n "${SKIPPED_BY_TYPE[$type]}" ]; then
      echo "⏭️  Skipped $type (local customizations):"
      for artifact_id in ${SKIPPED_BY_TYPE[$type]}; do
        echo "  - $artifact_id"
      done
      echo ""
    fi
  done

  # Report unchanged artifacts
  if [ ${#UNCHANGED_ARTIFACTS[@]} -gt 0 ]; then
    echo "✓ Up to date (${#UNCHANGED_ARTIFACTS[@]}):"
    # Just show count, not full list
    for type in skills agents prompts workflows mcp_configs extensions learnings; do
      if [ -n "${UNCHANGED_BY_TYPE[$type]}" ]; then
        count=$(echo "${UNCHANGED_BY_TYPE[$type]}" | wc -w | xargs)
        echo "  $type: $count"
      fi
    done
    echo ""
  fi
fi
```

### 8. Prompt for Sync Actions

```bash
# If no changes, exit early
total_changes=$((${#NEW_ARTIFACTS[@]} + ${#UPDATED_ARTIFACTS[@]} + ${#DEPS_TO_INSTALL[@]}))

if [ $total_changes -eq 0 ]; then
  if [ "$SILENT_MODE" != "true" ]; then
    echo "✅ Already in sync with central library"
  fi
  exit 0
fi

# Exit if dry run
if [ "$DRY_RUN" = "true" ]; then
  echo ""
  echo "Dry run complete. No changes made."
  exit 0
fi

# In silent mode, auto-pull new artifacts only
if [ "$SILENT_MODE" = "true" ]; then
  # Pull new artifacts and dependencies
  for artifact_id in "${!NEW_ARTIFACTS[@]}" "${!DEPS_TO_INSTALL[@]}"; do
    sync_artifact "$artifact_id"
  done

  # Skip updates in silent mode (preserve local state)
  exit 0
fi

# Interactive mode - prompt for each type of change

# 1. Dependencies (auto-install if enabled)
if [ ${#DEPS_TO_INSTALL[@]} -gt 0 ]; then
  auto_install="${PI_LIBRARY_AUTO_INSTALL_DEPS:-true}"

  if [ "$auto_install" = "true" ]; then
    echo "Installing dependencies..."
    for artifact_id in "${!DEPS_TO_INSTALL[@]}"; do
      sync_artifact "$artifact_id"
      echo "  ✓ Installed: $artifact_id (dependency)"
    done
    echo ""
  else
    read -p "Install ${#DEPS_TO_INSTALL[@]} dependencies? (y/n): " install_deps
    if [ "$install_deps" = "y" ]; then
      for artifact_id in "${!DEPS_TO_INSTALL[@]}"; do
        sync_artifact "$artifact_id"
        echo "  ✓ Installed: $artifact_id"
      done
    fi
    echo ""
  fi
fi

# 2. New artifacts
if [ ${#NEW_ARTIFACTS[@]} -gt 0 ]; then
  echo ""
  read -p "Pull ${#NEW_ARTIFACTS[@]} new artifacts? (y/n): " pull_new

  if [ "$pull_new" = "y" ]; then
    for artifact_id in "${!NEW_ARTIFACTS[@]}"; do
      sync_artifact "$artifact_id"
      echo "  ✓ Pulled: $artifact_id"
    done
  fi
  echo ""
fi

# 3. Updated artifacts
if [ ${#UPDATED_ARTIFACTS[@]} -gt 0 ]; then
  echo ""
  read -p "Update ${#UPDATED_ARTIFACTS[@]} existing artifacts? (y/n): " pull_updates

  if [ "$pull_updates" = "y" ]; then
    for artifact_id in "${!UPDATED_ARTIFACTS[@]}"; do
      sync_artifact "$artifact_id"
      echo "  ✓ Updated: $artifact_id"
    done
  fi
  echo ""
fi

# Helper function to sync a single artifact
sync_artifact() {
  local artifact_id="$1"
  local type="${CENTRAL_ARTIFACTS[$artifact_id]}"
  local artifact_name="${artifact_id#*:}"

  mkdir -p ".pi/$type"

  case "$type" in
    skills)
      # Copy entire skill directory
      cp -r "$CENTRAL_PATH/$type/$artifact_name" ".pi/$type/"
      ;;
    agents|prompts|workflows)
      # Copy markdown file
      cp "$CENTRAL_PATH/$type/$artifact_name.md" ".pi/$type/"
      ;;
    mcp_configs)
      # Copy JSON config
      cp "$CENTRAL_PATH/$type/$artifact_name.json" ".pi/mcp-configs/"
      mkdir -p ".pi/mcp-configs"
      ;;
    extensions)
      # Copy entire extension directory
      cp -r "$CENTRAL_PATH/$type/$artifact_name" ".pi/$type/"
      ;;
    learnings)
      # Copy pattern file
      mkdir -p ".pi/learnings/patterns"
      cp "$CENTRAL_PATH/learnings/patterns/$artifact_name.md" ".pi/learnings/patterns/"
      ;;
  esac

  # Update local catalog
  update_local_catalog "$artifact_id" "${ARTIFACT_VERSIONS[$artifact_id]}"
}

update_local_catalog() {
  local artifact_id="$1"
  local version="$2"
  local type="${CENTRAL_ARTIFACTS[$artifact_id]}"
  local artifact_name="${artifact_id#*:}"

  # This is simplified - real implementation should use proper YAML editing (yq)
  # For now, just track in a simple format

  if ! grep -q "$artifact_id" "$LOCAL_CATALOG"; then
    # Add to catalog under from_central section
    sed -i.bak "/^[[:space:]]*${type}:/a\\
  - name: \"${artifact_name}\"\\
    version: \"${version}\"\\
    synced: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
" "$LOCAL_CATALOG"
    rm "$LOCAL_CATALOG.bak"
  else
    # Update version
    sed -i.bak "s/name: \"${artifact_name}\".*/name: \"${artifact_name}\"/" "$LOCAL_CATALOG"
    sed -i.bak "s/version: \".*\" # ${artifact_name}/version: \"${version}\" # ${artifact_name}/" "$LOCAL_CATALOG"
    rm "$LOCAL_CATALOG.bak"
  fi
}
```

### 9. Update Local Catalog Metadata

```bash
# Update last_sync timestamp
if command -v yq &> /dev/null; then
  # Use yq if available for proper YAML editing
  yq -i ".metadata.last_sync = \"$(date -u +"%Y-%m-%d %H:%M:%S UTC")\"" "$LOCAL_CATALOG"
else
  # Fallback: simple sed replacement
  sed -i.bak "s/last_sync: .*/last_sync: $(date -u +"%Y-%m-%d %H:%M:%S UTC")/" "$LOCAL_CATALOG"
  rm "$LOCAL_CATALOG.bak"
fi
```

### 10. Report Summary

```bash
if [ "$SILENT_MODE" != "true" ]; then
  echo ""
  echo "✅ Sync complete"
  echo ""
  echo "Summary:"
  echo "  New artifacts: ${#NEW_ARTIFACTS[@]}"
  echo "  Dependencies: ${#DEPS_TO_INSTALL[@]}"
  echo "  Updates: ${#UPDATED_ARTIFACTS[@]}"
  echo "  Skipped (customized): ${#SKIPPED_ARTIFACTS[@]}"
  echo ""
  echo "Local catalog: $LOCAL_CATALOG"
  echo ""

  if [ $total_changes -gt 0 ]; then
    echo "Next steps:"
    echo ""
    echo "1. Review synced artifacts:"
    echo "   /library status"
    echo ""
    echo "2. Check specific artifact:"
    echo "   cat .pi/skills/commit/SKILL.md"
    echo "   cat .pi/agents/implementer.md"
    echo ""
    echo "3. Customize if needed:"
    echo "   /library customize skill:commit"
    echo ""
  fi
else
  # Silent mode: brief output
  if [ $total_changes -gt 0 ]; then
    echo "✓ Synced $total_changes artifacts from central library"
  fi
fi
```

### 11. Post-Sync Actions

```bash
# Optional: Run post-sync hooks
if [ -f ".pi/hooks/post-sync" ]; then
  if [ "$SILENT_MODE" != "true" ]; then
    echo "Running post-sync hooks..."
  fi

  bash ".pi/hooks/post-sync"
fi

# Optional: Rebuild prompt templates if prompts were synced
if [ ${#NEW_ARTIFACTS[@]} -gt 0 ] || [ ${#UPDATED_ARTIFACTS[@]} -gt 0 ]; then
  for artifact_id in "${!NEW_ARTIFACTS[@]}" "${!UPDATED_ARTIFACTS[@]}"; do
    if [[ "$artifact_id" == prompt:* ]]; then
      # Prompt was synced - may need to rebuild agent prompts
      if [ -f ".pi/scripts/compile-prompts.sh" ]; then
        if [ "$SILENT_MODE" != "true" ]; then
          echo "Recompiling agent prompts..."
        fi
        bash ".pi/scripts/compile-prompts.sh"
      fi
      break
    fi
  done
fi
```

---

## Usage Examples

### Sync All Artifacts

```bash
/library sync
```

**Output:**
```
📦 Found 47 artifacts in central library

Sync Status:
━━━━━━━━━━━━

🆕 New skills available:
  - skill:commit (v1.2.0)
    Git commit workflow with TDD
  - skill:review-pr (v1.0.0)
    Pull request review automation

🆕 New agents available:
  - agent:implementer (v2.1.0)
    Feature implementation with Convex patterns

📦 Dependencies to install (1):
  - prompt:base-agent (required by agent:implementer)

🔄 Updated prompts available:
  - prompt:typescript-strict (v1.0.0 → v1.1.0)

⏭️  Skipped agents (local customizations):
  - agent:reviewer

✓ Up to date (42):
  skills: 8
  agents: 5
  prompts: 12
  learnings: 17

Install 1 dependencies? (y/n): y
  ✓ Installed: prompt:base-agent (dependency)

Pull 3 new artifacts? (y/n): y
  ✓ Pulled: skill:commit
  ✓ Pulled: skill:review-pr
  ✓ Pulled: agent:implementer

Update 1 existing artifacts? (y/n): y
  ✓ Updated: prompt:typescript-strict

✅ Sync complete

Summary:
  New artifacts: 3
  Dependencies: 1
  Updates: 1
  Skipped (customized): 1

Local catalog: .pi/library/catalog.yaml

Next steps:

1. Review synced artifacts:
   /library status

2. Check specific artifact:
   cat .pi/skills/commit/SKILL.md
   cat .pi/agents/implementer.md

3. Customize if needed:
   /library customize skill:commit
```

---

### Sync Specific Artifact Types

```bash
/library sync --only skills,agents
```

**Output:**
```
📦 Found 20 artifacts matching filter

Sync Status:
━━━━━━━━━━━━

🆕 New skills available:
  - skill:commit (v1.2.0)
  - skill:review-pr (v1.0.0)

🆕 New agents available:
  - agent:implementer (v2.1.0)

📦 Dependencies to install (1):
  - prompt:base-agent (required by agent:implementer)

Note: Dependency prompt:base-agent is outside filter scope.
      Use '--only skills,agents,prompts' to include it.

Pull 3 new artifacts? (y/n): y
  ✓ Pulled: skill:commit
  ✓ Pulled: skill:review-pr
  ⚠️  Skipped: agent:implementer (missing dependency: prompt:base-agent)

✅ Sync complete

Summary:
  New artifacts: 2
  Dependencies: 0 (1 skipped due to filter)
  Updates: 0
  Skipped (customized): 0
```

---

### Sync Specific Artifacts

```bash
/library sync --only skill:commit,agent:implementer
```

**Output:**
```
📦 Found 2 artifacts matching filter

Sync Status:
━━━━━━━━━━━━

🆕 New artifacts available:
  - skill:commit (v1.2.0)
  - agent:implementer (v2.1.0)

📦 Dependencies to install (1):
  - prompt:base-agent (required by agent:implementer)

Install 1 dependencies? (y/n): y
  ✓ Installed: prompt:base-agent

Pull 2 new artifacts? (y/n): y
  ✓ Pulled: skill:commit
  ✓ Pulled: agent:implementer

✅ Sync complete
```

---

### Force Overwrite Local Customizations

```bash
/library sync --force
```

**Output:**
```
🔄 Updated agents available:
  - agent:implementer (v2.0.0 → v2.1.0)

⚠️  Local customizations will be overwritten:
  - agent:implementer (last modified: 2026-03-17)

Update 1 existing artifacts? (y/n): y
  ✓ Updated: agent:implementer (local customization overwritten)

⚠️  Local customizations were overwritten
    Backup created: .pi/library/backups/backup-20260318-103422/

✅ Sync complete
```

---

### Silent Mode (Orchestrator Auto-Sync)

```bash
/library sync --silent
```

**Output:**
```
✓ Synced 3 artifacts from central library
```

**Behavior:**
- No prompts
- Pulls all new artifacts automatically
- Auto-installs dependencies
- Skips updates (preserves local state)
- Brief summary only

---

### Dry Run Preview

```bash
/library sync --dry-run
```

**Output:**
```
📦 Found 47 artifacts in central library

Sync Status:
━━━━━━━━━━━━

🆕 New skills available:
  - skill:commit (v1.2.0)
  - skill:review-pr (v1.0.0)

📦 Dependencies to install (1):
  - prompt:base-agent

🔄 Updated prompts available:
  - prompt:typescript-strict (v1.0.0 → v1.1.0)

Dry run complete. No changes made.
```

---

### First Sync (New Project)

```bash
# New project, no local catalog yet
cd ~/projects/new-project
/library sync
```

**Output:**
```
📦 Found 47 artifacts in central library

Creating local catalog...

Sync Status:
━━━━━━━━━━━━

🆕 New artifacts available:
  All 47 artifacts from central library

Pull 47 new artifacts? (y/n): y
  ✓ Pulled: skill:commit
  ✓ Pulled: skill:review-pr
  ✓ Pulled: agent:implementer
  ... (44 more)

✅ Sync complete

Summary:
  New artifacts: 47
  Dependencies: 8
  Updates: 0
  Skipped (customized): 0

Local catalog: .pi/library/catalog.yaml

🎉 Project now has all accumulated artifacts!

Next steps:

1. Review artifacts:
   /library status

2. Start using them:
   /commit
   /review-pr
```

---

## Integration with Orchestrator

### Session Start Hook

Add to `.pi/hooks/session-start` or orchestrator workflow:

```bash
# Auto-sync library on session start
if [ "${PI_LIBRARY_AUTO_SYNC:-false}" = "true" ]; then
  /library sync --silent
fi
```

**Configuration:**
```bash
# In ~/.pi/config.sh
export PI_LIBRARY_AUTO_SYNC="true"
export PI_LIBRARY_AUTO_INSTALL_DEPS="true"
```

---

## Merge Strategy

When conflicts arise, priority is (high to low):

1. **Local customizations** - Project-specific overrides
2. **Project artifacts** - Project-only artifacts
3. **Central library** - Shared artifacts from central
4. **Global defaults** - Machine-wide defaults

**Example:**
```
artifact: agent:implementer

Sources:
  1. Local customization (.pi/agents/implementer.md) ✓ USED
  2. Central library (~/.pi/library-central/agents/implementer.md)

Result: Uses local customization, skips central update
        (unless --force flag is used)
```

---

## Error Handling

### Central Library Not Found

```bash
❌ Central library not found at: ~/.pi/library-central

Initialize first with:
  /library init
```

**Fix:**
```bash
/library init
```

---

### No Artifacts in Central

```bash
ℹ️  No artifacts in central library yet

Push artifacts from projects with:
  /library push skill:my-skill
  /library push agent:my-agent
```

**Fix:**
```bash
# From a project with artifacts
/library push skill:commit
/library push agent:implementer
```

---

### Missing Dependencies

```bash
⚠️  Cannot install agent:implementer
    Missing dependency: prompt:base-agent
    Dependency not found in central library

Options:
  1. Push missing dependency first:
     /library push prompt:base-agent

  2. Skip this artifact:
     Continue without agent:implementer
```

**Fix:**
```bash
# Push the missing dependency
/library push prompt:base-agent

# Then retry sync
/library sync
```

---

### Conflict with Local Customizations

```bash
⚠️  agent:implementer has local customizations
    Central version: v2.1.0 (2026-03-18)
    Local modified:  2026-03-17 14:32

Options:
  1. Keep local (skip update)
  2. Use central (discard local changes)
  3. Show diff and decide

Choice: 3

# Shows diff
--- Local: .pi/agents/implementer.md
+++ Central: ~/.pi/library-central/agents/implementer.md
@@ -15,7 +15,7 @@
-model: anthropic/claude-sonnet-4-5
+model: anthropic/claude-opus-4-6

 # Project-specific note: Using Sonnet for cost savings

Keep local or use central? (local/central): local
  ⏭️  Skipped: agent:implementer (local customization preserved)
```

---

### Git Sync Issues

```bash
⚠️  Central library is behind remote
    Local: 2026-03-18 10:00
    Remote: 2026-03-18 14:30

Pulling latest from remote...
git pull origin main

✅ Central library updated
   Now syncing to project...

[continues with normal sync]
```

---

## Advanced Usage

### Selective Sync with Exclusions

```bash
# Sync everything except extensions
/library sync --only skills,agents,prompts,workflows,mcp_configs,learnings
```

---

### Sync from Alternative Central

```bash
# One-time sync from different central location
PI_LIBRARY_CENTRAL=~/work/library-work /library sync
```

---

### Sync with Backup

```bash
# Create backup before syncing
/library sync --backup

# Backs up to: .pi/library/backups/backup-YYYYMMDD-HHMMSS/
```

---

### Sync Specific Version

```bash
# Sync specific version (not latest)
/library sync --only agent:implementer@2.0.0
```

---

## Verification

After sync, verify artifacts are available:

```bash
# Check local catalog
cat .pi/library/catalog.yaml

# List artifact files
ls -la .pi/skills/
ls -la .pi/agents/
ls -la .pi/prompts/

# View status
/library status

# Should show artifacts from central marked with 🌐
```

---

## Performance Optimization

For large libraries (100+ artifacts):

```bash
# 1. Use specific type filters
/library sync --only skills,agents

# 2. Use --silent mode in automation
/library sync --silent

# 3. Configure selective sync in project
# In .pi/config.sh:
export PI_LIBRARY_SYNC_TYPES="skills,agents,prompts,learnings"
```

---

## Artifact-Specific Sync Notes

### Skills
- Copies entire skill directory (SKILL.md + cookbook/)
- Preserves local cookbooks if customized

### Agents
- Copies single .md file
- Checks for local model overrides

### Prompts
- Copies .md file
- Auto-recompiles agent prompts if changed
- Handles includes/dependencies

### Workflows
- Copies workflow .md file
- Updates orchestrator if workflow is referenced

### MCP Configs
- Copies JSON config to .pi/mcp-configs/
- Does NOT sync API keys (local only)
- Updates .pi/mcp.json if needed

### Extensions
- Copies entire extension directory
- Runs npm install if package.json exists
- Registers with pi if autoload enabled

### Learnings
- Copies pattern files
- Compatible with legacy /learnings commands
- Auto-applies promoted patterns if configured

---

## Troubleshooting

### Sync Appears Stuck

```bash
# Check if catalog is locked
rm .pi/library/.sync.lock

# Retry sync
/library sync
```

### Corrupted Local Catalog

```bash
# Backup current catalog
cp .pi/library/catalog.yaml .pi/library/catalog.yaml.backup

# Reset catalog
rm .pi/library/catalog.yaml

# Re-sync
/library sync

# Review and restore customizations from backup
```

### Partial Sync

```bash
# If sync was interrupted, check status
/library status

# Resume sync
/library sync

# Will continue from where it left off
```

---

## See Also

- Initialize central library: [cookbook/init.md](init.md)
- Install specific artifact: [cookbook/install.md](install.md)
- Push artifacts to central: [cookbook/push.md](push.md)
- Check sync status: [cookbook/status.md](status.md)
- Customize artifacts: [cookbook/customize.md](customize.md)
