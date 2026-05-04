# Check Library Status

## Context
Display the current state of the universal library system - what's in central, what's installed locally, what's outdated, customizations, dependencies, and promoted patterns ready to apply.

Shows comprehensive status across all artifact types: skills, agents, prompts, workflows, MCP configs, extensions, and learnings.

## Input
Optional filters and output modes:
- `--only <type>` - Show specific artifact type only (skills, agents, prompts, etc.)
- `--show-agents` - Show only agents
- `--show-skills` - Show only skills
- `--show-patterns` - Show only patterns
- `--outdated` - Show only outdated artifacts
- `--customized` - Show only customized artifacts
- `--json` - Output as JSON
- `--compact` - Compact one-line summary
- `--deps` - Include dependency graph

## Steps

### 1. Load Configuration

```bash
# Load library configuration
source ~/.pi/config.sh 2>/dev/null || echo "No global config"

CENTRAL_PATH="${PI_LIBRARY_CENTRAL:-$HOME/.pi/library-central}"
CENTRAL_CATALOG="$CENTRAL_PATH/catalog.yaml"
LOCAL_MANIFEST=".pi/library-manifest.yaml"
PROJECT_DIR=".pi"

# Validate central library exists
if [ ! -d "$CENTRAL_PATH" ]; then
  echo "❌ Central library not initialized"
  echo ""
  echo "Initialize first with:"
  echo "  /library init"
  exit 1
fi

if [ ! -f "$CENTRAL_CATALOG" ]; then
  echo "❌ Central catalog not found at: $CENTRAL_CATALOG"
  exit 1
fi
```

### 2. Parse Arguments

```bash
FILTER_TYPE=""
SHOW_OUTDATED_ONLY=false
SHOW_CUSTOMIZED_ONLY=false
OUTPUT_JSON=false
OUTPUT_COMPACT=false
SHOW_DEPS=false

while [ $# -gt 0 ]; do
  case "$1" in
    --only)
      FILTER_TYPE="$2"
      shift 2
      ;;
    --show-agents)
      FILTER_TYPE="agents"
      shift
      ;;
    --show-skills)
      FILTER_TYPE="skills"
      shift
      ;;
    --show-patterns)
      FILTER_TYPE="learnings"
      shift
      ;;
    --outdated)
      SHOW_OUTDATED_ONLY=true
      shift
      ;;
    --customized)
      SHOW_CUSTOMIZED_ONLY=true
      shift
      ;;
    --json)
      OUTPUT_JSON=true
      shift
      ;;
    --compact)
      OUTPUT_COMPACT=true
      shift
      ;;
    --deps)
      SHOW_DEPS=true
      shift
      ;;
    *)
      shift
      ;;
  esac
done
```

### 3. Read Central Library Catalog

```bash
# Count artifacts by type in central
count_central_artifacts() {
  local type="$1"

  case "$type" in
    skills)
      find "$CENTRAL_PATH/skills" -name "SKILL.md" 2>/dev/null | wc -l | xargs
      ;;
    agents)
      find "$CENTRAL_PATH/agents" -name "*.md" 2>/dev/null | wc -l | xargs
      ;;
    prompts)
      find "$CENTRAL_PATH/prompts" -name "*.md" 2>/dev/null | wc -l | xargs
      ;;
    workflows)
      find "$CENTRAL_PATH/workflows" -name "*.md" 2>/dev/null | wc -l | xargs
      ;;
    mcp_configs)
      find "$CENTRAL_PATH/mcp-configs" -name "*.json" 2>/dev/null | wc -l | xargs
      ;;
    extensions)
      find "$CENTRAL_PATH/extensions" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | xargs
      ;;
    learnings)
      find "$CENTRAL_PATH/learnings" -name "*.md" 2>/dev/null | wc -l | xargs
      ;;
  esac
}

# Extract artifact metadata from catalog
parse_catalog_metadata() {
  local artifact_name="$1"

  # This would use yq or Python YAML parser in production
  # Simplified here for clarity
  grep -A 15 "name: $artifact_name" "$CENTRAL_CATALOG" | head -15
}

# Count totals
CENTRAL_SKILLS=$(count_central_artifacts "skills")
CENTRAL_AGENTS=$(count_central_artifacts "agents")
CENTRAL_PROMPTS=$(count_central_artifacts "prompts")
CENTRAL_WORKFLOWS=$(count_central_artifacts "workflows")
CENTRAL_MCP=$(count_central_artifacts "mcp_configs")
CENTRAL_EXTENSIONS=$(count_central_artifacts "extensions")
CENTRAL_PATTERNS=$(count_central_artifacts "learnings")

CENTRAL_TOTAL=$((CENTRAL_SKILLS + CENTRAL_AGENTS + CENTRAL_PROMPTS + CENTRAL_WORKFLOWS + CENTRAL_MCP + CENTRAL_EXTENSIONS + CENTRAL_PATTERNS))
```

