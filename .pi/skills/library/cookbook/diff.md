# Compare Local vs Central Artifact Versions

## Context
Compare your project's local artifact with the central library version to see what has changed. Essential for understanding customizations, reviewing updates, and deciding whether to merge central improvements.

Supports all artifact types: skills, agents, prompts, workflows, MCP configs, extensions, and learnings.

## Input
- Artifact identifier: `type:name` (e.g., "agent:implementer", "skill:commit")
- Optional: `--format <unified|side-by-side|stat>` - Diff format
- Optional: `--color` - Enable colored output
- Optional: `--ignore-whitespace` - Ignore whitespace changes
- Optional: `--context <n>` - Number of context lines (default: 3)

## Steps

### 1. Load Configuration

```bash
source ~/.pi/config.sh 2>/dev/null || echo "No global config found"

CENTRAL_PATH="${PI_LIBRARY_CENTRAL:-$HOME/.pi/library-central}"
ARTIFACT="$1"

# Defaults
DIFF_FORMAT="unified"
USE_COLOR=false
IGNORE_WHITESPACE=false
CONTEXT_LINES=3

# Parse flags
shift
while [ $# -gt 0 ]; do
  case "$1" in
    --format)
      DIFF_FORMAT="$2"
      shift 2
      ;;
    --color)
      USE_COLOR=true
      shift
      ;;
    --ignore-whitespace)
      IGNORE_WHITESPACE=true
      shift
      ;;
    --context)
      CONTEXT_LINES="$2"
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
  echo "  /library diff agent:implementer"
  echo "  /library diff skill:commit"
  echo "  /library diff pattern:missing-returns"
  exit 1
fi

echo "Comparing: $ARTIFACT_TYPE:$ARTIFACT_NAME"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
```

### 3. Map Artifact Type to Paths

```bash
# Map artifact type to file/directory paths
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
    exit 1
    ;;
esac
```

### 4. Validate Both Versions Exist

```bash
# Check central exists
if [ ! -e "$CENTRAL_SOURCE" ]; then
  echo "❌ Central artifact not found: $CENTRAL_SOURCE"
  echo ""
  echo "Artifact may not exist in central library."
  echo "Run: /library status"
  exit 1
fi

# Check local exists
if [ ! -e "$LOCAL_TARGET" ]; then
  echo "❌ Local artifact not found: $LOCAL_TARGET"
  echo ""
  echo "Artifact not installed locally."
  echo "Run: /library install $ARTIFACT_TYPE:$ARTIFACT_NAME"
  exit 1
fi

echo "Central: $CENTRAL_SOURCE"
echo "Local:   $LOCAL_TARGET"
echo ""
```

### 5. Check if Files are Identical

```bash
# Quick check for identical files
if [ -f "$CENTRAL_SOURCE" ] && [ -f "$LOCAL_TARGET" ]; then
  if diff -q "$CENTRAL_SOURCE" "$LOCAL_TARGET" > /dev/null 2>&1; then
    echo "✓ No differences - local matches central"
    echo ""
    echo "Last central update:"
    cd "$CENTRAL_PATH"
    git log -1 --format="%h - %s (%ar)" -- "${CENTRAL_SOURCE#$CENTRAL_PATH/}"
    cd - > /dev/null
    exit 0
  fi
elif [ -d "$CENTRAL_SOURCE" ] && [ -d "$LOCAL_TARGET" ]; then
  if diff -qr "$CENTRAL_SOURCE" "$LOCAL_TARGET" > /dev/null 2>&1; then
    echo "✓ No differences - local matches central"
    exit 0
  fi
fi

echo "Differences found:"
echo "━━━━━━━━━━━━━━━━"
echo ""
```

### 6. Generate Diff Based on Format

