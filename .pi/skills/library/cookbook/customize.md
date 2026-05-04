# Customize Central Artifact for Local Project

## Context
Fork any artifact from the central library to create a project-specific customization. The local version overrides the central version and won't be overwritten by `/library sync`.

Supports all artifact types: skills, agents, prompts, workflows, MCP configs, extensions, and learnings.

## Input
- Artifact identifier: `type:name` (e.g., "agent:implementer", "skill:commit", "pattern:missing-returns")
- Optional: `--reason "description"` - Reason for customization

## Steps

### 1. Load Configuration

```bash
source ~/.pi/config.sh 2>/dev/null || echo "No global config found"

CENTRAL_PATH="${PI_LIBRARY_CENTRAL:-$HOME/.pi/library-central}"
LOCAL_CATALOG=".pi/library-manifest.yaml"
ARTIFACT="$1"
CUSTOM_REASON="${2:-Project-specific requirements}"

# Parse flags
shift
while [ $# -gt 0 ]; do
  case "$1" in
    --reason)
      CUSTOM_REASON="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done
```

### 2. Parse Artifact Identifier

```bash
# Format: type:name
if [[ "$ARTIFACT" =~ ^([^:]+):(.+)$ ]]; then
  ARTIFACT_TYPE="${BASH_REMATCH[1]}"
  ARTIFACT_NAME="${BASH_REMATCH[2]}"
else
  echo "❌ Invalid artifact identifier: $ARTIFACT"
  echo ""
  echo "Format: type:name"
  echo ""
  echo "Examples:"
  echo "  agent:implementer"
  echo "  skill:commit"
  echo "  prompt:base-agent"
  echo "  pattern:missing-returns"
  exit 1
fi

echo "Customizing: $ARTIFACT_TYPE:$ARTIFACT_NAME"
echo ""
```

### 3. Map Artifact Type to Paths

```bash
# Map artifact type to directory structure
case "$ARTIFACT_TYPE" in
  skill)
    CENTRAL_SOURCE="$CENTRAL_PATH/skills/$ARTIFACT_NAME/SKILL.md"
    LOCAL_TARGET=".pi/skills/$ARTIFACT_NAME/SKILL.md"
    ;;
  agent)
    CENTRAL_SOURCE="$CENTRAL_PATH/agents/$ARTIFACT_NAME.md"
    LOCAL_TARGET=".pi/agents/$ARTIFACT_NAME.md"
    ;;
  prompt)
    CENTRAL_SOURCE="$CENTRAL_PATH/prompts/$ARTIFACT_NAME.md"
    LOCAL_TARGET=".pi/prompts/$ARTIFACT_NAME.md"
    ;;
  workflow)
    CENTRAL_SOURCE="$CENTRAL_PATH/workflows/$ARTIFACT_NAME.md"
    LOCAL_TARGET=".pi/workflows/$ARTIFACT_NAME.md"
    ;;
  mcp)
    CENTRAL_SOURCE="$CENTRAL_PATH/mcp-configs/$ARTIFACT_NAME.json"
    LOCAL_TARGET=".pi/mcp-configs/$ARTIFACT_NAME.json"
    ;;
  ext)
    CENTRAL_SOURCE="$CENTRAL_PATH/extensions/$ARTIFACT_NAME/"
    LOCAL_TARGET=".pi/extensions/$ARTIFACT_NAME/"
    ;;
  pattern)
    CENTRAL_SOURCE="$CENTRAL_PATH/learnings/$ARTIFACT_NAME.md"
    LOCAL_TARGET=".pi/learnings/patterns/$ARTIFACT_NAME.md"
    ;;
  *)
    echo "❌ Unsupported artifact type: $ARTIFACT_TYPE"
    echo ""
    echo "Supported types:"
    echo "  skill, agent, prompt, workflow, mcp, ext, pattern"
    exit 1
    ;;
esac
```

### 4. Validate Artifact Exists in Central

