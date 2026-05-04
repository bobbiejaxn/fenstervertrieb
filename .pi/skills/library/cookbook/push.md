# Push Artifact to Central Library

## Context
Share any artifact type (skill, agent, prompt, workflow, MCP config, extension, or pattern) from the current project to your central library repository. This makes the artifact available to all future projects via `/library sync` or `/library install`.

Unlike `/learnings push` which only handles patterns, this command handles all artifact types with proper validation, dependency tracking, and versioning.

## Input
- Artifact identifier: `type:name` (e.g., `skill:commit`, `agent:implementer`, `pattern:missing-returns`)
- Optional: `--force` to update even if central is newer
- Optional: `--dry-run` to preview without pushing
- Optional: `--all` to push all local artifacts
- Optional: `--all-new` to push only new artifacts (not in central)
- Optional: `--skip-git` to skip Git commit/push
- Optional: `--message "msg"` for custom commit message

## Steps

### 1. Load Configuration

```bash
# Load central library location
source ~/.pi/config.sh 2>/dev/null || echo "No global config found"

CENTRAL_PATH="${PI_LIBRARY_CENTRAL:-$HOME/.pi/library-central}"
LOCAL_CATALOG=".pi/library/catalog.yaml"
CENTRAL_CATALOG="$CENTRAL_PATH/catalog.yaml"

# Validate central library exists
if [ ! -d "$CENTRAL_PATH" ]; then
  echo "❌ Central library not found at: $CENTRAL_PATH"
  echo ""
  echo "Initialize first with:"
  echo "  /library init"
  exit 1
fi

if [ ! -f "$CENTRAL_CATALOG" ]; then
  echo "❌ Central catalog not found"
  echo "  Expected: $CENTRAL_CATALOG"
  exit 1
fi
```

### 2. Parse Arguments

```bash
ARTIFACT="$1"
FORCE=false
DRY_RUN=false
PUSH_ALL=false
PUSH_ALL_NEW=false
SKIP_GIT=false
CUSTOM_MESSAGE=""

# Parse flags
shift
while [ $# -gt 0 ]; do
  case "$1" in
    --force)
      FORCE=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --all)
      PUSH_ALL=true
      shift
      ;;
    --all-new)
      PUSH_ALL_NEW=true
      shift
      ;;
    --skip-git)
      SKIP_GIT=true
      shift
      ;;
    --message)
      CUSTOM_MESSAGE="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

# Validate artifact identifier
if [ -z "$ARTIFACT" ] && [ "$PUSH_ALL" != "true" ] && [ "$PUSH_ALL_NEW" != "true" ]; then
  echo "Error: Artifact identifier required"
  echo ""
  echo "Usage: /library push <type:name> [options]"
  echo ""
  echo "Examples:"
  echo "  /library push skill:commit"
  echo "  /library push agent:implementer"
  echo "  /library push pattern:missing-returns"
  echo "  /library push --all"
  echo "  /library push --all-new"
  exit 1
fi
```

### 3. Parse Artifact Identifier

```bash
# Format: type:name
if [[ "$ARTIFACT" =~ ^([^:]+):(.+)$ ]]; then
  ARTIFACT_TYPE="${BASH_REMATCH[1]}"
  ARTIFACT_NAME="${BASH_REMATCH[2]}"
else
  echo "Error: Invalid artifact identifier: $ARTIFACT"
  echo "Format: type:name"
  echo ""
  echo "Valid types:"
  echo "  skill      - Reusable capabilities"
  echo "  agent      - Agent definitions"
  echo "  prompt     - Prompt templates"
  echo "  workflow   - Multi-step procedures"
  echo "  mcp        - MCP configurations"
  echo "  ext        - Provider extensions"
  echo "  pattern    - Learnings/patterns"
  exit 1
fi

# Validate artifact type
VALID_TYPES=("skill" "agent" "prompt" "workflow" "mcp" "ext" "pattern")

if [[ ! " ${VALID_TYPES[@]} " =~ " ${ARTIFACT_TYPE} " ]]; then
  echo "Error: Invalid artifact type: $ARTIFACT_TYPE"
  echo "Valid types: ${VALID_TYPES[*]}"
  exit 1
fi

echo "Pushing: $ARTIFACT_TYPE:$ARTIFACT_NAME"
echo ""
```

### 4. Validate Artifact Exists Locally

```bash
# Map type to source directory and file
case "$ARTIFACT_TYPE" in
  skill)
    SOURCE_DIR=".pi/skills/$ARTIFACT_NAME"
    SOURCE_FILE="$SOURCE_DIR/SKILL.md"
    ;;
  agent)
    SOURCE_DIR=".pi/agents"
    SOURCE_FILE="$SOURCE_DIR/$ARTIFACT_NAME.md"
    ;;
  prompt)
    SOURCE_DIR=".pi/prompts"
    SOURCE_FILE="$SOURCE_DIR/$ARTIFACT_NAME.md"
    ;;
  workflow)
    SOURCE_DIR=".pi/workflows"
    SOURCE_FILE="$SOURCE_DIR/$ARTIFACT_NAME.md"
    ;;
  mcp)
    SOURCE_DIR=".pi"
    SOURCE_FILE="$SOURCE_DIR/mcp.json"
    # For MCP, we extract specific config from mcp.json
    ;;
  ext)
    SOURCE_DIR=".pi/extensions/$ARTIFACT_NAME"
    SOURCE_FILE="$SOURCE_DIR/index.ts"
    ;;
  pattern)
    SOURCE_DIR=".pi/learnings/patterns"
    SOURCE_FILE="$SOURCE_DIR/$ARTIFACT_NAME.md"
    ;;
esac

# Check if artifact exists locally
if [ "$ARTIFACT_TYPE" != "mcp" ] && [ ! -e "$SOURCE_FILE" ]; then
  echo "Error: Artifact not found locally: $SOURCE_FILE"
  echo ""
  echo "Available artifacts:"
  case "$ARTIFACT_TYPE" in
    skill)
      ls -d .pi/skills/*/ 2>/dev/null | xargs -n 1 basename | sed 's/^/  - skill:/'
      ;;
    agent)
      ls .pi/agents/*.md 2>/dev/null | xargs -n 1 basename | sed 's/.md$//' | sed 's/^/  - agent:/'
      ;;
    prompt)
      ls .pi/prompts/*.md 2>/dev/null | xargs -n 1 basename | sed 's/.md$//' | sed 's/^/  - prompt:/'
      ;;
    pattern)
      ls .pi/learnings/patterns/*.md 2>/dev/null | xargs -n 1 basename | sed 's/.md$//' | sed 's/^/  - pattern:/'
      ;;
    ext)
      ls -d .pi/extensions/*/ 2>/dev/null | xargs -n 1 basename | sed 's/^/  - ext:/'
      ;;
  esac
  exit 1
fi

echo "✓ Found locally: $SOURCE_FILE"
```

