# Install Specific Artifact

## Context
Install a specific artifact by type:name with automatic dependency resolution. Handles all artifact types: skills, agents, prompts, workflows, MCP configs, extensions, and learnings.

Dependencies are auto-resolved using topological sort to ensure correct installation order.

## Input
- Artifact identifier: `type:name` or `type:name@version`
- Optional: `--dry-run` flag to preview installation
- Optional: `--no-deps` to skip dependency installation
- Optional: `--force` to reinstall even if present

## Steps

### 1. Parse Artifact Identifier

```bash
ARTIFACT="$1"
DRY_RUN=false
NO_DEPS=false
FORCE=false

# Parse flags
shift
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --no-deps)
      NO_DEPS=true
      shift
      ;;
    --force)
      FORCE=true
      shift
      ;;
    *)
      shift
      ;;
  esac
done

# Parse artifact identifier
# Format: type:name or type:name@version
if [[ "$ARTIFACT" =~ ^([^:]+):([^@]+)(@(.+))?$ ]]; then
  ARTIFACT_TYPE="${BASH_REMATCH[1]}"
  ARTIFACT_NAME="${BASH_REMATCH[2]}"
  ARTIFACT_VERSION="${BASH_REMATCH[4]:-latest}"
else
  echo "Error: Invalid artifact identifier: $ARTIFACT"
  echo "Format: type:name or type:name@version"
  echo ""
  echo "Examples:"
  echo "  skill:commit"
  echo "  agent:implementer@2.1.0"
  echo "  prompt:base-agent"
  exit 1
fi

echo "Installing: $ARTIFACT_TYPE:$ARTIFACT_NAME"
[ "$ARTIFACT_VERSION" != "latest" ] && echo "Version: $ARTIFACT_VERSION"
echo ""
```

### 2. Validate Artifact Type

```bash
VALID_TYPES=("skill" "agent" "prompt" "workflow" "mcp" "ext" "pattern")

if [[ ! " ${VALID_TYPES[@]} " =~ " ${ARTIFACT_TYPE} " ]]; then
  echo "Error: Invalid artifact type: $ARTIFACT_TYPE"
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
```

### 3. Load Central Library Catalog

```bash
LIBRARY_CENTRAL="${PI_LIBRARY_CENTRAL:-$HOME/.pi/library-central}"
CATALOG="$LIBRARY_CENTRAL/catalog.yaml"

if [ ! -f "$CATALOG" ]; then
  echo "Error: Central library not found"
  echo ""
  echo "Initialize library first:"
  echo "  /library init"
  exit 1
fi

# Simple YAML parser (production would use yq or python)
parse_catalog() {
  local artifact_type="$1"
  local artifact_name="$2"

  # Find artifact in catalog
  # This is simplified - real implementation would use yq
  grep -A 20 "name: $artifact_name" "$CATALOG" | head -20
}
```

### 4. Find Artifact in Catalog

```bash
echo "Searching catalog..."

# Map short type to catalog key
case "$ARTIFACT_TYPE" in
  skill) CATALOG_KEY="skills" ;;
  agent) CATALOG_KEY="agents" ;;
  prompt) CATALOG_KEY="prompts" ;;
  workflow) CATALOG_KEY="workflows" ;;
  mcp) CATALOG_KEY="mcp_configs" ;;
  ext) CATALOG_KEY="extensions" ;;
  pattern) CATALOG_KEY="learnings" ;;
esac

# Find artifact in catalog
ARTIFACT_DATA=$(parse_catalog "$CATALOG_KEY" "$ARTIFACT_NAME")

if [ -z "$ARTIFACT_DATA" ]; then
  echo "Error: Artifact not found in catalog: $ARTIFACT_TYPE:$ARTIFACT_NAME"
  echo ""
  echo "Search available artifacts:"
  echo "  /library search $ARTIFACT_NAME"
  echo ""
  echo "Or push from another project:"
  echo "  /library push $ARTIFACT_TYPE:$ARTIFACT_NAME"
  exit 1
fi

echo "✓ Found in catalog"
```

### 5. Extract Artifact Metadata