```bash
if [ ! -e "$CENTRAL_SOURCE" ]; then
  echo "❌ Artifact not found in central: $ARTIFACT_TYPE:$ARTIFACT_NAME"
  echo ""
  echo "Searched: $CENTRAL_SOURCE"
  echo ""
  echo "Available ${ARTIFACT_TYPE}s in central:"

  case "$ARTIFACT_TYPE" in
    skill)
      ls -1 "$CENTRAL_PATH/skills" 2>/dev/null | sed 's/^/  - /'
      ;;
    agent)
      ls -1 "$CENTRAL_PATH/agents"/*.md 2>/dev/null | xargs -n 1 basename | sed 's/.md$//' | sed 's/^/  - /'
      ;;
    prompt)
      ls -1 "$CENTRAL_PATH/prompts"/*.md 2>/dev/null | xargs -n 1 basename | sed 's/.md$//' | sed 's/^/  - /'
      ;;
    workflow)
      ls -1 "$CENTRAL_PATH/workflows"/*.md 2>/dev/null | xargs -n 1 basename | sed 's/.md$//' | sed 's/^/  - /'
      ;;
    mcp)
      ls -1 "$CENTRAL_PATH/mcp-configs"/*.json 2>/dev/null | xargs -n 1 basename | sed 's/.json$//' | sed 's/^/  - /'
      ;;
    ext)
      ls -1 "$CENTRAL_PATH/extensions" 2>/dev/null | sed 's/^/  - /'
      ;;
    pattern)
      ls -1 "$CENTRAL_PATH/learnings"/*.md 2>/dev/null | xargs -n 1 basename | sed 's/.md$//' | sed 's/^/  - /'
      ;;
  esac

  echo ""
  echo "Sync first with: /library sync"
  exit 1
fi

echo "✓ Found in central: $CENTRAL_SOURCE"
echo ""
```

### 5. Check if Already Customized

```bash
if [ -e "$LOCAL_TARGET" ]; then
  # Check if it's marked as customization
  IS_CUSTOMIZATION=$(grep -A 20 "customizations:" "$LOCAL_CATALOG" 2>/dev/null | \
                     grep "artifact: \"$ARTIFACT_TYPE:$ARTIFACT_NAME\"" || echo "")

  if [ -n "$IS_CUSTOMIZATION" ]; then
    echo "ℹ️  Artifact already customized locally"
    echo ""
    read -p "Re-customize (will backup existing)? (y/n): " recustomize

    if [ "$recustomize" != "y" ]; then
      echo "Customization cancelled"
      exit 0
    fi

    # Backup existing customization
    BACKUP_FILE="$LOCAL_TARGET.backup.$(date +%Y%m%d_%H%M%S)"

    if [ -d "$LOCAL_TARGET" ]; then
      cp -r "$LOCAL_TARGET" "$BACKUP_FILE"
    else
      cp "$LOCAL_TARGET" "$BACKUP_FILE"
    fi

    echo "✓ Backed up existing customization: $BACKUP_FILE"
    echo ""
  fi
fi
```

### 6. Copy Artifact to Local

```bash
# Ensure target directory exists
mkdir -p "$(dirname "$LOCAL_TARGET")"

# Copy from central
if [ -d "$CENTRAL_SOURCE" ]; then
  # Directory (extensions)
  cp -r "$CENTRAL_SOURCE" "$LOCAL_TARGET"
  echo "✓ Copied directory from central to local"
else
  # File
  cp "$CENTRAL_SOURCE" "$LOCAL_TARGET"
  echo "✓ Copied file from central to local"
fi

echo "  Source: $CENTRAL_SOURCE"
echo "  Local:  $LOCAL_TARGET"
echo ""
```

### 7. Add Customization Header