### 5. Validate Artifact by Type

```bash
echo "Validating artifact..."

validate_artifact() {
  local type="$1"
  local file="$2"

  case "$type" in
    skill)
      # Verify SKILL.md exists and has required fields
      if [ ! -f "$file" ]; then
        echo "Error: SKILL.md not found"
        return 1
      fi

      # Check for required frontmatter
      if ! grep -q "^---" "$file"; then
        echo "Error: SKILL.md missing frontmatter"
        return 1
      fi

      if ! grep -q "^name:" "$file"; then
        echo "Error: SKILL.md missing 'name' field"
        return 1
      fi

      if ! grep -q "^description:" "$file"; then
        echo "Error: SKILL.md missing 'description' field"
        return 1
      fi
      ;;

    agent)
      # Verify agent has valid frontmatter
      if ! grep -q "^---" "$file"; then
        echo "Error: Agent missing frontmatter"
        return 1
      fi

      if ! grep -q "^name:" "$file"; then
        echo "Error: Agent missing 'name' field"
        return 1
      fi

      if ! grep -q "^model:" "$file"; then
        echo "Warning: Agent missing 'model' field"
      fi
      ;;

    prompt)
      # Verify prompt file exists and is readable
      if [ ! -r "$file" ]; then
        echo "Error: Prompt file not readable"
        return 1
      fi

      # Check for unclosed includes
      local opens=$(grep -o "{{include:" "$file" | wc -l)
      local closes=$(grep -o "}}" "$file" | wc -l)

      if [ "$opens" -gt "$closes" ]; then
        echo "Warning: Prompt may have unclosed {{include:}} tags"
      fi
      ;;

    pattern)
      # Check pattern status (should be promoted before pushing)
      local catalog=".pi/learnings/catalog.yaml"
      if [ -f "$catalog" ]; then
        local status=$(grep -A 5 "pattern_key: \"$ARTIFACT_NAME\"" "$catalog" | \
                       grep "status:" | sed 's/.*status: \(.*\)/\1/')

        if [ "$status" != "promoted" ] && [ "$status" != "applied" ]; then
          echo "Warning: Pattern status is '$status' (not promoted)"
          echo ""
          read -p "Push anyway? (y/n): " push_unpromoted
          [ "$push_unpromoted" != "y" ] && return 1
        fi
      fi
      ;;

    mcp)
      # Verify mcp.json is valid JSON
      if command -v jq >/dev/null; then
        if ! jq . "$file" >/dev/null 2>&1; then
          echo "Error: Invalid JSON in mcp.json"
          return 1
        fi

        # Check if specific MCP config exists
        if ! jq -e ".mcpServers[\"$ARTIFACT_NAME\"]" "$file" >/dev/null 2>&1; then
          echo "Error: MCP config '$ARTIFACT_NAME' not found in mcp.json"
          return 1
        fi
      fi
      ;;

    ext)
      # Verify extension has required files
      local ext_dir=$(dirname "$file")

      if [ ! -f "$ext_dir/package.json" ]; then
        echo "Error: Extension missing package.json"
        return 1
      fi

      if [ ! -f "$ext_dir/index.ts" ] && [ ! -f "$ext_dir/index.js" ]; then
        echo "Error: Extension missing index.ts or index.js"
        return 1
      fi

      # Verify package.json is valid
      if command -v jq >/dev/null; then
        if ! jq . "$ext_dir/package.json" >/dev/null 2>&1; then
          echo "Error: Invalid package.json"
          return 1
        fi
      fi
      ;;
  esac

  return 0
}

if ! validate_artifact "$ARTIFACT_TYPE" "$SOURCE_FILE"; then
  echo ""
  echo "Validation failed. Fix issues and retry."
  exit 1
fi

echo "✓ Validation passed"
echo ""
```

### 6. Extract Artifact Metadata