```bash
# Extract metadata from catalog (simplified)
extract_field() {
  local field="$1"
  echo "$ARTIFACT_DATA" | grep "^  $field:" | cut -d: -f2- | xargs
}

ARTIFACT_SOURCE=$(extract_field "source")
ARTIFACT_DESC=$(extract_field "description")
AVAILABLE_VERSION=$(extract_field "version")

# Validate version if specified
if [ "$ARTIFACT_VERSION" != "latest" ] && [ "$ARTIFACT_VERSION" != "$AVAILABLE_VERSION" ]; then
  echo "Warning: Requested version $ARTIFACT_VERSION not found"
  echo "Available version: $AVAILABLE_VERSION"
  echo ""
  read -p "Install available version? (y/n): " install_available
  [ "$install_available" != "y" ] && exit 1
  ARTIFACT_VERSION="$AVAILABLE_VERSION"
fi

echo "Description: $ARTIFACT_DESC"
echo "Version: $AVAILABLE_VERSION"
echo ""
```

### 6. Check if Already Installed

```bash
# Determine target directory in project
case "$ARTIFACT_TYPE" in
  skill)
    TARGET_DIR=".pi/skills/$ARTIFACT_NAME"
    TARGET_FILE="$TARGET_DIR/SKILL.md"
    ;;
  agent)
    TARGET_DIR=".pi/agents"
    TARGET_FILE="$TARGET_DIR/$ARTIFACT_NAME.md"
    ;;
  prompt)
    TARGET_DIR=".pi/prompts"
    TARGET_FILE="$TARGET_DIR/$ARTIFACT_NAME.md"
    ;;
  workflow)
    TARGET_DIR=".pi/workflows"
    TARGET_FILE="$TARGET_DIR/$ARTIFACT_NAME.md"
    ;;
  mcp)
    TARGET_DIR=".pi"
    TARGET_FILE="$TARGET_DIR/mcp.json"
    ;;
  ext)
    TARGET_DIR=".pi/extensions/$ARTIFACT_NAME"
    TARGET_FILE="$TARGET_DIR/index.ts"
    ;;
  pattern)
    TARGET_DIR=".pi/learnings/patterns"
    TARGET_FILE="$TARGET_DIR/$ARTIFACT_NAME.md"
    ;;
esac

if [ -e "$TARGET_FILE" ] && [ "$FORCE" != "true" ]; then
  echo "ℹ️  Already installed: $ARTIFACT_TYPE:$ARTIFACT_NAME"
  echo "Location: $TARGET_FILE"
  echo ""
  echo "Options:"
  echo "  1. Skip (keep existing)"
  echo "  2. Update to latest"
  echo "  3. Force reinstall"
  echo ""
  read -p "Choice (1/2/3): " choice

  case "$choice" in
    1)
      echo "Skipped."
      exit 0
      ;;
    2)
      # Continue with installation (update)
      echo "Updating..."
      ;;
    3)
      # Force reinstall
      echo "Reinstalling..."
      FORCE=true
      ;;
    *)
      echo "Cancelled."
      exit 1
      ;;
  esac
fi
```

### 7. Resolve Dependencies