### 4. Read Local Project Status

```bash
# Count artifacts installed locally
count_local_artifacts() {
  local type="$1"

  case "$type" in
    skills)
      find "$PROJECT_DIR/skills" -name "SKILL.md" 2>/dev/null | wc -l | xargs
      ;;
    agents)
      find "$PROJECT_DIR/agents" -name "*.md" 2>/dev/null | wc -l | xargs
      ;;
    prompts)
      find "$PROJECT_DIR/prompts" -name "*.md" 2>/dev/null | wc -l | xargs
      ;;
    workflows)
      find "$PROJECT_DIR/workflows" -name "*.md" 2>/dev/null | wc -l | xargs
      ;;
    mcp_configs)
      [ -f "$PROJECT_DIR/mcp.json" ] && echo "1" || echo "0"
      ;;
    extensions)
      find "$PROJECT_DIR/extensions" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | xargs
      ;;
    learnings)
      find "$PROJECT_DIR/learnings/patterns" -name "*.md" 2>/dev/null | wc -l | xargs
      ;;
  esac
}

LOCAL_SKILLS=$(count_local_artifacts "skills")
LOCAL_AGENTS=$(count_local_artifacts "agents")
LOCAL_PROMPTS=$(count_local_artifacts "prompts")
LOCAL_WORKFLOWS=$(count_local_artifacts "workflows")
LOCAL_MCP=$(count_local_artifacts "mcp_configs")
LOCAL_EXTENSIONS=$(count_local_artifacts "extensions")
LOCAL_PATTERNS=$(count_local_artifacts "learnings")

LOCAL_TOTAL=$((LOCAL_SKILLS + LOCAL_AGENTS + LOCAL_PROMPTS + LOCAL_WORKFLOWS + LOCAL_MCP + LOCAL_EXTENSIONS + LOCAL_PATTERNS))

# Read last sync time
LAST_SYNC="Never"
if [ -f "$LOCAL_MANIFEST" ]; then
  LAST_SYNC=$(grep "last_sync:" "$LOCAL_MANIFEST" | cut -d: -f2- | xargs)
fi
```

### 5. Detect Outdated Artifacts