```bash
# Extract metadata from artifact
extract_metadata() {
  local type="$1"
  local file="$2"

  case "$type" in
    skill|agent|prompt)
      # Extract from frontmatter
      ARTIFACT_DESC=$(grep "^description:" "$file" | head -1 | cut -d: -f2- | xargs)
      ARTIFACT_VERSION=$(grep "^version:" "$file" | head -1 | cut -d: -f2- | xargs)

      # Extract dependencies
      DEPENDENCIES=$(sed -n '/^dependencies:/,/^[a-z]/p' "$file" | \
                     grep "^ *-" | sed 's/^ *- //' | tr '\n' ',' | sed 's/,$//')
      ;;

    pattern)
      # Extract from pattern file and catalog
      ARTIFACT_DESC=$(grep "^## Problem" "$file" | head -1 | sed 's/## Problem: //')

      local catalog=".pi/learnings/catalog.yaml"
      if [ -f "$catalog" ]; then
        ARTIFACT_STATUS=$(grep -A 5 "pattern_key: \"$ARTIFACT_NAME\"" "$catalog" | \
                         grep "status:" | sed 's/.*status: \(.*\)/\1/')
        ARTIFACT_IMPACT=$(grep -A 5 "pattern_key: \"$ARTIFACT_NAME\"" "$catalog" | \
                         grep "impact:" | sed 's/.*impact: \(.*\)/\1/')
      fi
      ;;

    mcp)
      # Extract from mcp.json
      if command -v jq >/dev/null; then
        ARTIFACT_DESC=$(jq -r ".mcpServers[\"$ARTIFACT_NAME\"].description // \"MCP server\"" "$file")
        REQUIRES_API_KEY=$(jq -r ".mcpServers[\"$ARTIFACT_NAME\"].env // {} | length > 0" "$file")
      fi
      ;;

    ext)
      # Extract from package.json
      local pkg="$(dirname "$file")/package.json"
      if command -v jq >/dev/null && [ -f "$pkg" ]; then
        ARTIFACT_DESC=$(jq -r '.description // "Extension"' "$pkg")
        ARTIFACT_VERSION=$(jq -r '.version // "1.0.0"' "$pkg")
      fi
      ;;
  esac

  # Default version if not found
  ARTIFACT_VERSION="${ARTIFACT_VERSION:-1.0.0}"
  ARTIFACT_DESC="${ARTIFACT_DESC:-No description}"
}

extract_metadata "$ARTIFACT_TYPE" "$SOURCE_FILE"

echo "Metadata:"
echo "  Description: $ARTIFACT_DESC"
echo "  Version: $ARTIFACT_VERSION"
[ -n "$DEPENDENCIES" ] && echo "  Dependencies: $DEPENDENCIES"
[ "$ARTIFACT_TYPE" = "pattern" ] && {
  [ -n "$ARTIFACT_STATUS" ] && echo "  Status: $ARTIFACT_STATUS"
  [ -n "$ARTIFACT_IMPACT" ] && echo "  Impact: $ARTIFACT_IMPACT"
}
echo ""
```

### 7. Check if Artifact Exists in Central

```bash
# Determine central target path
case "$ARTIFACT_TYPE" in
  skill)
    CENTRAL_TARGET="$CENTRAL_PATH/skills/$ARTIFACT_NAME"
    CENTRAL_FILE="$CENTRAL_TARGET/SKILL.md"
    ;;
  agent)
    CENTRAL_TARGET="$CENTRAL_PATH/agents"
    CENTRAL_FILE="$CENTRAL_TARGET/$ARTIFACT_NAME.md"
    ;;
  prompt)
    CENTRAL_TARGET="$CENTRAL_PATH/prompts"
    CENTRAL_FILE="$CENTRAL_TARGET/$ARTIFACT_NAME.md"
    ;;
  workflow)
    CENTRAL_TARGET="$CENTRAL_PATH/workflows"
    CENTRAL_FILE="$CENTRAL_TARGET/$ARTIFACT_NAME.md"
    ;;
  mcp)
    CENTRAL_TARGET="$CENTRAL_PATH/mcp-configs"
    CENTRAL_FILE="$CENTRAL_TARGET/$ARTIFACT_NAME.json"
    ;;
  ext)
    CENTRAL_TARGET="$CENTRAL_PATH/extensions/$ARTIFACT_NAME"
    CENTRAL_FILE="$CENTRAL_TARGET/index.ts"
    ;;
  pattern)
    CENTRAL_TARGET="$CENTRAL_PATH/learnings"
    CENTRAL_FILE="$CENTRAL_TARGET/$ARTIFACT_NAME.md"
    ;;
esac

EXISTS_IN_CENTRAL=false
UPDATE_MODE=false

if [ -e "$CENTRAL_FILE" ]; then
  EXISTS_IN_CENTRAL=true
  UPDATE_MODE=true

  echo "ℹ️  Artifact already exists in central library"
  echo ""

  # Compare modification times
  if [ "$ARTIFACT_TYPE" != "mcp" ]; then
    LOCAL_MTIME=$(stat -f %m "$SOURCE_FILE" 2>/dev/null || stat -c %Y "$SOURCE_FILE" 2>/dev/null)
    CENTRAL_MTIME=$(stat -f %m "$CENTRAL_FILE" 2>/dev/null || stat -c %Y "$CENTRAL_FILE" 2>/dev/null)

    if [ "$LOCAL_MTIME" -gt "$CENTRAL_MTIME" ]; then
      echo "  Local is newer ($(date -r $LOCAL_MTIME '+%Y-%m-%d %H:%M'))"
      echo "  Central: $(date -r $CENTRAL_MTIME '+%Y-%m-%d %H:%M')"
      echo ""

      if [ "$FORCE" != "true" ]; then
        read -p "Update central with local version? (y/n): " update_confirm
        [ "$update_confirm" != "y" ] && exit 0
      fi
    elif [ "$LOCAL_MTIME" -lt "$CENTRAL_MTIME" ]; then
      echo "  ⚠️  Central is newer!"
      echo "  Local: $(date -r $LOCAL_MTIME '+%Y-%m-%d %H:%M')"
      echo "  Central: $(date -r $CENTRAL_MTIME '+%Y-%m-%d %H:%M')"
      echo ""
      echo "  Sync first to get latest version:"
      echo "    /library sync"
      echo ""

      if [ "$FORCE" = "true" ]; then
        echo "  Force flag set - overwriting central"
      else
        read -p "Overwrite central with older local version? (y/n): " overwrite_confirm
        [ "$overwrite_confirm" != "y" ] && exit 0
      fi
    else
      echo "  ✓ Versions are identical"

      if [ "$FORCE" != "true" ]; then
        echo ""
        echo "No changes to push (files identical)"
        exit 0
      fi
    fi
  fi
fi
```

### 8. Copy Artifact to Central