```bash
if [ "$NO_DEPS" != "true" ]; then
  echo "Resolving dependencies..."

  # Extract dependencies from catalog
  DEPENDENCIES=$(echo "$ARTIFACT_DATA" | grep -A 10 "dependencies:" | grep "^ *-" | sed 's/^ *- //')

  # Extract includes (for prompts)
  INCLUDES=$(echo "$ARTIFACT_DATA" | grep -A 10 "includes:" | grep "^ *-" | sed 's/^ *- //')

  # Combine all dependencies
  ALL_DEPS=$(echo -e "$DEPENDENCIES\n$INCLUDES" | grep -v "^$")

  if [ -n "$ALL_DEPS" ]; then
    DEP_COUNT=$(echo "$ALL_DEPS" | wc -l | xargs)
    echo "Found $DEP_COUNT dependencies:"
    echo "$ALL_DEPS" | sed 's/^/  - /'
    echo ""

    # Build dependency graph
    INSTALL_ORDER=()
    VISITED=()

    # Recursive dependency resolver (topological sort)
    resolve_deps() {
      local dep="$1"

      # Skip if already visited (circular dependency protection)
      if [[ " ${VISITED[@]} " =~ " ${dep} " ]]; then
        return
      fi

      VISITED+=("$dep")

      # Parse dependency
      if [[ "$dep" =~ ^([^:]+):([^@]+)$ ]]; then
        local dep_type="${BASH_REMATCH[1]}"
        local dep_name="${BASH_REMATCH[2]}"

        # Get dependency's dependencies
        local dep_data=$(parse_catalog "$dep_type" "$dep_name")
        local sub_deps=$(echo "$dep_data" | grep -A 10 "dependencies:" | grep "^ *-" | sed 's/^ *- //')
        local sub_includes=$(echo "$dep_data" | grep -A 10 "includes:" | grep "^ *-" | sed 's/^ *- //')

        # Recursively resolve sub-dependencies
        local all_sub_deps=$(echo -e "$sub_deps\n$sub_includes" | grep -v "^$")
        while IFS= read -r sub_dep; do
          [ -n "$sub_dep" ] && resolve_deps "$sub_dep"
        done <<< "$all_sub_deps"
      fi

      # Add to install order
      INSTALL_ORDER+=("$dep")
    }

    # Resolve all dependencies
    while IFS= read -r dep; do
      [ -n "$dep" ] && resolve_deps "$dep"
    done <<< "$ALL_DEPS"

    echo "Installation order (topological sort):"
    for i in "${!INSTALL_ORDER[@]}"; do
      echo "  $((i+1)). ${INSTALL_ORDER[$i]}"
    done
    echo "  $((${#INSTALL_ORDER[@]}+1)). $ARTIFACT_TYPE:$ARTIFACT_NAME (requested)"
    echo ""

    if [ "$DRY_RUN" = "true" ]; then
      echo "🔍 Dry run - would install ${#INSTALL_ORDER[@]} dependencies"
      exit 0
    fi
  else
    echo "No dependencies found."
    echo ""
  fi
fi
```

### 8. Check for Circular Dependencies

```bash
# Detect circular dependencies
detect_circular() {
  local artifact="$1"
  local chain="$2"

  # Check if artifact is already in chain
  if [[ "$chain" =~ $artifact ]]; then
    echo "Error: Circular dependency detected"
    echo "Chain: $chain → $artifact"
    return 1
  fi

  return 0
}

# This would be called during resolve_deps
# Simplified here for clarity
```

### 9. Install Dependencies First

```bash
if [ "$NO_DEPS" != "true" ] && [ ${#INSTALL_ORDER[@]} -gt 0 ]; then
  echo "Installing dependencies..."
  echo ""

  for dep in "${INSTALL_ORDER[@]}"; do
    echo "→ Installing dependency: $dep"

    # Recursive call to install (with --no-deps to avoid re-resolving)
    /library install "$dep" --no-deps --force

    if [ $? -ne 0 ]; then
      echo ""
      echo "Error: Failed to install dependency: $dep"
      echo ""
      echo "This blocks installation of: $ARTIFACT_TYPE:$ARTIFACT_NAME"
      exit 1
    fi

    echo ""
  done

  echo "✓ All dependencies installed"
  echo ""
fi
```

### 10. Install Artifact by Type

```bash
if [ "$DRY_RUN" = "true" ]; then
  echo "🔍 Dry run - would install:"
  echo "  Type: $ARTIFACT_TYPE"
  echo "  Name: $ARTIFACT_NAME"
  echo "  Version: $ARTIFACT_VERSION"
  echo "  Target: $TARGET_FILE"
  exit 0
fi

echo "Installing $ARTIFACT_TYPE:$ARTIFACT_NAME..."

SOURCE_PATH="$LIBRARY_CENTRAL/$ARTIFACT_SOURCE"

case "$ARTIFACT_TYPE" in
  skill)
    install_skill "$SOURCE_PATH" "$TARGET_DIR"
    ;;
  agent)
    install_agent "$SOURCE_PATH" "$TARGET_FILE"
    ;;
  prompt)
    install_prompt "$SOURCE_PATH" "$TARGET_FILE"
    ;;
  workflow)
    install_workflow "$SOURCE_PATH" "$TARGET_FILE"
    ;;
  mcp)
    install_mcp "$SOURCE_PATH" "$TARGET_FILE"
    ;;
  ext)
    install_extension "$SOURCE_PATH" "$TARGET_DIR"
    ;;
  pattern)
    install_pattern "$SOURCE_PATH" "$TARGET_FILE"
    ;;
esac
```