```bash
# Build diff command
DIFF_CMD="diff"

# Add flags based on options
if [ "$IGNORE_WHITESPACE" = true ]; then
  DIFF_CMD="$DIFF_CMD -w"
fi

DIFF_CMD="$DIFF_CMD -U$CONTEXT_LINES"

# Handle directories (extensions)
if [ -d "$CENTRAL_SOURCE" ]; then
  DIFF_CMD="$DIFF_CMD -r"
fi

case "$DIFF_FORMAT" in
  unified)
    # Unified diff (default)
    if [ "$USE_COLOR" = true ] && command -v colordiff &> /dev/null; then
      $DIFF_CMD "$CENTRAL_SOURCE" "$LOCAL_TARGET" | colordiff | less -R
    else
      $DIFF_CMD "$CENTRAL_SOURCE" "$LOCAL_TARGET" | less
    fi
    ;;

  side-by-side)
    # Side-by-side diff
    if command -v sdiff &> /dev/null; then
      if [ -f "$CENTRAL_SOURCE" ]; then
        sdiff -w 160 "$CENTRAL_SOURCE" "$LOCAL_TARGET" | less -S
      else
        echo "⚠️  Side-by-side not supported for directories"
        echo "Falling back to unified diff"
        $DIFF_CMD "$CENTRAL_SOURCE" "$LOCAL_TARGET" | less
      fi
    else
      echo "⚠️  sdiff not available, falling back to unified"
      $DIFF_CMD "$CENTRAL_SOURCE" "$LOCAL_TARGET" | less
    fi
    ;;

  stat)
    # Stat only - just show what changed
    if [ -f "$CENTRAL_SOURCE" ]; then
      ADDITIONS=$(diff "$CENTRAL_SOURCE" "$LOCAL_TARGET" | grep '^>' | wc -l | xargs)
      DELETIONS=$(diff "$CENTRAL_SOURCE" "$LOCAL_TARGET" | grep '^<' | wc -l | xargs)
      CHANGES=$(diff "$CENTRAL_SOURCE" "$LOCAL_TARGET" | grep '^[0-9]' | wc -l | xargs)

      echo "Statistics:"
      echo "  $ADDITIONS additions"
      echo "  $DELETIONS deletions"
      echo "  $CHANGES changed sections"
    else
      # Directory stats
      echo "Changed files:"
      diff -qr "$CENTRAL_SOURCE" "$LOCAL_TARGET" | while read line; do
        if [[ "$line" =~ "differ" ]]; then
          FILE=$(echo "$line" | awk '{print $2}')
          echo "  - ${FILE#$CENTRAL_SOURCE/}"
        elif [[ "$line" =~ "Only in $CENTRAL_SOURCE" ]]; then
          echo "  - (removed locally) $(echo $line | sed 's/Only in.*: //')"
        elif [[ "$line" =~ "Only in $LOCAL_TARGET" ]]; then
          echo "  + (added locally) $(echo $line | sed 's/Only in.*: //')"
        fi
      done
    fi
    ;;

  *)
    echo "❌ Unknown format: $DIFF_FORMAT"
    echo "Valid formats: unified, side-by-side, stat"
    exit 1
    ;;
esac
```

### 7. Show Change Summary

```bash
echo ""
echo "Summary:"
echo "━━━━━━━"
echo ""

# Determine if customized
LOCAL_CATALOG=".pi/library-manifest.yaml"
IS_CUSTOMIZATION=$(grep -A 20 "customizations:" "$LOCAL_CATALOG" 2>/dev/null | \
                   grep "artifact: \"$ARTIFACT_TYPE:$ARTIFACT_NAME\"" || echo "")

if [ -n "$IS_CUSTOMIZATION" ]; then
  echo "Status: ⚠️  Customized locally"
  echo ""

  # Extract customization details
  CUSTOM_DATE=$(grep -A 5 "artifact: \"$ARTIFACT_TYPE:$ARTIFACT_NAME\"" "$LOCAL_CATALOG" | \
                grep "customized_date:" | sed 's/.*customized_date: //')
  CUSTOM_REASON=$(grep -A 5 "artifact: \"$ARTIFACT_TYPE:$ARTIFACT_NAME\"" "$LOCAL_CATALOG" | \
                  grep "reason:" | sed 's/.*reason: "//' | sed 's/"$//')

  echo "Customization details:"
  echo "  Date: $CUSTOM_DATE"
  echo "  Reason: $CUSTOM_REASON"
  echo ""
  echo "Note: Local customization will be preserved on sync."
else
  echo "Status: 📦 Not customized"
  echo ""
  echo "Differences may be from:"
  echo "  - Manual local edits (not marked as customization)"
  echo "  - Outdated local version"
  echo "  - Sync conflict or interrupted sync"
fi

echo ""
echo "Actions:"
echo "  /library customize $ARTIFACT_TYPE:$ARTIFACT_NAME  # Mark as customization"
echo "  /library sync                                      # Pull central version"
echo "  /library revert $ARTIFACT_TYPE:$ARTIFACT_NAME      # Revert to central"
```