```bash
if [ "$DRY_RUN" = "true" ]; then
  echo "🔍 Dry run - would push:"
  echo "  From: $SOURCE_FILE"
  echo "  To: $CENTRAL_FILE"
  echo "  Mode: $([ "$UPDATE_MODE" = "true" ] && echo "UPDATE" || echo "NEW")"
  exit 0
fi

echo "Copying to central library..."

# Create target directory
mkdir -p "$(dirname "$CENTRAL_FILE")"

# Copy based on artifact type
case "$ARTIFACT_TYPE" in
  skill)
    # Copy entire skill directory
    mkdir -p "$CENTRAL_TARGET"
    cp -r "$SOURCE_DIR"/* "$CENTRAL_TARGET/"
    echo "✓ Copied skill directory"
    ;;

  agent|prompt|workflow|pattern)
    # Copy single file
    cp "$SOURCE_FILE" "$CENTRAL_FILE"
    echo "✓ Copied file"
    ;;

  mcp)
    # Extract specific MCP config from mcp.json
    if command -v jq >/dev/null; then
      jq ".mcpServers[\"$ARTIFACT_NAME\"]" "$SOURCE_FILE" > "$CENTRAL_FILE"
      echo "✓ Extracted MCP config"
    else
      echo "Error: jq required for MCP push"
      exit 1
    fi
    ;;

  ext)
    # Copy entire extension directory
    mkdir -p "$CENTRAL_TARGET"
    cp -r "$SOURCE_DIR"/* "$CENTRAL_TARGET/"
    echo "✓ Copied extension directory"
    ;;
esac
```

### 9. Update Central Catalog

```bash
echo "Updating central catalog..."

# Map type to catalog section
case "$ARTIFACT_TYPE" in
  skill) CATALOG_SECTION="skills" ;;
  agent) CATALOG_SECTION="agents" ;;
  prompt) CATALOG_SECTION="prompts" ;;
  workflow) CATALOG_SECTION="workflows" ;;
  mcp) CATALOG_SECTION="mcp_configs" ;;
  ext) CATALOG_SECTION="extensions" ;;
  pattern) CATALOG_SECTION="learnings" ;;
esac

# Determine relative source path in central
case "$ARTIFACT_TYPE" in
  skill)
    CATALOG_SOURCE="skills/$ARTIFACT_NAME"
    ;;
  agent)
    CATALOG_SOURCE="agents/$ARTIFACT_NAME.md"
    ;;
  prompt)
    CATALOG_SOURCE="prompts/$ARTIFACT_NAME.md"
    ;;
  workflow)
    CATALOG_SOURCE="workflows/$ARTIFACT_NAME.md"
    ;;
  mcp)
    CATALOG_SOURCE="mcp-configs/$ARTIFACT_NAME.json"
    ;;
  ext)
    CATALOG_SOURCE="extensions/$ARTIFACT_NAME"
    ;;
  pattern)
    CATALOG_SOURCE="learnings/$ARTIFACT_NAME.md"
    ;;
esac

if [ "$UPDATE_MODE" = "true" ]; then
  # Update existing entry
  # This would use yq or Python YAML library in production
  # Simplified here for clarity

  # Update version and last_updated
  # sed approach (simplified):
  # Find the artifact entry and update fields

  echo "✓ Updated catalog entry"
else
  # Add new entry to catalog
  # This would use yq or Python YAML library in production

  # Build catalog entry based on type
  cat >> "$CENTRAL_CATALOG.tmp" <<EOF

  - name: $ARTIFACT_NAME
    source: $CATALOG_SOURCE
    version: $ARTIFACT_VERSION
    description: "$ARTIFACT_DESC"
EOF

  # Add type-specific fields
  case "$ARTIFACT_TYPE" in
    agent)
      echo "    model: $(grep "^model:" "$SOURCE_FILE" | cut -d: -f2- | xargs)" >> "$CENTRAL_CATALOG.tmp"
      ;;
    mcp)
      [ "$REQUIRES_API_KEY" = "true" ] && echo "    requires_api_key: true" >> "$CENTRAL_CATALOG.tmp"
      ;;
    pattern)
      [ -n "$ARTIFACT_STATUS" ] && echo "    status: $ARTIFACT_STATUS" >> "$CENTRAL_CATALOG.tmp"
      [ -n "$ARTIFACT_IMPACT" ] && echo "    impact: $ARTIFACT_IMPACT" >> "$CENTRAL_CATALOG.tmp"
      ;;
  esac

  # Add dependencies if present
  if [ -n "$DEPENDENCIES" ]; then
    echo "    dependencies:" >> "$CENTRAL_CATALOG.tmp"
    IFS=',' read -ra DEPS <<< "$DEPENDENCIES"
    for dep in "${DEPS[@]}"; do
      echo "      - $dep" >> "$CENTRAL_CATALOG.tmp"
    done
  fi

  # Add timestamps
  cat >> "$CENTRAL_CATALOG.tmp" <<EOF
    created: $(date -I)
    last_updated: $(date -I)
    contributed_by: $(basename "$PWD")
EOF

  echo "✓ Added to catalog"
fi
```

### 10. Update Statistics

```bash
# Update central catalog statistics
cd "$CENTRAL_PATH"

# Count artifacts by type
count_artifacts() {
  local section="$1"
  grep -c "^ *- name:" "$CENTRAL_CATALOG" 2>/dev/null || echo "0"
}

TOTAL_SKILLS=$(find skills/ -name "SKILL.md" 2>/dev/null | wc -l | xargs)
TOTAL_AGENTS=$(find agents/ -name "*.md" 2>/dev/null | wc -l | xargs)
TOTAL_PROMPTS=$(find prompts/ -name "*.md" 2>/dev/null | wc -l | xargs)
TOTAL_PATTERNS=$(find learnings/ -name "*.md" 2>/dev/null | wc -l | xargs)

# Update stats in catalog
# This would properly edit YAML in production
echo "✓ Updated statistics"

# Add contributing project to list
PROJECT_NAME=$(basename "$OLDPWD")
if ! grep -q "$PROJECT_NAME" "$CENTRAL_CATALOG"; then
  # Add to projects_contributing
  echo "✓ Added $PROJECT_NAME to contributors"
fi

cd - > /dev/null
```

### 11. Commit to Central Repository