```bash
# Compare local vs central versions
detect_outdated() {
  OUTDATED_ARTIFACTS=()

  # Check skills
  for skill_dir in "$PROJECT_DIR/skills"/*; do
    [ -d "$skill_dir" ] || continue
    skill_name=$(basename "$skill_dir")

    local_file="$skill_dir/SKILL.md"
    central_file="$CENTRAL_PATH/skills/$skill_name/SKILL.md"

    if [ -f "$local_file" ] && [ -f "$central_file" ]; then
      local_mtime=$(stat -f %m "$local_file" 2>/dev/null || stat -c %Y "$local_file" 2>/dev/null)
      central_mtime=$(stat -f %m "$central_file" 2>/dev/null || stat -c %Y "$central_file" 2>/dev/null)

      if [ "$central_mtime" -gt "$local_mtime" ]; then
        OUTDATED_ARTIFACTS+=("skill:$skill_name")
      fi
    fi
  done

  # Check agents
  for agent_file in "$PROJECT_DIR/agents"/*.md; do
    [ -f "$agent_file" ] || continue
    agent_name=$(basename "$agent_file" .md)

    central_file="$CENTRAL_PATH/agents/$agent_name.md"

    if [ -f "$central_file" ]; then
      local_mtime=$(stat -f %m "$agent_file" 2>/dev/null || stat -c %Y "$agent_file" 2>/dev/null)
      central_mtime=$(stat -f %m "$central_file" 2>/dev/null || stat -c %Y "$central_file" 2>/dev/null)

      if [ "$central_mtime" -gt "$local_mtime" ]; then
        OUTDATED_ARTIFACTS+=("agent:$agent_name")
      fi
    fi
  done

  # Check prompts
  for prompt_file in "$PROJECT_DIR/prompts"/*.md; do
    [ -f "$prompt_file" ] || continue
    prompt_name=$(basename "$prompt_file" .md)

    central_file="$CENTRAL_PATH/prompts/$prompt_name.md"

    if [ -f "$central_file" ]; then
      local_mtime=$(stat -f %m "$prompt_file" 2>/dev/null || stat -c %Y "$prompt_file" 2>/dev/null)
      central_mtime=$(stat -f %m "$central_file" 2>/dev/null || stat -c %Y "$central_file" 2>/dev/null)

      if [ "$central_mtime" -gt "$local_mtime" ]; then
        OUTDATED_ARTIFACTS+=("prompt:$prompt_name")
      fi
    fi
  done

  # Check patterns
  for pattern_file in "$PROJECT_DIR/learnings/patterns"/*.md; do
    [ -f "$pattern_file" ] || continue
    pattern_name=$(basename "$pattern_file" .md)

    central_file="$CENTRAL_PATH/learnings/$pattern_name.md"

    if [ -f "$central_file" ]; then
      local_mtime=$(stat -f %m "$pattern_file" 2>/dev/null || stat -c %Y "$pattern_file" 2>/dev/null)
      central_mtime=$(stat -f %m "$central_file" 2>/dev/null || stat -c %Y "$central_file" 2>/dev/null)

      if [ "$central_mtime" -gt "$local_mtime" ]; then
        OUTDATED_ARTIFACTS+=("pattern:$pattern_name")
      fi
    fi
  done

  # Check extensions
  for ext_dir in "$PROJECT_DIR/extensions"/*; do
    [ -d "$ext_dir" ] || continue
    ext_name=$(basename "$ext_dir")

    local_pkg="$ext_dir/package.json"
    central_pkg="$CENTRAL_PATH/extensions/$ext_name/package.json"

    if [ -f "$local_pkg" ] && [ -f "$central_pkg" ]; then
      if command -v jq >/dev/null; then
        local_ver=$(jq -r '.version' "$local_pkg")
        central_ver=$(jq -r '.version' "$central_pkg")

        # Compare versions (simplified - would use proper semver comparison)
        if [ "$local_ver" != "$central_ver" ]; then
          OUTDATED_ARTIFACTS+=("ext:$ext_name")
        fi
      fi
    fi
  done
}

detect_outdated
OUTDATED_COUNT=${#OUTDATED_ARTIFACTS[@]}
```

### 6. Detect Customizations

```bash
# Detect local customizations (local overrides of central artifacts)
detect_customizations() {
  CUSTOMIZED_ARTIFACTS=()

  # Check if local manifest tracks customizations
  if [ -f "$LOCAL_MANIFEST" ]; then
    # Extract customized artifacts
    CUSTOMIZED_ARTIFACTS=($(grep "customized: true" "$LOCAL_MANIFEST" -B 1 | grep "artifact:" | cut -d: -f2- | xargs))
  fi

  # Alternative: detect by comparing checksums
  # This would check if local differs from central (not just timestamp)
  # Implementation simplified here
}

detect_customizations
CUSTOMIZED_COUNT=${#CUSTOMIZED_ARTIFACTS[@]}
```

### 7. Find Promoted Patterns Ready to Apply

```bash
# Find promoted patterns from learnings
find_promoted_patterns() {
  PROMOTED_PATTERNS=()

  local catalog="$PROJECT_DIR/learnings/catalog.yaml"

  if [ -f "$catalog" ]; then
    # Extract promoted patterns (not yet applied)
    # This would use proper YAML parsing in production

    # Simplified: grep for patterns with status: promoted and applied: false
    while IFS= read -r pattern_key; do
      local status=$(grep -A 10 "pattern_key: \"$pattern_key\"" "$catalog" | grep "status:" | cut -d: -f2 | xargs)
      local applied=$(grep -A 10 "pattern_key: \"$pattern_key\"" "$catalog" | grep "applied:" | cut -d: -f2 | xargs)

      if [ "$status" = "promoted" ] && [ "$applied" != "true" ]; then
        PROMOTED_PATTERNS+=("$pattern_key")
      fi
    done < <(grep "pattern_key:" "$catalog" | cut -d'"' -f2)
  fi
}

find_promoted_patterns
PROMOTED_COUNT=${#PROMOTED_PATTERNS[@]}
```

### 8. Build Dependency Graph

```bash
# Build dependency graph for artifacts
build_dependency_graph() {
  declare -A DEPS_MAP

  # Parse dependencies from catalog
  # This would properly parse YAML in production

  # Example structure:
  # DEPS_MAP["agent:implementer"]="skill:commit,prompt:base-agent"
  # DEPS_MAP["prompt:convex-specialist"]="prompt:base-agent,prompt:typescript-strict"

  # Simplified implementation
  echo ""
}

if [ "$SHOW_DEPS" = "true" ]; then
  build_dependency_graph
fi
```