### 8. Show Recent Central Changes

```bash
echo ""
echo "Recent central changes:"
echo "━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Show git log for central file
cd "$CENTRAL_PATH"
git log -5 --oneline --date=short --format="%h %ad %s" -- "${CENTRAL_SOURCE#$CENTRAL_PATH/}"
cd - > /dev/null

echo ""
```

## Usage Examples

### Basic Diff: Agent

```bash
/library diff agent:implementer
```

**Output:**
```
Comparing: agent:implementer
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Central: ~/.pi/library-central/agents/implementer.md
Local:   .pi/agents/implementer.md

Differences found:
━━━━━━━━━━━━━━━━

--- ~/.pi/library-central/agents/implementer.md
+++ .pi/agents/implementer.md
@@ -15,7 +15,7 @@

 ## Model Configuration

-model: anthropic/claude-opus-4-6
+model: anthropic/claude-sonnet-4-5

 ## Instructions

@@ -45,6 +45,10 @@
 - Follow project coding standards
 - Write comprehensive tests

+### Project-Specific Rules
+
+- Always use snake_case for database fields
+- Include JSDoc comments for all functions
+
 ## Tools

Summary:
━━━━━━━

Status: ⚠️  Customized locally

Customization details:
  Date: 2026-03-18
  Reason: Cost optimization: use Sonnet

Note: Local customization will be preserved on sync.

Actions:
  /library customize agent:implementer  # Mark as customization
  /library sync                          # Pull central version
  /library revert agent:implementer      # Revert to central

Recent central changes:
━━━━━━━━━━━━━━━━━━━━━

a8f92d1 2026-03-17 improve: better error handling for implementer
3c4e8f2 2026-03-15 feat: add Convex integration patterns
7d92a10 2026-03-12 fix: correct tool configuration
```

---

### Side-by-Side Diff: Skill

```bash
/library diff skill:commit --format side-by-side
```

**Output:**
```
Comparing: skill:commit
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Central: ~/.pi/library-central/skills/commit/SKILL.md
Local:   .pi/skills/commit/SKILL.md

Differences found:
━━━━━━━━━━━━━━━━

---                                     |  ---
name: commit                            |  name: commit
description: "Git commit workflow"      |  description: "Git commit workflow"
---                                     |  ---
                                        >
                                        >  <!-- CUSTOMIZATION: project templates -->
                                        >
# Commit Workflow                       |  # Commit Workflow
                                        |
## Steps                                |  ## Steps
                                        |
1. Stage changes                        |  1. Stage changes
2. Write commit message                 |  2. Write commit message
   - Format: type(scope): summary       |     - Format: type(scope): summary
                                        >     - Use project template from .git/commit-template
3. Commit with co-author                |  3. Commit with co-author
```

---

### Statistics Only: Pattern

```bash
/library diff pattern:forgot-team-scope --format stat
```

**Output:**
```
Comparing: pattern:forgot-team-scope
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Central: ~/.pi/library-central/learnings/forgot-team-scope.md
Local:   .pi/learnings/patterns/forgot-team-scope.md

Differences found:
━━━━━━━━━━━━━━━━

Statistics:
  8 additions
  4 deletions
  3 changed sections

Summary:
━━━━━━━

Status: ⚠️  Customized locally

Customization details:
  Date: 2026-03-16
  Reason: Uses org_id instead of team_id
```

---

### Colored Diff: Prompt