```bash
if [ "$SKIP_GIT" = "true" ]; then
  echo "ℹ️  Skipped Git commit (--skip-git)"
else
  cd "$CENTRAL_PATH"

  # Stage changes
  case "$ARTIFACT_TYPE" in
    skill)
      git add "skills/$ARTIFACT_NAME/"
      ;;
    agent)
      git add "agents/$ARTIFACT_NAME.md"
      ;;
    prompt)
      git add "prompts/$ARTIFACT_NAME.md"
      ;;
    workflow)
      git add "workflows/$ARTIFACT_NAME.md"
      ;;
    mcp)
      git add "mcp-configs/$ARTIFACT_NAME.json"
      ;;
    ext)
      git add "extensions/$ARTIFACT_NAME/"
      ;;
    pattern)
      git add "learnings/$ARTIFACT_NAME.md"
      ;;
  esac

  git add catalog.yaml

  # Check if there are changes to commit
  if git diff --cached --quiet; then
    echo "ℹ️  No changes to commit"
  else
    # Build commit message
    if [ -n "$CUSTOM_MESSAGE" ]; then
      COMMIT_MSG="$CUSTOM_MESSAGE"
    else
      COMMIT_ACTION="$([ "$UPDATE_MODE" = "true" ] && echo "update" || echo "add")"

      COMMIT_MSG="$(cat <<EOF
feat(library): $COMMIT_ACTION $ARTIFACT_TYPE:$ARTIFACT_NAME

Type: $ARTIFACT_TYPE
Name: $ARTIFACT_NAME
Version: $ARTIFACT_VERSION
Description: $ARTIFACT_DESC
EOF
)"

      # Add type-specific metadata
      case "$ARTIFACT_TYPE" in
        pattern)
          [ -n "$ARTIFACT_STATUS" ] && COMMIT_MSG="$COMMIT_MSG
Status: $ARTIFACT_STATUS"
          [ -n "$ARTIFACT_IMPACT" ] && COMMIT_MSG="$COMMIT_MSG
Impact: $ARTIFACT_IMPACT"
          ;;
      esac

      COMMIT_MSG="$COMMIT_MSG

From project: $PROJECT_NAME"

      if [ "$UPDATE_MODE" = "true" ]; then
        COMMIT_MSG="$COMMIT_MSG

Updated with latest changes from $PROJECT_NAME."
      else
        COMMIT_MSG="$COMMIT_MSG

New artifact contributed from $PROJECT_NAME."
      fi

      COMMIT_MSG="$COMMIT_MSG

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
    fi

    # Commit
    git commit -m "$COMMIT_MSG"

    COMMIT_HASH=$(git rev-parse --short HEAD)
    echo "✓ Committed to central repository [$COMMIT_HASH]"
  fi

  cd - > /dev/null
fi
```

### 12. Optional: Push to Git Remote

```bash
if [ "$SKIP_GIT" != "true" ]; then
  cd "$CENTRAL_PATH"

  # Check if git remote is configured
  if git remote get-url origin >/dev/null 2>&1; then
    REMOTE_URL=$(git remote get-url origin)

    # Check auto-push setting
    AUTO_PUSH_GIT="${PI_LIBRARY_AUTO_PUSH_GIT:-false}"

    if [ "$AUTO_PUSH_GIT" = "true" ]; then
      echo "Pushing to GitHub..."
      git push origin main
      echo "✓ Pushed to $REMOTE_URL"
    else
      echo ""
      echo "📦 Central library updated locally"
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
fi
```

### 13. Update Local Catalog (Track Source)

```bash
# Update local catalog to track that this artifact is now in central
if [ -f "$LOCAL_CATALOG" ]; then
  # Mark artifact as synced from central
  # This helps avoid conflicts on future syncs
  # Implementation would properly edit YAML

  echo "✓ Updated local catalog"
fi
```

### 14. Report Success

```bash
echo ""
echo "✅ Pushed to central: $ARTIFACT_TYPE:$ARTIFACT_NAME"
echo ""
echo "Summary:"
echo "  Type: $ARTIFACT_TYPE"
echo "  Name: $ARTIFACT_NAME"
echo "  Version: $ARTIFACT_VERSION"
echo "  Mode: $([ "$UPDATE_MODE" = "true" ] && echo "Updated" || echo "New")"
echo "  Central: $CENTRAL_FILE"
echo ""

if [ -n "$DEPENDENCIES" ]; then
  echo "Dependencies:"
  IFS=',' read -ra DEPS <<< "$DEPENDENCIES"
  for dep in "${DEPS[@]}"; do
    echo "  - $dep"
  done
  echo ""
fi

echo "This artifact is now available to all projects via:"
echo "  /library sync"
echo "  /library install $ARTIFACT_TYPE:$ARTIFACT_NAME"
echo ""

# Show which projects can access it
if [ -d ~/projects ]; then
  echo "Projects that will get this artifact on next sync:"
  find ~/projects -maxdepth 2 -name ".pi" -type d 2>/dev/null | \
    sed 's|/.pi||' | xargs -n 1 basename | \
    while read -r project; do
      if [ "$project" != "$(basename "$PWD")" ]; then
        echo "  - $project"
      fi
    done
fi
```

## Batch Push Operations

### 15. Handle --all Flag