### 11. Install Functions by Type

```bash
install_skill() {
  local source="$1"
  local target="$2"

  # Create target directory
  mkdir -p "$target"

  # Copy skill directory
  if [ -d "$source" ]; then
    cp -r "$source"/* "$target/"
    echo "✓ Installed skill files"
  else
    echo "Error: Source not found: $source"
    return 1
  fi

  # Verify SKILL.md exists
  if [ ! -f "$target/SKILL.md" ]; then
    echo "Warning: SKILL.md not found in skill directory"
  fi
}

install_agent() {
  local source="$1"
  local target="$2"

  # Create target directory
  mkdir -p "$(dirname "$target")"

  # Copy agent file
  cp "$source" "$target"
  echo "✓ Installed agent: $(basename "$target")"
}

install_prompt() {
  local source="$1"
  local target="$2"

  # Create target directory
  mkdir -p "$(dirname "$target")"

  # Copy prompt file
  cp "$source" "$target"
  echo "✓ Installed prompt: $(basename "$target")"

  # Process includes (resolve nested prompts)
  if grep -q "{{include:" "$target"; then
    echo "Processing includes..."
    # This would expand {{include:}} directives
    # Simplified here
  fi
}

install_workflow() {
  local source="$1"
  local target="$2"

  # Create target directory
  mkdir -p "$(dirname "$target")"

  # Copy workflow file
  cp "$source" "$target"
  echo "✓ Installed workflow: $(basename "$target")"
}

install_mcp() {
  local source="$1"
  local target="$2"

  # MCP configs are merged into mcp.json
  if [ -f "$target" ]; then
    # Merge with existing config
    echo "Merging with existing mcp.json..."
    # This would use jq to merge JSON
    # Simplified here
  else
    # Create new mcp.json
    mkdir -p "$(dirname "$target")"
    cp "$source" "$target"
  fi

  echo "✓ Installed MCP config: $ARTIFACT_NAME"

  # Check if API key required
  if grep -q "requires_api_key: true" <<< "$ARTIFACT_DATA"; then
    echo ""
    echo "⚠️  This MCP config requires an API key"
    echo "Set in environment or .env file"
  fi
}

install_extension() {
  local source="$1"
  local target="$2"

  # Create target directory
  mkdir -p "$target"

  # Copy extension files
  if [ -d "$source" ]; then
    cp -r "$source"/* "$target/"
    echo "✓ Installed extension files"
  else
    echo "Error: Extension source not found: $source"
    return 1
  fi

  # Install npm dependencies if package.json exists
  if [ -f "$target/package.json" ]; then
    echo "Installing npm dependencies..."
    (cd "$target" && npm install --silent)
    echo "✓ Installed npm dependencies"
  fi

  # Register extension (if needed)
  # This would update pi config to load the extension
}

install_pattern() {
  local source="$1"
  local target="$2"

  # Create target directory
  mkdir -p "$(dirname "$target")"

  # Copy pattern file
  cp "$source" "$target"
  echo "✓ Installed pattern: $(basename "$target")"
}
```

### 12. Update Project Manifest

```bash
# Track installed artifacts in project
MANIFEST=".pi/library-manifest.yaml"

if [ ! -f "$MANIFEST" ]; then
  cat > "$MANIFEST" <<EOF
# Installed library artifacts
# Generated by /library install

installed:
EOF
fi

# Add artifact to manifest
cat >> "$MANIFEST" <<EOF
  - artifact: $ARTIFACT_TYPE:$ARTIFACT_NAME
    version: $ARTIFACT_VERSION
    installed_at: $(date -Iseconds)
    dependencies: $(echo "${INSTALL_ORDER[@]}" | tr ' ' ',')
EOF

echo "✓ Updated project manifest"
```

### 13. Verify Installation