### 9. Output: Compact Format

```bash
if [ "$OUTPUT_COMPACT" = "true" ]; then
  echo "Library: $LOCAL_TOTAL/$CENTRAL_TOTAL installed, $OUTDATED_COUNT outdated, $CUSTOMIZED_COUNT customized, $PROMOTED_COUNT patterns ready"
  exit 0
fi
```

### 10. Output: JSON Format

```bash
if [ "$OUTPUT_JSON" = "true" ]; then
  cat <<EOF
{
  "central_library": {
    "skills": $CENTRAL_SKILLS,
    "agents": $CENTRAL_AGENTS,
    "prompts": $CENTRAL_PROMPTS,
    "workflows": $CENTRAL_WORKFLOWS,
    "mcp_configs": $CENTRAL_MCP,
    "extensions": $CENTRAL_EXTENSIONS,
    "learnings": $CENTRAL_PATTERNS,
    "total": $CENTRAL_TOTAL
  },
  "this_project": {
    "skills": $LOCAL_SKILLS,
    "agents": $LOCAL_AGENTS,
    "prompts": $LOCAL_PROMPTS,
    "workflows": $LOCAL_WORKFLOWS,
    "mcp_configs": $LOCAL_MCP,
    "extensions": $LOCAL_EXTENSIONS,
    "learnings": $LOCAL_PATTERNS,
    "total": $LOCAL_TOTAL,
    "last_sync": "$LAST_SYNC"
  },
  "outdated": {
    "count": $OUTDATED_COUNT,
    "artifacts": $(printf '["%s"]' "${OUTDATED_ARTIFACTS[*]}" | sed 's/" "/", "/g')
  },
  "customizations": {
    "count": $CUSTOMIZED_COUNT,
    "artifacts": $(printf '["%s"]' "${CUSTOMIZED_ARTIFACTS[*]}" | sed 's/" "/", "/g')
  },
  "promoted_patterns": {
    "count": $PROMOTED_COUNT,
    "patterns": $(printf '["%s"]' "${PROMOTED_PATTERNS[*]}" | sed 's/" "/", "/g')
  }
}
EOF
  exit 0
fi
```

### 11. Output: Standard Display

```bash
echo "Library Status"
echo "══════════════"
echo ""

# Central Library Section
echo "📦 Central Library (~/.pi/library-central/)"
echo ""
echo "  Skills:      $CENTRAL_SKILLS"
echo "  Agents:      $CENTRAL_AGENTS"
echo "  Prompts:     $CENTRAL_PROMPTS"
echo "  Workflows:   $CENTRAL_WORKFLOWS"
echo "  MCP Configs: $CENTRAL_MCP"
echo "  Extensions:  $CENTRAL_EXTENSIONS"
echo "  Learnings:   $CENTRAL_PATTERNS"
echo ""
echo "  Total: $CENTRAL_TOTAL artifacts"
echo ""

# This Project Section
echo "💻 This Project ($(basename "$PWD"))"
echo ""
echo "  Skills:      $LOCAL_SKILLS/$CENTRAL_SKILLS ($(calc_percentage $LOCAL_SKILLS $CENTRAL_SKILLS)%)"
echo "  Agents:      $LOCAL_AGENTS/$CENTRAL_AGENTS ($(calc_percentage $LOCAL_AGENTS $CENTRAL_AGENTS)%)"
echo "  Prompts:     $LOCAL_PROMPTS/$CENTRAL_PROMPTS ($(calc_percentage $LOCAL_PROMPTS $CENTRAL_PROMPTS)%)"
echo "  Workflows:   $LOCAL_WORKFLOWS/$CENTRAL_WORKFLOWS ($(calc_percentage $LOCAL_WORKFLOWS $CENTRAL_WORKFLOWS)%)"
echo "  MCP Configs: $LOCAL_MCP/$CENTRAL_MCP ($(calc_percentage $LOCAL_MCP $CENTRAL_MCP)%)"
echo "  Extensions:  $LOCAL_EXTENSIONS/$CENTRAL_EXTENSIONS ($(calc_percentage $LOCAL_EXTENSIONS $CENTRAL_EXTENSIONS)%)"
echo "  Learnings:   $LOCAL_PATTERNS/$CENTRAL_PATTERNS ($(calc_percentage $LOCAL_PATTERNS $CENTRAL_PATTERNS)%)"
echo ""
echo "  Total: $LOCAL_TOTAL/$CENTRAL_TOTAL synced"
echo "  Last sync: $LAST_SYNC"
echo ""

# Helper function
calc_percentage() {
  local local_count=$1
  local central_count=$2

  if [ "$central_count" -eq 0 ]; then
    echo "0"
  else
    echo $(( (local_count * 100) / central_count ))
  fi
}
```