```bash
# Add customization notice to file
# (Only for text files: .md, .json)

add_customization_header() {
  local file="$1"
  local type="$2"

  # Skip if not a text file
  [[ ! "$file" =~ \.(md|json)$ ]] && return

  case "$type" in
    md)
      # Markdown files: Add after frontmatter or at top
      FRONTMATTER_END=$(grep -n "^---$" "$file" 2>/dev/null | sed -n '2p' | cut -d: -f1)

      if [ -n "$FRONTMATTER_END" ]; then
        # Insert after frontmatter
        TEMP_FILE=$(mktemp)
        head -n "$FRONTMATTER_END" "$file" > "$TEMP_FILE"

        cat >> "$TEMP_FILE" <<EOF

<!-- CUSTOMIZATION NOTICE -->
<!-- This is a project-specific customization of the central artifact -->
<!-- Central source: $CENTRAL_SOURCE -->
<!-- Customized: $(date -I) -->
<!-- Reason: ${CUSTOM_REASON} -->
<!-- This local version will NOT be overwritten by /library sync -->

EOF

        tail -n +$((FRONTMATTER_END + 1)) "$file" >> "$TEMP_FILE"
        mv "$TEMP_FILE" "$file"
      else
        # No frontmatter, add at top
        TEMP_FILE=$(mktemp)
        cat > "$TEMP_FILE" <<EOF
<!-- CUSTOMIZATION NOTICE -->
<!-- This is a project-specific customization of the central artifact -->
<!-- Central source: $CENTRAL_SOURCE -->
<!-- Customized: $(date -I) -->
<!-- Reason: ${CUSTOM_REASON} -->
<!-- This local version will NOT be overwritten by /library sync -->

EOF
        cat "$file" >> "$TEMP_FILE"
        mv "$TEMP_FILE" "$file"
      fi
      ;;

    json)
      # JSON files: Add to metadata
      TEMP_FILE=$(mktemp)

      # Use jq if available
      if command -v jq &> /dev/null; then
        jq ". + {\"_customization\": {\"customized\": true, \"date\": \"$(date -I)\", \"reason\": \"$CUSTOM_REASON\", \"central_source\": \"$CENTRAL_SOURCE\"}}" \
          "$file" > "$TEMP_FILE"
        mv "$TEMP_FILE" "$file"
      else
        # Manual JSON edit
        echo "  ⚠️  jq not available, skipping JSON metadata"
      fi
      ;;
  esac
}

# Add header to main file
if [[ "$LOCAL_TARGET" =~ \.md$ ]]; then
  add_customization_header "$LOCAL_TARGET" "md"
  echo "✓ Added customization header"
elif [[ "$LOCAL_TARGET" =~ \.json$ ]]; then
  add_customization_header "$LOCAL_TARGET" "json"
  echo "✓ Added customization metadata"
elif [ -d "$LOCAL_TARGET" ]; then
  # Extension directory - add to package.json or README
  if [ -f "$LOCAL_TARGET/package.json" ]; then
    add_customization_header "$LOCAL_TARGET/package.json" "json"
    echo "✓ Added customization metadata to package.json"
  fi
  if [ -f "$LOCAL_TARGET/README.md" ]; then
    add_customization_header "$LOCAL_TARGET/README.md" "md"
    echo "✓ Added customization header to README.md"
  fi
fi

echo ""
```

### 8. Update Local Manifest

```bash
# Ensure manifest exists
if [ ! -f "$LOCAL_CATALOG" ]; then
  cat > "$LOCAL_CATALOG" <<EOF
# Library Manifest
# Auto-generated by /library

version: 1.0.0
customizations: []
EOF
fi

# Add to customizations section
if ! grep -q "customizations:" "$LOCAL_CATALOG"; then
  cat >> "$LOCAL_CATALOG" <<EOF

customizations: []
EOF
fi

# Add customization entry (append to YAML array)
# This is simplified - real implementation should use yq for proper YAML editing
cat >> "$LOCAL_CATALOG" <<EOF
  - artifact: "$ARTIFACT_TYPE:$ARTIFACT_NAME"
    customized: true
    customized_date: $(date -I)
    reason: "$CUSTOM_REASON"
    central_source: $CENTRAL_SOURCE
    local_source: $LOCAL_TARGET
EOF

echo "✓ Updated local manifest"
echo ""
```

### 9. Open for Editing

```bash
# Determine what to edit
EDIT_TARGET="$LOCAL_TARGET"

if [ -d "$LOCAL_TARGET" ]; then
  # Extension directory - find main file
  if [ -f "$LOCAL_TARGET/index.ts" ]; then
    EDIT_TARGET="$LOCAL_TARGET/index.ts"
  elif [ -f "$LOCAL_TARGET/package.json" ]; then
    EDIT_TARGET="$LOCAL_TARGET/package.json"
  fi
fi

echo "Artifact ready for customization!"
echo ""
echo "File: $EDIT_TARGET"
echo ""
read -p "Edit now? (y/n): " edit_now

if [ "$edit_now" = "y" ]; then
  # Use editor from environment or default to nano
  EDITOR="${EDITOR:-nano}"
  $EDITOR "$EDIT_TARGET"

  echo ""
  echo "✓ Artifact customized"
else
  echo ""
  echo "Edit later with:"
  echo "  \$EDITOR $EDIT_TARGET"
fi

echo ""
```

### 10. Show Customization Guide