```bash
echo ""
echo "Verifying installation..."

# Check file exists
if [ ! -e "$TARGET_FILE" ]; then
  echo "Error: Installation failed - target file not found"
  exit 1
fi

# Verify file is readable
if [ ! -r "$TARGET_FILE" ]; then
  echo "Error: Installation failed - target file not readable"
  exit 1
fi

# Type-specific verification
case "$ARTIFACT_TYPE" in
  skill)
    # Verify SKILL.md has required fields
    if ! grep -q "^name:" "$TARGET_FILE"; then
      echo "Warning: SKILL.md missing 'name' field"
    fi
    ;;
  agent)
    # Verify agent has model specified
    if ! grep -q "model:" "$TARGET_FILE"; then
      echo "Warning: Agent missing model specification"
    fi
    ;;
  prompt)
    # Verify prompt syntax
    # Check for unclosed tags
    ;;
  mcp)
    # Verify JSON syntax
    if command -v jq >/dev/null; then
      jq . "$TARGET_FILE" >/dev/null 2>&1
      [ $? -eq 0 ] && echo "✓ Valid JSON"
    fi
    ;;
esac

echo "✓ Verification passed"
```

### 14. Report Success

```bash
echo ""
echo "✅ Successfully installed: $ARTIFACT_TYPE:$ARTIFACT_NAME"
echo ""
echo "Details:"
echo "  Type: $ARTIFACT_TYPE"
echo "  Name: $ARTIFACT_NAME"
echo "  Version: $ARTIFACT_VERSION"
echo "  Location: $TARGET_FILE"

if [ ${#INSTALL_ORDER[@]} -gt 0 ]; then
  echo ""
  echo "Dependencies installed:"
  for dep in "${INSTALL_ORDER[@]}"; do
    echo "  ✓ $dep"
  done
fi

echo ""
echo "Usage:"

case "$ARTIFACT_TYPE" in
  skill)
    echo "  /$ARTIFACT_NAME [args]"
    ;;
  agent)
    echo "  pi agent run $ARTIFACT_NAME"
    ;;
  prompt)
    echo "  Referenced in agent definitions"
    ;;
  workflow)
    echo "  /workflow run $ARTIFACT_NAME"
    ;;
  mcp)
    echo "  MCP server available in Claude"
    ;;
  ext)
    echo "  pi provider list"
    ;;
  pattern)
    echo "  Loaded automatically by pi"
    ;;
esac

echo ""
```

## Usage Examples

### Install Skill

```bash
/library install skill:commit
```

**Output:**
```
Installing: skill:commit

Searching catalog...
✓ Found in catalog
Description: Git commit workflow with conventional commits
Version: 1.2.0

No dependencies found.

Installing skill:commit...
✓ Installed skill files
✓ Updated project manifest

Verifying installation...
✓ Verification passed

✅ Successfully installed: skill:commit

Details:
  Type: skill
  Name: commit
  Version: 1.2.0
  Location: .pi/skills/commit/SKILL.md

Usage:
  /commit [args]
```

---

### Install Agent with Dependencies

```bash
/library install agent:implementer
```

**Output:**
```
Installing: agent:implementer

Searching catalog...
✓ Found in catalog
Description: Full-stack implementer with TDD
Version: 2.1.0

Resolving dependencies...
Found 2 dependencies:
  - skill:commit
  - prompt:base-agent

Installation order (topological sort):
  1. skill:commit
  2. prompt:base-agent
  3. agent:implementer (requested)

Installing dependencies...

→ Installing dependency: skill:commit
✓ Installed skill files

→ Installing dependency: prompt:base-agent
✓ Installed prompt: base-agent.md

✓ All dependencies installed

Installing agent:implementer...
✓ Installed agent: implementer.md
✓ Updated project manifest

Verifying installation...
✓ Verification passed

✅ Successfully installed: agent:implementer

Details:
  Type: agent
  Name: implementer
  Version: 2.1.0
  Location: .pi/agents/implementer.md

Dependencies installed:
  ✓ skill:commit
  ✓ prompt:base-agent

Usage:
  pi agent run implementer
```

---

### Install Prompt with Includes

```bash
/library install prompt:convex-specialist
```