### 12. Display Outdated Artifacts

```bash
if [ $OUTDATED_COUNT -gt 0 ]; then
  echo "⚠️  Outdated ($OUTDATED_COUNT)"
  echo ""
  echo "  Updates available (central is newer):"
  echo ""

  for artifact in "${OUTDATED_ARTIFACTS[@]}"; do
    artifact_type="${artifact%%:*}"
    artifact_name="${artifact##*:}"

    # Get versions
    local_ver="current"
    central_ver="latest"

    # Extract actual versions if available
    case "$artifact_type" in
      skill)
        local_file="$PROJECT_DIR/skills/$artifact_name/SKILL.md"
        central_file="$CENTRAL_PATH/skills/$artifact_name/SKILL.md"
        ;;
      agent)
        local_file="$PROJECT_DIR/agents/$artifact_name.md"
        central_file="$CENTRAL_PATH/agents/$artifact_name.md"
        ;;
      prompt)
        local_file="$PROJECT_DIR/prompts/$artifact_name.md"
        central_file="$CENTRAL_PATH/prompts/$artifact_name.md"
        ;;
      pattern)
        local_file="$PROJECT_DIR/learnings/patterns/$artifact_name.md"
        central_file="$CENTRAL_PATH/learnings/$artifact_name.md"
        ;;
      ext)
        local_file="$PROJECT_DIR/extensions/$artifact_name/package.json"
        central_file="$CENTRAL_PATH/extensions/$artifact_name/package.json"

        if [ -f "$local_file" ] && command -v jq >/dev/null; then
          local_ver=$(jq -r '.version' "$local_file")
          central_ver=$(jq -r '.version' "$central_file")
        fi
        ;;
    esac

    echo "  - $artifact ($local_ver → $central_ver)"
  done

  echo ""
  echo "  Update all with:"
  echo "    /library sync"
  echo ""
  echo "  Update specific:"
  echo "    /library install ${OUTDATED_ARTIFACTS[0]}"
  echo ""
else
  echo "✅ Up to Date"
  echo ""
  echo "  All artifacts are current."
  echo ""
fi
```

### 13. Display Customizations

```bash
if [ $CUSTOMIZED_COUNT -gt 0 ]; then
  echo "🔧 Customizations ($CUSTOMIZED_COUNT)"
  echo ""
  echo "  Local overrides (not synced from central):"
  echo ""

  for artifact in "${CUSTOMIZED_ARTIFACTS[@]}"; do
    echo "  - $artifact (local version)"
  done

  echo ""
  echo "  View diff:"
  echo "    /library diff ${CUSTOMIZED_ARTIFACTS[0]}"
  echo ""
  echo "  Revert to central:"
  echo "    /library revert ${CUSTOMIZED_ARTIFACTS[0]}"
  echo ""
else
  echo "🔧 Customizations (0)"
  echo ""
  echo "  No local customizations."
  echo ""
fi
```

### 14. Display Promoted Patterns

```bash
if [ $PROMOTED_COUNT -gt 0 ]; then
  echo "🎉 Promoted Patterns ($PROMOTED_COUNT)"
  echo ""
  echo "  Ready to apply:"
  echo ""

  for pattern in "${PROMOTED_PATTERNS[@]}"; do
    # Get pattern metadata
    local catalog="$PROJECT_DIR/learnings/catalog.yaml"
    local impact=$(grep -A 10 "pattern_key: \"$pattern\"" "$catalog" | grep "impact:" | cut -d: -f2 | xargs)
    local occurrences=$(grep -A 10 "pattern_key: \"$pattern\"" "$catalog" | grep "occurrences:" | cut -d: -f2 | xargs)

    echo "  - $pattern [$impact impact] ($occurrences occurrences)"
  done

  echo ""
  echo "  Apply with:"
  echo "    /learnings apply ${PROMOTED_PATTERNS[0]}"
  echo ""
else
  echo "🎉 Promoted Patterns (0)"
  echo ""
  echo "  No patterns ready for application."
  echo ""
fi
```

### 15. Display Dependency Graph

```bash
if [ "$SHOW_DEPS" = "true" ]; then
  echo "📊 Dependencies"
  echo ""
  echo "  Artifact dependency graph:"
  echo ""

  # Show key dependencies
  echo "  agent:implementer"
  echo "    ├── skill:commit"
  echo "    └── prompt:base-agent"
  echo ""

  echo "  prompt:convex-specialist"
  echo "    ├── prompt:base-agent"
  echo "    └── prompt:typescript-strict"
  echo ""

  echo "  Full dependency graph:"
  echo "    /library deps --all"
  echo ""
fi
```