```bash
/library diff prompt:base-agent --color
```

**Output (with ANSI colors):**
```
Comparing: prompt:base-agent
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Central: ~/.pi/library-central/prompts/base-agent.md
Local:   .pi/prompts/base-agent.md

Differences found:
━━━━━━━━━━━━━━━━

[Red lines show deletions from central]
[Green lines show additions in local]
[Color diff displayed in less]
```

---

### Ignore Whitespace: MCP Config

```bash
/library diff mcp:brave-search --ignore-whitespace
```

**Output:**
```
Comparing: mcp:brave-search
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Central: ~/.pi/library-central/mcp-configs/brave-search.json
Local:   .pi/mcp-configs/brave-search.json

Differences found:
━━━━━━━━━━━━━━━━

--- ~/.pi/library-central/mcp-configs/brave-search.json
+++ .pi/mcp-configs/brave-search.json
@@ -3,7 +3,7 @@
   "command": "npx",
   "args": ["-y", "@modelcontextprotocol/server-brave-search"],
   "env": {
-    "BRAVE_API_KEY": "{{ env.BRAVE_API_KEY }}"
+    "BRAVE_API_KEY": "{{ env.COMPANY_BRAVE_KEY }}"
   }
 }
```

---

### Extension Diff (Directory)

```bash
/library diff ext:straico
```

**Output:**
```
Comparing: ext:straico
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Central: ~/.pi/library-central/extensions/straico/
Local:   .pi/extensions/straico/

Differences found:
━━━━━━━━━━━━━━━━

Changed files:
  - index.ts
  - package.json

diff -r ~/.pi/library-central/extensions/straico/index.ts .pi/extensions/straico/index.ts
42c42
<     rateLimit: { requests: 100, period: 60000 }
---
>     rateLimit: { requests: 500, period: 60000 }

diff -r ~/.pi/library-central/extensions/straico/package.json .pi/extensions/straico/package.json
5a6
>   "_customization": { "customized": true, "date": "2026-03-14" },

Summary:
━━━━━━━

Status: ⚠️  Customized locally

Customization details:
  Date: 2026-03-14
  Reason: Custom rate limits for API tier
```

---

### No Differences

```bash
/library diff skill:test-runner
```

**Output:**
```
Comparing: skill:test-runner
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Central: ~/.pi/library-central/skills/test-runner/SKILL.md
Local:   .pi/skills/test-runner/SKILL.md

✓ No differences - local matches central

Last central update:
b4e8f21 - feat: add watch mode support (2 weeks ago)
```

---

### Workflow Diff with Context

```bash
/library diff workflow:feature-workflow --context 5
```

**Output:**
```
Comparing: workflow:feature-workflow
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Central: ~/.pi/library-central/workflows/feature-workflow.md
Local:   .pi/workflows/feature-workflow.md

Differences found:
━━━━━━━━━━━━━━━━

--- ~/.pi/library-central/workflows/feature-workflow.md
+++ .pi/workflows/feature-workflow.md
@@ -28,10 +28,15 @@

 3. Implement feature
    - Agent: implementer
    - Input: Design document
    - Output: Implementation PR

+4. Security review
+   - Agent: security-reviewer
+   - Input: Implementation PR
+   - Output: Security sign-off
+
-4. Deploy to staging
+5. Deploy to staging
    - Agent: deployer
    - Input: Merged PR
    - Output: Staging URL
```

---

## Advanced Usage

### Diff Specific File in Extension

```bash
# For extensions (directories), diff a specific file
diff ~/.pi/library-central/extensions/straico/index.ts \
     .pi/extensions/straico/index.ts
```

---

### Compare Multiple Artifacts

```bash
# Script to compare all customized artifacts
for artifact in $(grep "artifact:" .pi/library-manifest.yaml | cut -d'"' -f2); do
  echo "Checking: $artifact"
  /library diff "$artifact" --format stat
  echo ""
done
```

---

### Export Diff to File

```bash
/library diff agent:implementer > ~/diff-implementer.patch

# Apply later
cd .pi/agents
patch < ~/diff-implementer.patch
```