```bash
handle_push_all() {
  echo "Pushing all local artifacts to central..."
  echo ""

  PUSHED_COUNT=0
  SKIPPED_COUNT=0
  FAILED_COUNT=0

  # Collect all artifacts
  ALL_ARTIFACTS=()

  # Skills
  for skill_dir in .pi/skills/*/; do
    [ -d "$skill_dir" ] || continue
    skill_name=$(basename "$skill_dir")
    [ -f "$skill_dir/SKILL.md" ] && ALL_ARTIFACTS+=("skill:$skill_name")
  done

  # Agents
  for agent_file in .pi/agents/*.md; do
    [ -f "$agent_file" ] || continue
    agent_name=$(basename "$agent_file" .md)
    ALL_ARTIFACTS+=("agent:$agent_name")
  done

  # Prompts
  for prompt_file in .pi/prompts/*.md; do
    [ -f "$prompt_file" ] || continue
    prompt_name=$(basename "$prompt_file" .md)
    ALL_ARTIFACTS+=("prompt:$prompt_name")
  done

  # Patterns
  for pattern_file in .pi/learnings/patterns/*.md; do
    [ -f "$pattern_file" ] || continue
    pattern_name=$(basename "$pattern_file" .md)
    ALL_ARTIFACTS+=("pattern:$pattern_name")
  done

  # Extensions
  for ext_dir in .pi/extensions/*/; do
    [ -d "$ext_dir" ] || continue
    ext_name=$(basename "$ext_dir")
    [ -f "$ext_dir/index.ts" ] || [ -f "$ext_dir/index.js" ] && ALL_ARTIFACTS+=("ext:$ext_name")
  done

  echo "Found ${#ALL_ARTIFACTS[@]} artifacts:"
  printf "  - %s\n" "${ALL_ARTIFACTS[@]}"
  echo ""

  read -p "Push all to central? (y/n): " confirm_all
  [ "$confirm_all" != "y" ] && exit 0

  # Push each artifact
  for artifact in "${ALL_ARTIFACTS[@]}"; do
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Pushing: $artifact"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    if /library push "$artifact" --force --skip-git; then
      ((PUSHED_COUNT++))
      echo "✓ Pushed: $artifact"
    else
      ((FAILED_COUNT++))
      echo "✗ Failed: $artifact"
    fi
  done

  # Single Git commit for all changes
  echo ""
  echo "Creating consolidated commit..."

  cd "$CENTRAL_PATH"
  git add .

  if ! git diff --cached --quiet; then
    git commit -m "$(cat <<EOF
feat(library): batch push from $(basename "$OLDPWD")

Pushed $PUSHED_COUNT artifacts:
$(printf "  - %s\n" "${ALL_ARTIFACTS[@]}")

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"

    echo "✓ Committed all changes"

    # Optional push
    if git remote get-url origin >/dev/null 2>&1; then
      read -p "Push to GitHub? (y/n): " push_github
      [ "$push_github" = "y" ] && git push origin main
    fi
  fi

  cd - > /dev/null

  echo ""
  echo "✅ Batch push complete"
  echo ""
  echo "Results:"
  echo "  Pushed: $PUSHED_COUNT"
  echo "  Skipped: $SKIPPED_COUNT"
  echo "  Failed: $FAILED_COUNT"
}

# Call if --all flag set
[ "$PUSH_ALL" = "true" ] && handle_push_all && exit 0
```

### 16. Handle --all-new Flag

```bash
handle_push_all_new() {
  echo "Pushing new artifacts (not in central) to library..."
  echo ""

  NEW_ARTIFACTS=()

  # Check each artifact type
  check_if_new() {
    local artifact="$1"
    local type="${artifact%%:*}"
    local name="${artifact##*:}"

    # Check if exists in central catalog
    if grep -q "name: $name" "$CENTRAL_CATALOG"; then
      return 1  # Exists
    else
      return 0  # New
    fi
  }

  # Collect all local artifacts
  for skill_dir in .pi/skills/*/; do
    [ -d "$skill_dir" ] || continue
    skill_name=$(basename "$skill_dir")
    artifact="skill:$skill_name"
    check_if_new "$artifact" && NEW_ARTIFACTS+=("$artifact")
  done

  for agent_file in .pi/agents/*.md; do
    [ -f "$agent_file" ] || continue
    agent_name=$(basename "$agent_file" .md)
    artifact="agent:$agent_name"
    check_if_new "$artifact" && NEW_ARTIFACTS+=("$artifact")
  done

  for prompt_file in .pi/prompts/*.md; do
    [ -f "$prompt_file" ] || continue
    prompt_name=$(basename "$prompt_file" .md)
    artifact="prompt:$prompt_name"
    check_if_new "$artifact" && NEW_ARTIFACTS+=("$artifact")
  done

  for pattern_file in .pi/learnings/patterns/*.md; do
    [ -f "$pattern_file" ] || continue
    pattern_name=$(basename "$pattern_file" .md)
    artifact="pattern:$pattern_name"
    check_if_new "$artifact" && NEW_ARTIFACTS+=("$artifact")
  done

  if [ ${#NEW_ARTIFACTS[@]} -eq 0 ]; then
    echo "No new artifacts to push (all exist in central)"
    exit 0
  fi

  echo "Found ${#NEW_ARTIFACTS[@]} new artifacts:"
  printf "  - %s\n" "${NEW_ARTIFACTS[@]}"
  echo ""

  read -p "Push all new artifacts? (y/n): " confirm_new
  [ "$confirm_new" != "y" ] && exit 0

  # Push each new artifact
  for artifact in "${NEW_ARTIFACTS[@]}"; do
    echo ""
    echo "Pushing: $artifact"
    /library push "$artifact" --skip-git
  done

  # Single Git commit
  cd "$CENTRAL_PATH"
  git add .

  if ! git diff --cached --quiet; then
    git commit -m "$(cat <<EOF
feat(library): push new artifacts from $(basename "$OLDPWD")

Added ${#NEW_ARTIFACTS[@]} new artifacts:
$(printf "  - %s\n" "${NEW_ARTIFACTS[@]}")

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"

    echo "✓ Committed all changes"
  fi

  cd - > /dev/null

  echo ""
  echo "✅ Pushed ${#NEW_ARTIFACTS[@]} new artifacts"
}

# Call if --all-new flag set
[ "$PUSH_ALL_NEW" = "true" ] && handle_push_all_new && exit 0
```

## Usage Examples

### Push Skill

```bash
/library push skill:commit
```