### 16. Display Action Summary

```bash
# Summary and next actions
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Calculate health score
HEALTH_SCORE=100

if [ $OUTDATED_COUNT -gt 0 ]; then
  HEALTH_SCORE=$((HEALTH_SCORE - (OUTDATED_COUNT * 5)))
fi

if [ $PROMOTED_COUNT -gt 0 ]; then
  HEALTH_SCORE=$((HEALTH_SCORE - (PROMOTED_COUNT * 3)))
fi

# Ensure health score doesn't go below 0
[ $HEALTH_SCORE -lt 0 ] && HEALTH_SCORE=0

if [ $HEALTH_SCORE -eq 100 ]; then
  echo "✨ Status: Healthy (score: $HEALTH_SCORE/100)"
  echo ""
  echo "Your library is up to date with no pending actions."
elif [ $HEALTH_SCORE -ge 80 ]; then
  echo "✅ Status: Good (score: $HEALTH_SCORE/100)"
  echo ""
  echo "Minor maintenance recommended."
elif [ $HEALTH_SCORE -ge 60 ]; then
  echo "⚠️  Status: Needs Attention (score: $HEALTH_SCORE/100)"
  echo ""
  echo "Several updates or patterns need attention."
else
  echo "🚨 Status: Critical (score: $HEALTH_SCORE/100)"
  echo ""
  echo "Significant maintenance required."
fi

echo ""
echo "Next actions:"

if [ $OUTDATED_COUNT -gt 0 ]; then
  echo "  1. Update outdated artifacts: /library sync"
fi

if [ $PROMOTED_COUNT -gt 0 ]; then
  echo "  2. Apply promoted patterns: /learnings apply <pattern-key>"
fi

if [ $CUSTOMIZED_COUNT -gt 0 ]; then
  echo "  3. Review customizations: /library diff <artifact>"
fi

if [ $OUTDATED_COUNT -eq 0 ] && [ $PROMOTED_COUNT -eq 0 ]; then
  echo "  No actions required."
fi

echo ""
```

## Example Outputs

### Healthy System

```
Library Status
══════════════

📦 Central Library (~/.pi/library-central/)

  Skills:      12
  Agents:      8
  Prompts:     15
  Workflows:   5
  MCP Configs: 4
  Extensions:  3
  Learnings:   23

  Total: 70 artifacts

💻 This Project (pi_launchpad)

  Skills:      10/12 (83%)
  Agents:      7/8 (87%)
  Prompts:     12/15 (80%)
  Workflows:   3/5 (60%)
  MCP Configs: 1/4 (25%)
  Extensions:  2/3 (66%)
  Learnings:   18/23 (78%)

  Total: 53/70 synced
  Last sync: 2026-03-18 10:34:12

✅ Up to Date

  All artifacts are current.

🔧 Customizations (2)

  Local overrides (not synced from central):

  - agent:implementer (local version)
  - prompt:convex-specialist (local version)

  View diff:
    /library diff agent:implementer

  Revert to central:
    /library revert agent:implementer

🎉 Promoted Patterns (0)

  No patterns ready for application.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Status: Good (score: 94/100)

Minor maintenance recommended.

Next actions:
  3. Review customizations: /library diff <artifact>
```

---

### Needs Attention

```
Library Status
══════════════

📦 Central Library (~/.pi/library-central/)

  Skills:      12
  Agents:      8
  Prompts:     15
  Workflows:   5
  MCP Configs: 4
  Extensions:  3
  Learnings:   28

  Total: 75 artifacts

💻 This Project (my_saas)

  Skills:      8/12 (66%)
  Agents:      5/8 (62%)
  Prompts:     10/15 (66%)
  Workflows:   2/5 (40%)
  MCP Configs: 1/4 (25%)
  Extensions:  1/3 (33%)
  Learnings:   12/28 (42%)

  Total: 39/75 synced
  Last sync: 2026-03-15 14:22:00

⚠️  Outdated (5)

  Updates available (central is newer):

  - skill:commit (1.2.0 → 1.3.0)
  - agent:implementer (2.0.0 → 2.1.0)
  - prompt:base-agent (1.0.0 → 1.1.0)
  - pattern:missing-returns (1.0.0 → 1.1.0)
  - ext:straico (1.0.0 → 1.2.0)

  Update all with:
    /library sync

  Update specific:
    /library install skill:commit

🔧 Customizations (0)

  No local customizations.

🎉 Promoted Patterns (3)

  Ready to apply:

  - forgot-error-handling [high impact] (3 occurrences)
  - no-validation [high impact] (3 occurrences)
  - missing-logging [medium impact] (3 occurrences)

  Apply with:
    /learnings apply forgot-error-handling

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  Status: Needs Attention (score: 66/100)

Several updates or patterns need attention.

Next actions:
  1. Update outdated artifacts: /library sync
  2. Apply promoted patterns: /learnings apply <pattern-key>
```