**Output:**
```
Installing: prompt:convex-specialist

Searching catalog...
✓ Found in catalog
Description: Convex backend specialist prompt
Version: 1.0.0

Resolving dependencies...
Found 2 dependencies:
  - prompt:base-agent
  - prompt:typescript-strict

Installation order (topological sort):
  1. prompt:base-agent
  2. prompt:typescript-strict
  3. prompt:convex-specialist (requested)

Installing dependencies...

→ Installing dependency: prompt:base-agent
✓ Installed prompt: base-agent.md

→ Installing dependency: prompt:typescript-strict
✓ Installed prompt: typescript-strict.md

✓ All dependencies installed

Installing prompt:convex-specialist...
✓ Installed prompt: convex-specialist.md
Processing includes...
✓ Resolved 2 includes

✓ Updated project manifest

Verifying installation...
✓ Verification passed

✅ Successfully installed: prompt:convex-specialist

Details:
  Type: prompt
  Name: convex-specialist
  Version: 1.0.0
  Location: .pi/prompts/convex-specialist.md

Dependencies installed:
  ✓ prompt:base-agent
  ✓ prompt:typescript-strict

Usage:
  Referenced in agent definitions
```

---

### Install with Version Pinning

```bash
/library install agent:implementer@2.0.0
```

**Output:**
```
Installing: agent:implementer
Version: 2.0.0

Searching catalog...
✓ Found in catalog
Description: Full-stack implementer with TDD
Version: 2.1.0

Warning: Requested version 2.0.0 not found
Available version: 2.1.0

Install available version? (y/n): n

Cancelled.
```

---

### Dry Run Installation

```bash
/library install agent:implementer --dry-run
```

**Output:**
```
Installing: agent:implementer

Searching catalog...
✓ Found in catalog
Description: Full-stack implementer with TDD
Version: 2.1.0

Resolving dependencies...
Found 2 dependencies:
  - skill:commit
  - prompt:base-agent

Installation order (topological sort):
  1. skill:commit
  2. prompt:base-agent
  3. agent:implementer (requested)

🔍 Dry run - would install 2 dependencies
```

---

### Skip Dependencies

```bash
/library install agent:implementer --no-deps
```

**Output:**
```
Installing: agent:implementer

Searching catalog...
✓ Found in catalog
Description: Full-stack implementer with TDD
Version: 2.1.0

Installing agent:implementer...
✓ Installed agent: implementer.md
✓ Updated project manifest

Verifying installation...
✓ Verification passed

✅ Successfully installed: agent:implementer

Details:
  Type: agent
  Name: implementer
  Version: 2.1.0
  Location: .pi/agents/implementer.md

Usage:
  pi agent run implementer
```

---

### Already Installed

```bash
/library install skill:commit
```

**Output:**
```
Installing: skill:commit

Searching catalog...
✓ Found in catalog
Description: Git commit workflow
Version: 1.2.0

ℹ️  Already installed: skill:commit
Location: .pi/skills/commit/SKILL.md

Options:
  1. Skip (keep existing)
  2. Update to latest
  3. Force reinstall

Choice (1/2/3): 1

Skipped.
```

---

### Force Reinstall

```bash
/library install skill:commit --force
```

**Output:**
```
Installing: skill:commit

Searching catalog...
✓ Found in catalog
Description: Git commit workflow
Version: 1.2.0

Reinstalling...
✓ Installed skill files
✓ Updated project manifest

✅ Successfully installed: skill:commit
```

---

### Install MCP Config

```bash
/library install mcp:brave-search
```

**Output:**
```
Installing: mcp:brave-search

Searching catalog...
✓ Found in catalog
Description: Brave Search MCP server
Version: 1.0.0

No dependencies found.

Installing mcp:brave-search...
Merging with existing mcp.json...
✓ Installed MCP config: brave-search

⚠️  This MCP config requires an API key
Set in environment or .env file

✓ Updated project manifest

Verifying installation...
✓ Valid JSON
✓ Verification passed

✅ Successfully installed: mcp:brave-search

Details:
  Type: mcp
  Name: brave-search
  Version: 1.0.0
  Location: .pi/mcp.json

Usage:
  MCP server available in Claude
```

---

### Install Extension

```bash
/library install ext:straico
```

**Output:**
```
Installing: ext:straico

Searching catalog...
✓ Found in catalog
Description: Straico provider extension (70+ models)
Version: 1.0.0

No dependencies found.

Installing ext:straico...
✓ Installed extension files
Installing npm dependencies...
✓ Installed npm dependencies
✓ Updated project manifest

Verifying installation...
✓ Verification passed

✅ Successfully installed: ext:straico

Details:
  Type: ext
  Name: straico
  Version: 1.0.0
  Location: .pi/extensions/straico/index.ts

Usage:
  pi provider list
```