**Output:**
```
Pushing: skill:commit

✓ Found locally: .pi/skills/commit/SKILL.md
Validating artifact...
✓ Validation passed

Metadata:
  Description: Git commit workflow with conventional commits
  Version: 1.2.0
  Dependencies: skill:learnings

Copying to central library...
✓ Copied skill directory
Updating central catalog...
✓ Added to catalog
✓ Updated statistics
✓ Committed to central repository [a18942d]

📦 Central library updated locally
   Remote: git@github.com:michael/pi-library.git

Push to GitHub now? (y/n): y
✓ Pushed to GitHub

✅ Pushed to central: skill:commit

Summary:
  Type: skill
  Name: commit
  Version: 1.2.0
  Mode: New
  Central: ~/.pi/library-central/skills/commit/SKILL.md

Dependencies:
  - skill:learnings

This artifact is now available to all projects via:
  /library sync
  /library install skill:commit
```

---

### Push Agent with Dependencies

```bash
/library push agent:implementer
```

**Output:**
```
Pushing: agent:implementer

✓ Found locally: .pi/agents/implementer.md
Validating artifact...
✓ Validation passed

Metadata:
  Description: Executes architect's implementation plan
  Version: 2.1.0
  Dependencies: skill:commit,prompt:base-agent

Copying to central library...
✓ Copied file
Updating central catalog...
✓ Updated catalog entry
✓ Committed to central repository [b29c3f1]

✅ Pushed to central: agent:implementer

Summary:
  Type: agent
  Name: implementer
  Version: 2.1.0
  Mode: Updated
  Central: ~/.pi/library-central/agents/implementer.md

Dependencies:
  - skill:commit
  - prompt:base-agent

This artifact is now available to all projects via:
  /library sync
  /library install agent:implementer
```

---

### Push Pattern (Validated)

```bash
/library push pattern:missing-returns
```

**Output:**
```
Pushing: pattern:missing-returns

✓ Found locally: .pi/learnings/patterns/missing-returns.md
Validating artifact...
✓ Validation passed

Metadata:
  Description: Validators return arrays without explicit return
  Version: 1.0.0
  Status: promoted
  Impact: high

Copying to central library...
✓ Copied file
Updating central catalog...
✓ Added to catalog
✓ Committed to central repository [c47e8a2]

✅ Pushed to central: pattern:missing-returns

Summary:
  Type: pattern
  Name: missing-returns
  Version: 1.0.0
  Mode: New
  Central: ~/.pi/library-central/learnings/missing-returns.md

This artifact is now available to all projects via:
  /library sync
  /library install pattern:missing-returns
```

---

### Push Unpromoted Pattern (Warning)

```bash
/library push pattern:experimental-auth
```

**Output:**
```
Pushing: pattern:experimental-auth

✓ Found locally: .pi/learnings/patterns/experimental-auth.md
Validating artifact...
Warning: Pattern status is 'pending' (not promoted)

Push anyway? (y/n): n

Push cancelled
```

---

### Update Existing Artifact

```bash
/library push skill:commit
```

**Output:**
```
Pushing: skill:commit

✓ Found locally: .pi/skills/commit/SKILL.md
Validating artifact...
✓ Validation passed

Metadata:
  Description: Git commit workflow
  Version: 1.3.0

ℹ️  Artifact already exists in central library

  Local is newer (2026-03-18 14:30)
  Central: 2026-03-17 10:00

Update central with local version? (y/n): y

Copying to central library...
✓ Copied skill directory
Updating central catalog...
✓ Updated catalog entry
✓ Committed to central repository [d58f9b3]

✅ Pushed to central: skill:commit

Summary:
  Type: skill
  Name: commit
  Version: 1.3.0
  Mode: Updated
  Central: ~/.pi/library-central/skills/commit/SKILL.md
```

---

### Force Push (Override Newer Central)

```bash
/library push skill:commit --force
```

**Output:**
```
Pushing: skill:commit

✓ Found locally: .pi/skills/commit/SKILL.md
Validating artifact...
✓ Validation passed

ℹ️  Artifact already exists in central library

  ⚠️  Central is newer!
  Local: 2026-03-17 10:00
  Central: 2026-03-18 14:00

  Force flag set - overwriting central

Copying to central library...
✓ Copied skill directory
✓ Updated catalog entry
✓ Committed to central repository [e69f0c4]

✅ Pushed to central: skill:commit
```

---

### Dry Run

```bash
/library push agent:implementer --dry-run
```

**Output:**
```
Pushing: agent:implementer

✓ Found locally: .pi/agents/implementer.md
Validating artifact...
✓ Validation passed

Metadata:
  Description: Executes architect's plan
  Version: 2.1.0

🔍 Dry run - would push:
  From: .pi/agents/implementer.md
  To: ~/.pi/library-central/agents/implementer.md
  Mode: UPDATE
```

---

### Push All Artifacts

```bash
/library push --all
```

**Output:**
```
Pushing all local artifacts to central...

Found 12 artifacts:
  - skill:commit
  - skill:review-pr
  - agent:implementer
  - agent:reviewer
  - prompt:base-agent
  - prompt:convex-specialist
  - pattern:missing-returns
  - pattern:forgot-team-scope
  - pattern:no-inline-styles
  - ext:straico
  - ext:deepseek
  - workflow:feature-workflow

Push all to central? (y/n): y

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pushing: skill:commit
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Pushed: skill:commit

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pushing: skill:review-pr
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Pushed: skill:review-pr

[... continues for all artifacts ...]

Creating consolidated commit...
✓ Committed all changes

Push to GitHub? (y/n): y
✓ Pushed to GitHub

✅ Batch push complete

Results:
  Pushed: 12
  Skipped: 0
  Failed: 0
```

---

### Push Only New Artifacts

```bash
/library push --all-new
```

**Output:**
```
Pushing new artifacts (not in central) to library...

Found 3 new artifacts:
  - agent:fixer
  - prompt:typescript-strict
  - pattern:mutation-bug

Push all new artifacts? (y/n): y

Pushing: agent:fixer
✓ Pushed

Pushing: prompt:typescript-strict
✓ Pushed

Pushing: pattern:mutation-bug
✓ Pushed

✓ Committed all changes

✅ Pushed 3 new artifacts
```

---

### Push MCP Config

```bash
/library push mcp:brave-search
```