---

### Filter by Type: Skills Only

```bash
/library status --only skills
```

**Output:**
```
Library Status - Skills
═══════════════════════

📦 Central Library: 12 skills

💻 This Project: 10/12 synced (83%)

Skills installed:
  ✓ commit (v1.3.0)
  ✓ review-pr (v1.1.0)
  ✓ library (v1.0.0)
  ✓ learnings (v1.2.0)
  ✓ team (v1.0.0)
  ✓ orchestrator (v1.0.0)
  ✓ prompt-eng (v1.0.0)
  ✓ search (v1.0.0)
  ✓ test (v1.1.0)
  ✓ deploy (v1.0.0)

Skills not installed:
  - refactor (v1.0.0)
  - migrate (v1.0.0)

⚠️  Outdated (1):
  - commit (1.2.0 → 1.3.0)

Update with:
  /library sync --only skills
```

---

### Filter: Agents Only

```bash
/library status --show-agents
```

**Output:**
```
Library Status - Agents
═══════════════════════

📦 Central Library: 8 agents

💻 This Project: 7/8 synced (87%)

Agents installed:
  ✓ implementer (v2.1.0) [customized]
  ✓ architect (v1.5.0)
  ✓ reviewer (v1.2.0)
  ✓ fixer (v1.0.0)
  ✓ tdd-guide (v1.0.0)
  ✓ researcher (v1.1.0)
  ✓ deep-researcher (v1.0.0)

Agents not installed:
  - doc-updater (v1.0.0)

🔧 Customizations (1):
  - implementer (local version with project-specific rules)

View diff:
  /library diff agent:implementer
```

---

### Filter: Patterns Only

```bash
/library status --show-patterns
```

**Output:**
```
Library Status - Patterns
═════════════════════════

📦 Central Library: 28 patterns

💻 This Project: 18/28 synced (64%)

🎉 Promoted (ready to apply): 3

  - forgot-error-handling [high] (3/3)
  - no-validation [high] (3/3)
  - missing-logging [medium] (3/3)

✅ Applied: 15

  - missing-returns (applied 2026-03-17)
  - no-inline-styles (applied 2026-03-15)
  - always-use-auth (applied 2026-03-14)
  - forgot-team-scope (applied 2026-03-12)
  - no-any-types (applied 2026-03-10)
  [... and 10 more]

📋 Pending: 10

  - missing-auth-check (2/3)
  - forgot-types (1/3)
  - no-error-boundary (1/3)
  [... and 7 more]

Apply promoted patterns:
  /learnings apply forgot-error-handling
```

---

### Outdated Only

```bash
/library status --outdated
```

**Output:**
```
Outdated Artifacts (5)
══════════════════════

⚠️  Central has newer versions:

Skills:
  - commit (1.2.0 → 1.3.0)
    Changes: Added auto-learning integration

Agents:
  - implementer (2.0.0 → 2.1.0)
    Changes: Improved Convex patterns

Prompts:
  - base-agent (1.0.0 → 1.1.0)
    Changes: Enhanced error handling instructions

Patterns:
  - missing-returns (1.0.0 → 1.1.0)
    Changes: Added validation examples

Extensions:
  - straico (1.0.0 → 1.2.0)
    Changes: Added 20 new models

Update all:
  /library sync

Update one:
  /library install skill:commit
```

---

### Customized Only

```bash
/library status --customized
```

**Output:**
```
Customized Artifacts (2)
════════════════════════

🔧 Local overrides (diverge from central):

agent:implementer
  Location: .pi/agents/implementer.md
  Last modified: 2026-03-18 14:30
  Changes: Added project-specific Convex patterns

  Actions:
    View diff: /library diff agent:implementer
    Revert: /library revert agent:implementer
    Push: /library push agent:implementer

prompt:convex-specialist
  Location: .pi/prompts/convex-specialist.md
  Last modified: 2026-03-17 10:00
  Changes: Added custom database patterns

  Actions:
    View diff: /library diff prompt:convex-specialist
    Revert: /library revert prompt:convex-specialist
    Push: /library push prompt:convex-specialist
```