---

### Compare with Specific Central Version

```bash
# Compare with older central version
cd ~/.pi/library-central
git show HEAD~3:agents/implementer.md > /tmp/implementer-old.md
cd -

diff /tmp/implementer-old.md .pi/agents/implementer.md
```

---

## Integration with Merge Tools

### Use Visual Diff Tool

```bash
# Use meld, vimdiff, or other visual diff tools
meld ~/.pi/library-central/agents/implementer.md \
     .pi/agents/implementer.md

# Or configure as default
export DIFF_TOOL="meld"
/library diff agent:implementer --tool
```

---

### Three-Way Merge

```bash
# Compare local, central, and base version
# Base = version when you last synced

git merge-file \
  .pi/agents/implementer.md \
  .pi/.library-base/agents/implementer.md \
  ~/.pi/library-central/agents/implementer.md
```

---

## Decision Making Guide

### When Central is Newer

**You see additions in central that you don't have:**

```diff
--- Central (newer)
+++ Local (older)
-  New feature: Better error handling
```

**Decision:**
- **Merge manually** if customized
- **Pull update** with `/library sync` if not customized
- **Review changes** before deciding

---

### When You Have Local Changes

**You see additions in local that central doesn't have:**

```diff
--- Central
+++ Local
+  Custom feature: Project-specific validation
```

**Decision:**
- **Mark as customization** with `/library customize`
- **Push to central** if useful for all projects: `/library push`
- **Document reason** for the changes

---

### When Both Have Changes (Conflict)

**Both central and local have unique changes:**

```diff
--- Central
+++ Local
- Central improvement: Better prompts
+ Local customization: Project-specific rules
```

**Decision:**
1. **Use diff to understand both changes**
2. **Manually merge** improvements from central
3. **Keep customizations** that are project-specific
4. **Test thoroughly** after merge

---

## Troubleshooting

### Diff Shows Wrong Files

**Problem:** Diff compares wrong versions

**Solution:**
```bash
# Verify paths
/library status --show-agents

# Check artifact type mapping
ls ~/.pi/library-central/agents/
ls .pi/agents/
```

---

### No Diff Tool Available

**Problem:** `sdiff` or `colordiff` not found

**Solution:**
```bash
# Install on macOS
brew install colordiff

# Install on Linux
apt-get install colordiff

# Or use basic diff (always available)
/library diff agent:implementer
```

---

### Diff Too Large

**Problem:** Diff output is overwhelming

**Solution:**
```bash
# Use stat format
/library diff agent:implementer --format stat

# Or increase context
/library diff agent:implementer --context 1

# Or focus on specific sections
diff ~/.pi/library-central/agents/implementer.md \
     .pi/agents/implementer.md | grep -A5 "section-name"
```

---

### Binary Files Different

**Problem:** Extensions contain binary files

**Solution:**
```bash
# Diff only text files
diff -r --exclude="*.png" --exclude="*.jpg" --exclude="node_modules" \
  ~/.pi/library-central/extensions/straico/ \
  .pi/extensions/straico/
```

---

## Best Practices

1. **Diff before sync**
   - Always check what will change
   - Review central updates before pulling

2. **Diff after customization**
   - Verify your changes are correct
   - Ensure you didn't accidentally break anything

3. **Use stat for quick check**
   - Fast overview of differences
   - Good for checking multiple artifacts

4. **Use side-by-side for review**
   - Better for understanding context
   - Easier to spot logical differences

5. **Keep diffs readable**
   - Use `--ignore-whitespace` for formatting changes
   - Focus on semantic differences

6. **Document significant diffs**
   - Export important diffs to files
   - Reference in customization reason

7. **Periodic review**
   - Check customizations quarterly
   - Merge useful central improvements

8. **Use with version control**
   - Commit before major merges
   - Easy to revert if merge goes wrong

## Related Commands

- `/library customize` - Mark local changes as customization
- `/library sync` - Pull updates from central
- `/library revert` - Revert to central version
- `/library status` - See which artifacts are customized
- `/library push` - Share local improvements to central