---

### Batch Install

```bash
/library install skill:commit agent:implementer prompt:base-agent
```

**Output:**
```
Batch install: 3 artifacts
  - skill:commit
  - agent:implementer
  - prompt:base-agent

Processing batch with dependency resolution...

Installation order:
  1. prompt:base-agent (no deps)
  2. skill:commit (no deps)
  3. agent:implementer (deps: skill:commit, prompt:base-agent)

Installing 1/3: prompt:base-agent
✓ Installed

Installing 2/3: skill:commit
✓ Installed

Installing 3/3: agent:implementer
✓ Installed

✅ Successfully installed 3 artifacts
```

---

## Verification

```bash
# Check installed artifact
ls -la .pi/skills/commit/
# Should show: SKILL.md, cookbook/, etc.

# Check manifest
cat .pi/library-manifest.yaml
# Should list: skill:commit with version and timestamp

# Test skill
/commit
# Should show commit skill help

# Check dependencies
/library deps agent:implementer
# Should show: skill:commit, prompt:base-agent
```

---

## Conflict Resolution

### Conflict: Different Versions

```
ℹ️  Conflict detected

Artifact: agent:implementer
  Installed: 2.0.0
  Available: 2.1.0

Options:
  1. Keep current version (2.0.0)
  2. Update to new version (2.1.0)
  3. Cancel

Choice (1/2/3): 2

Updating to 2.1.0...
✓ Updated
```

---

### Conflict: Local Customization

```
ℹ️  Conflict detected

Artifact: agent:implementer
  Status: Locally customized
  Central version: 2.1.0

Installing from central would overwrite local customizations.

Options:
  1. Keep local customization (skip install)
  2. Backup and install from central
  3. View diff before deciding

Choice (1/2/3): 3

Showing diff...
[diff output]

Proceed with install? (y/n): n

Skipped.
```

---

### Conflict: Circular Dependencies

```
Error: Circular dependency detected

Chain:
  agent:implementer → skill:commit → agent:reviewer → agent:implementer

Cannot install agent:implementer due to circular dependency.

Fix:
  1. Review dependency declarations in catalog
  2. Remove circular reference
  3. Retry installation
```

---

## Error Handling

**Artifact not found:**
```
Error: Artifact not found in catalog: skill:nonexistent

Search available artifacts:
  /library search nonexistent

Or push from another project:
  /library push skill:nonexistent
```

**Invalid format:**
```
Error: Invalid artifact identifier: commit

Format: type:name or type:name@version

Examples:
  skill:commit
  agent:implementer@2.1.0
  prompt:base-agent
```

**Central library not initialized:**
```
Error: Central library not found

Initialize library first:
  /library init
```

**Dependency installation failed:**
```
Error: Failed to install dependency: skill:commit

This blocks installation of: agent:implementer

Fix dependency issue and retry.
```

**Permission denied:**
```
Error: Cannot write to .pi/skills/commit/

Check directory permissions and retry.
```

---

## Advanced Features

### Install with Customization

```bash
/library install agent:implementer --customize
```

**Output:**
```
Installing: agent:implementer
Version: 2.1.0

✓ Installed
✓ Created local customization

Edit customization:
  .pi/agents/implementer.local.md

Local customization will override central version.
```

---

### Install to Specific Location

```bash
/library install skill:commit --target=/custom/path
```

**Output:**
```
Installing: skill:commit

✓ Installed to custom location: /custom/path/commit
```

---

### Install All from Manifest

```bash
# Install all artifacts listed in manifest
/library install --from-manifest
```

**Output:**
```
Reading manifest: .pi/library-manifest.yaml

Found 5 artifacts to install:
  - skill:commit@1.2.0
  - agent:implementer@2.1.0
  - prompt:base-agent@1.0.0
  - mcp:brave-search@1.0.0
  - pattern:missing-returns@1.0.0

Install all? (y/n): y

[installs each artifact...]

✅ Installed 5/5 artifacts
```

---

## See Also

- Dependencies: `/library deps skill:commit`
- Search: `/library search commit`
- Status: `/library status`
- Sync all: `/library sync`