---

### With Dependencies

```bash
/library status --deps
```

**Output:**
```
Library Status
══════════════

[... standard status output ...]

📊 Dependencies

  Artifact dependency graph:

  agent:implementer
    ├── skill:commit ✓ installed
    └── prompt:base-agent ✓ installed

  agent:reviewer
    ├── skill:review-pr ✓ installed
    └── prompt:base-agent ✓ installed

  prompt:convex-specialist
    ├── prompt:base-agent ✓ installed
    └── prompt:typescript-strict ✓ installed

  skill:commit
    └── skill:learnings ✓ installed

  Full dependency graph:
    /library deps --all
```

---

### Compact Format

```bash
/library status --compact
```

**Output:**
```
Library: 53/70 installed, 5 outdated, 2 customized, 3 patterns ready
```

---

### JSON Format

```bash
/library status --json
```

**Output:**
```json
{
  "central_library": {
    "skills": 12,
    "agents": 8,
    "prompts": 15,
    "workflows": 5,
    "mcp_configs": 4,
    "extensions": 3,
    "learnings": 28,
    "total": 75
  },
  "this_project": {
    "skills": 10,
    "agents": 7,
    "prompts": 12,
    "workflows": 3,
    "mcp_configs": 1,
    "extensions": 2,
    "learnings": 18,
    "total": 53,
    "last_sync": "2026-03-18 10:34:12"
  },
  "outdated": {
    "count": 5,
    "artifacts": ["skill:commit", "agent:implementer", "prompt:base-agent", "pattern:missing-returns", "ext:straico"]
  },
  "customizations": {
    "count": 2,
    "artifacts": ["agent:implementer", "prompt:convex-specialist"]
  },
  "promoted_patterns": {
    "count": 3,
    "patterns": ["forgot-error-handling", "no-validation", "missing-logging"]
  }
}
```

---

## Integration with Workflow

### Session Start Check

```bash
# Check status at session start
/library status --compact

# If outdated:
Library: 53/70 installed, 5 outdated, 2 customized, 3 patterns ready

⚠️  Warning: 5 artifacts outdated, 3 patterns ready to apply

Sync now? (y/n): y

[runs /library sync and /learnings apply]
```

---

### After Sync

```bash
# After syncing
/library sync

# Then check status
/library status

✅ Status: Healthy (score: 100/100)

Your library is up to date with no pending actions.
```

---

### Weekly Health Check

```bash
# Check overall health
/library status

# Review customizations
/library status --customized

# Update outdated
/library status --outdated
/library sync

# Apply patterns
/library status --show-patterns
/learnings apply <pattern-key>
```

---

## Error Handling

**Central library not initialized:**
```
❌ Central library not initialized

Initialize first with:
  /library init
```

**No artifacts installed:**
```
Library Status
══════════════

📦 Central Library: 75 artifacts

💻 This Project: 0/75 synced (0%)

  No artifacts installed yet.

Sync all artifacts:
  /library sync

Install specific:
  /library install skill:commit
```

**Last sync very old:**
```
💻 This Project (my_project)

  Total: 53/70 synced
  Last sync: 2026-01-15 10:00:00

⚠️  Last sync was 62 days ago!

Sync to get latest updates:
  /library sync
```

---

## Advanced Features

### Status with Recommendations

```bash
/library status --recommend
```

**Output:**
```
[... standard status ...]

💡 Recommendations:

  1. Install missing high-value artifacts:
     - skill:refactor (used by 80% of projects)
     - agent:doc-updater (improves documentation quality)

  2. Update outdated critical artifacts:
     - agent:implementer (2.0.0 → 2.1.0) [high priority]

  3. Consider syncing patterns:
     - 10 new patterns available in central
```

---

### Status Comparison

```bash
# Compare with another project
/library status --compare ~/projects/ivi

Output:
  This project has:
    + 3 artifacts not in ivi
    - 5 artifacts missing (available in ivi)
    ~ 2 different versions
```

---

### Export Status Report

```bash
/library status --export status-report.md

Output:
  Status report saved to: status-report.md

  # status-report.md contains:
  # - Full status breakdown
  # - Artifact lists
  # - Health score
  # - Recommendations
```

---

## See Also

- Sync all artifacts: `/library sync`
- Install specific artifact: `/library install skill:commit`
- Update outdated: `/library sync`
- Apply patterns: `/learnings apply pattern-key`
- View dependencies: `/library deps agent:implementer`
- Compare versions: `/library diff agent:implementer`