```bash
echo "📝 Customization Guide"
echo "━━━━━━━━━━━━━━━━━━━━"
echo ""

case "$ARTIFACT_TYPE" in
  skill)
    cat <<EOF
Common skill customizations:

1. Command Arguments
   Modify argument-hint to match project conventions

2. Steps/Procedures
   Adjust steps for project-specific workflows
   Add/remove steps for your process

3. File Paths
   Update paths to match project structure
   Change default locations

4. Dependencies
   Add/remove required tools or skills

5. Examples
   Replace examples with project-specific cases

EOF
    ;;

  agent)
    cat <<EOF
Common agent customizations:

1. Model Selection
   Change model for cost/performance tradeoff

2. System Instructions
   Add project-specific rules and conventions
   Modify behavior for your codebase

3. Tool Access
   Enable/disable specific tools
   Add project-specific tool configurations

4. Context Windows
   Adjust what files/context agent sees

5. Response Style
   Modify output format and verbosity

EOF
    ;;

  prompt)
    cat <<EOF
Common prompt customizations:

1. Instructions
   Tailor instructions for project domain
   Add company/team-specific guidelines

2. Examples
   Replace generic examples with your use cases

3. Context Variables
   Add project-specific variable substitutions

4. Includes
   Reference other project-specific prompts

5. Constraints
   Add stricter or relaxed requirements

EOF
    ;;

  workflow)
    cat <<EOF
Common workflow customizations:

1. Steps
   Add/remove/reorder workflow steps
   Adjust for your team's process

2. Agents/Roles
   Map to your project's agents

3. Handoffs
   Customize how work passes between steps

4. Validation
   Add project-specific validation rules

5. Notifications
   Integrate with your team's tools

EOF
    ;;

  mcp)
    cat <<EOF
Common MCP config customizations:

1. API Endpoints
   Point to different servers/environments

2. Authentication
   Use different API keys or auth methods

3. Parameters
   Adjust default parameters for your use case

4. Timeouts
   Change timeout values for reliability

5. Error Handling
   Customize retry logic and fallbacks

EOF
    ;;

  ext)
    cat <<EOF
Common extension customizations:

1. API Configuration
   Change endpoints, versions, models

2. Provider Implementation
   Adjust how requests are formatted
   Modify response parsing

3. Rate Limits
   Configure for your API tier

4. Caching
   Add/modify caching strategies

5. Error Handling
   Customize retry and fallback logic

EOF
    ;;

  pattern)
    cat <<EOF
Common pattern customizations:

1. Agent Injection Instructions
   Modify where/how pattern is injected

2. Symptom/Fix Details
   Adjust for project-specific context
   Update fix instructions

3. Verification Steps
   Add project-specific verification commands

4. Impact Level
   Change impact: high/medium/low

5. Applies To
   Add/remove agents that this pattern affects

EOF
    ;;
esac
```

### 11. Commit Customization

```bash
echo ""
read -p "Commit customization? (y/n): " do_commit

if [ "$do_commit" = "y" ]; then
  git add .pi/

  git commit -m "$(cat <<EOF
feat(library): customize $ARTIFACT_TYPE:$ARTIFACT_NAME for $(basename "$PWD")

Reason: ${CUSTOM_REASON}

Customized from central artifact:
  $CENTRAL_SOURCE

Local version will override central on sync.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"

  echo "✓ Committed customization"
fi

echo ""
```

### 12. Remind About Sync Behavior

```bash
echo "ℹ️  Sync Behavior"
echo ""
echo "When you run /library sync:"
echo "  - Central updates for '$ARTIFACT_TYPE:$ARTIFACT_NAME' will be SKIPPED"
echo "  - Your local customization will be PRESERVED"
echo "  - To get central updates, you must manually merge or revert"
echo ""
echo "To see central vs local diff:"
echo "  /library diff $ARTIFACT_TYPE:$ARTIFACT_NAME"
echo ""
echo "To revert to central version:"
echo "  /library revert $ARTIFACT_TYPE:$ARTIFACT_NAME"
echo ""
```

## Usage Examples

### Basic Customization: Agent

```bash
/library customize agent:implementer
```

**Output:**
```
Customizing: agent:implementer

✓ Found in central: ~/.pi/library-central/agents/implementer.md

✓ Copied file from central to local
  Source: ~/.pi/library-central/agents/implementer.md
  Local:  .pi/agents/implementer.md

✓ Added customization header
✓ Updated local manifest

Artifact ready for customization!

File: .pi/agents/implementer.md

Edit now? (y/n): y

[Opens editor with agent file]

✓ Artifact customized

📝 Customization Guide
━━━━━━━━━━━━━━━━━━━━

Common agent customizations:

1. Model Selection
   Change model for cost/performance tradeoff
...

Commit customization? (y/n): y
✓ Committed customization

ℹ️  Sync Behavior

When you run /library sync:
  - Central updates for 'agent:implementer' will be SKIPPED
  - Your local customization will be PRESERVED
```