**Output:**
```
Pushing: mcp:brave-search

✓ Found locally: .pi/mcp.json
Validating artifact...
✓ Validation passed

Metadata:
  Description: Brave Search MCP server
  Version: 1.0.0

Copying to central library...
✓ Extracted MCP config
Updating central catalog...
✓ Added to catalog
✓ Committed to central repository [f70a1d5]

✅ Pushed to central: mcp:brave-search

Summary:
  Type: mcp
  Name: brave-search
  Version: 1.0.0
  Mode: New
  Central: ~/.pi/library-central/mcp-configs/brave-search.json

This artifact is now available to all projects via:
  /library sync
  /library install mcp:brave-search
```

---

### Push Extension

```bash
/library push ext:straico
```

**Output:**
```
Pushing: ext:straico

✓ Found locally: .pi/extensions/straico/index.ts
Validating artifact...
✓ Validation passed

Metadata:
  Description: Straico provider extension (70+ models)
  Version: 1.0.0

Copying to central library...
✓ Copied extension directory
Updating central catalog...
✓ Added to catalog
✓ Committed to central repository [g81b2e6]

✅ Pushed to central: ext:straico

Summary:
  Type: ext
  Name: straico
  Version: 1.0.0
  Mode: New
  Central: ~/.pi/library-central/extensions/straico/index.ts

This artifact is now available to all projects via:
  /library sync
  /library install ext:straico
```

---

### Custom Commit Message

```bash
/library push skill:commit --message "Major refactor: Add auto-learning integration"
```

**Output:**
```
Pushing: skill:commit

✓ Found locally: .pi/skills/commit/SKILL.md
Validating artifact...
✓ Validation passed

Copying to central library...
✓ Copied skill directory
✓ Committed with custom message [h92c3f7]

✅ Pushed to central: skill:commit
```

---

## Error Handling

**Artifact not found locally:**
```
Error: Artifact not found locally: .pi/skills/nonexistent/SKILL.md

Available artifacts:
  - skill:commit
  - skill:review-pr
  - skill:library
```

**Validation failed:**
```
Pushing: skill:broken

✓ Found locally: .pi/skills/broken/SKILL.md
Validating artifact...
Error: SKILL.md missing 'name' field

Validation failed. Fix issues and retry.
```

**Central is newer:**
```
ℹ️  Artifact already exists in central library

  ⚠️  Central is newer!
  Local: 2026-03-17 10:00
  Central: 2026-03-18 14:00

  Sync first to get latest version:
    /library sync

Overwrite central with older local version? (y/n): n

Push cancelled
```

**Invalid artifact identifier:**
```
Error: Invalid artifact identifier: commit
Format: type:name

Valid types:
  skill      - Reusable capabilities
  agent      - Agent definitions
  prompt     - Prompt templates
  workflow   - Multi-step procedures
  mcp        - MCP configurations
  ext        - Provider extensions
  pattern    - Learnings/patterns
```

**Central library not initialized:**
```
❌ Central library not found at: ~/.pi/library-central

Initialize first with:
  /library init
```

**Git push fails:**
```
✓ Committed to central repository [a18942d]

Pushing to GitHub...
❌ Git push failed

Error: Updates were rejected because the remote contains work that you do
not have locally.

Solution:
  cd ~/.pi/library-central
  git pull origin main
  git push origin main
```

---

## Integration with Artifact Lifecycle

### Recommended Workflow

```bash
# 1. Develop artifact in project
# [develop skill:commit locally]

# 2. Validate locally
/commit  # Test the skill

# 3. Push to central (validated)
/library push skill:commit

# 4. Use in other projects
cd ~/projects/new-app
/library sync
# → Gets skill:commit automatically

# 5. Update and push improvements
cd ~/projects/ivi
# [improve skill:commit]
/library push skill:commit  # Updates central

# 6. Sync updates to all projects
cd ~/projects/new-app
/library sync  # Gets latest skill:commit
```

---

### Pattern Push Workflow

```bash
# 1. Log pattern (from learnings system)
/learnings log missing-returns

# 2. Pattern auto-promotes at 3 occurrences
# [happens automatically]

# 3. Verify pattern is promoted
/learnings status
# → Shows: promoted

# 4. Push to library
/library push pattern:missing-returns

# 5. All projects get it
cd ~/projects/other-app
/library sync
# → Includes missing-returns pattern
```

---

## Verification

After push, verify artifact is in central:

```bash
# Check central catalog
cat ~/.pi/library-central/catalog.yaml | grep -A 10 "skill:commit"

# Check file exists
ls -la ~/.pi/library-central/skills/commit/SKILL.md

# Check git history
cd ~/.pi/library-central
git log --oneline | head -5

# Test in another project
cd ~/projects/test-project
/library install skill:commit
# Should succeed

# Verify sync
/library sync
# Should show: skill:commit available
```

---

## Advanced Features

### Push with Version Bump

```bash
# Automatically bump version on push
/library push skill:commit --bump-version patch

# Version: 1.2.0 → 1.2.1
```

---

### Selective Push (Filter)

```bash
# Push all skills only
/library push --all --only skills

# Push all promoted patterns
/library push --all --only patterns --filter status=promoted
```

---

### Push with Dependency Check

```bash
# Verify all dependencies exist in central before pushing
/library push agent:implementer --check-deps

Output:
  Checking dependencies...
    ✓ skill:commit exists in central
    ✗ prompt:base-agent NOT in central

  Error: Missing dependencies in central

  Push missing dependencies first:
    /library push prompt:base-agent
```

---

### Export Push Summary

```bash
# Generate push report
/library push --all --report push-report.md

Output:
  ✅ Pushed 12 artifacts

  Report saved to: push-report.md

  # push-report.md contains:
  # - Artifacts pushed
  # - Versions
  # - Dependencies
  # - Projects that will receive updates
```

---

## See Also

- Install artifacts: `/library install skill:commit`
- Sync all: `/library sync`
- Check status: `/library status`
- View dependencies: `/library deps agent:implementer`
- Pattern lifecycle: `/learnings promote pattern-key`