---

### Customization with Reason: Skill

```bash
/library customize skill:commit --reason "Add project-specific commit templates"
```

**Output:**
```
Customizing: skill:commit

✓ Found in central: ~/.pi/library-central/skills/commit/SKILL.md

✓ Copied file from central to local
  Source: ~/.pi/library-central/skills/commit/SKILL.md
  Local:  .pi/skills/commit/SKILL.md

✓ Added customization header
  Reason: Add project-specific commit templates
✓ Updated local manifest

Artifact ready for customization!
```

---

### Re-customization (Backup Existing): Prompt

```bash
/library customize prompt:base-agent
```

**Output:**
```
Customizing: prompt:base-agent

✓ Found in central: ~/.pi/library-central/prompts/base-agent.md

ℹ️  Artifact already customized locally

Re-customize (will backup existing)? (y/n): y

✓ Backed up existing customization:
  .pi/prompts/base-agent.md.backup.20260318_143052

✓ Copied fresh version from central
✓ Artifact ready for customization
```

---

### Pattern Customization

```bash
/library customize pattern:forgot-team-scope
```

**Output:**
```
Customizing: pattern:forgot-team-scope

✓ Found in central: ~/.pi/library-central/learnings/forgot-team-scope.md

✓ Copied file from central to local
  Source: ~/.pi/library-central/learnings/forgot-team-scope.md
  Local:  .pi/learnings/patterns/forgot-team-scope.md

✓ Added customization header
✓ Updated local manifest

Artifact ready for customization!

File: .pi/learnings/patterns/forgot-team-scope.md

Edit now? (y/n): y
```

---

### MCP Config Customization

```bash
/library customize mcp:brave-search --reason "Use company API key"
```

**Output:**
```
Customizing: mcp:brave-search

✓ Found in central: ~/.pi/library-central/mcp-configs/brave-search.json

✓ Copied file from central to local
  Source: ~/.pi/library-central/mcp-configs/brave-search.json
  Local:  .pi/mcp-configs/brave-search.json

✓ Added customization metadata

Artifact ready for customization!

File: .pi/mcp-configs/brave-search.json

📝 Customization Guide
━━━━━━━━━━━━━━━━━━━━

Common MCP config customizations:

1. API Endpoints
   Point to different servers/environments
...
```

---

### Extension Customization

```bash
/library customize ext:straico
```

**Output:**
```
Customizing: ext:straico

✓ Found in central: ~/.pi/library-central/extensions/straico/

✓ Copied directory from central to local
  Source: ~/.pi/library-central/extensions/straico/
  Local:  .pi/extensions/straico/

✓ Added customization metadata to package.json
✓ Added customization header to README.md
✓ Updated local manifest

Artifact ready for customization!

File: .pi/extensions/straico/index.ts

Edit now? (y/n): y
```

---

## Example Customization Scenarios

### 1. Agent: Different Model

**Central:** Uses `claude-opus-4-6`
**Project:** Needs `claude-sonnet-4-5` for cost savings

```bash
/library customize agent:implementer --reason "Cost optimization: use Sonnet"

# Edit .pi/agents/implementer.md
# Change: model: anthropic/claude-sonnet-4-5
```

---

### 2. Skill: Project-Specific Paths

**Central:** Generic file paths
**Project:** Custom monorepo structure

```bash
/library customize skill:test-runner --reason "Monorepo test paths"

# Edit .pi/skills/test-runner/SKILL.md
# Change paths from ./src to ./packages/*/src
```

---

### 3. Prompt: Domain-Specific Context

**Central:** Generic software development
**Project:** Healthcare compliance requirements

```bash
/library customize prompt:code-reviewer --reason "HIPAA compliance checks"

# Edit .pi/prompts/code-reviewer.md
# Add HIPAA-specific review criteria
```

---

### 4. Pattern: Different Field Names

**Central:** Uses `team_id`
**Project:** Uses `org_id`

```bash
/library customize pattern:forgot-team-scope --reason "Uses org_id instead of team_id"

# Edit .pi/learnings/patterns/forgot-team-scope.md
# Replace all references:
#   team_id → org_id
#   getTeam() → getOrganization()
```

---

### 5. Workflow: Additional Approval Step

**Central:** Design → Implement → Deploy
**Project:** Design → Implement → Security Review → Deploy

```bash
/library customize workflow:feature-workflow --reason "Add security review step"

# Edit .pi/workflows/feature-workflow.md
# Add security review step between implement and deploy
```

---

### 6. MCP Config: Staging Environment

**Central:** Production endpoints
**Project:** Staging environment during development

```bash
/library customize mcp:api-server --reason "Point to staging environment"

# Edit .pi/mcp-configs/api-server.json
# Change endpoint: production.api.com → staging.api.com
```

---

## Tracking Customizations

### View All Customizations

```bash
/library status --customized
```

**Output:**
```
Customizations (5):
━━━━━━━━━━━━━━━━━

agent:implementer
  Customized: 2026-03-18
  Reason: Cost optimization: use Sonnet
  Central: ~/.pi/library-central/agents/implementer.md
  Local: .pi/agents/implementer.md

skill:commit
  Customized: 2026-03-17
  Reason: Add project-specific commit templates
  Central: ~/.pi/library-central/skills/commit/SKILL.md
  Local: .pi/skills/commit/SKILL.md

pattern:forgot-team-scope
  Customized: 2026-03-16
  Reason: Uses org_id instead of team_id
  Central: ~/.pi/library-central/learnings/forgot-team-scope.md
  Local: .pi/learnings/patterns/forgot-team-scope.md

mcp:brave-search
  Customized: 2026-03-15
  Reason: Use company API key
  Central: ~/.pi/library-central/mcp-configs/brave-search.json
  Local: .pi/mcp-configs/brave-search.json

ext:straico
  Customized: 2026-03-14
  Reason: Custom rate limits for API tier
  Central: ~/.pi/library-central/extensions/straico/
  Local: .pi/extensions/straico/
```

---

### Compare Local vs Central

```bash
/library diff agent:implementer
```

See [diff.md](./diff.md) for detailed comparison output.

---

## Sync Behavior with Customizations

### Scenario: Central artifact updates, local is customized

```bash
# In central repo (simulating update from another project)
cd ~/.pi/library-central
# Someone improved the agent
echo "Improved prompt" >> agents/implementer.md
git commit -am "improve: better implementer prompts"

# Back to project with customization
cd ~/projects/my-saas
/library sync
```

**Output:**
```
Updated artifacts (1):
  agent:implementer (central version is newer)

Update existing artifacts? (y/n): y

  ⚠️  agent:implementer has local customizations

  Options:
    1. Keep local (skip update)
    2. Use central (discard customization)
    3. Show diff and merge manually
    4. Backup local and pull central

  Choice: 1

  ⏭️  Skipped: agent:implementer (local customization preserved)
```

---

## Error Handling

### Artifact not in central

```bash
/library customize skill:nonexistent
```

**Output:**
```
❌ Artifact not found in central: skill:nonexistent

Searched: ~/.pi/library-central/skills/nonexistent/SKILL.md

Available skills in central:
  - commit
  - test-runner
  - review-pr
  - deploy

Sync first with: /library sync
```

---

### Invalid artifact identifier

```bash
/library customize invalid-format
```

**Output:**
```
❌ Invalid artifact identifier: invalid-format

Format: type:name

Examples:
  agent:implementer
  skill:commit
  prompt:base-agent
  pattern:missing-returns
```

---

## Revert Customization

```bash
/library revert agent:implementer
```

**Output:**
```
⚠️  This will discard local customizations

Local changes will be lost:
  - Customized: 2026-03-18
  - Reason: Cost optimization: use Sonnet

Backup created: .pi/agents/implementer.md.backup

Continue? (y/n): y

✓ Reverted to central version
✓ Removed from customizations list

Artifact now matches central.
Future syncs will update this artifact.
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
   - Use `/library diff` to see what changed
   - Manually merge improvements

4. **Consider pushing general improvements**
   - If your customization is broadly useful
   - Edit central artifact and push instead

5. **Track customization count**
   - Too many customizations = artifacts too generic
   - Consider creating project-specific artifacts instead

6. **Test after customization**
   - Verify customized artifact works as expected
   - Run relevant tests or validation

7. **Version control customizations**
   - Commit customizations to project repo
   - Team members get same customizations

8. **Document project-specific conventions**
   - Create README explaining customizations
   - Helps onboarding new developers
