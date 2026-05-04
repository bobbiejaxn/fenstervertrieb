# Search Library Artifacts

## Context
Search across all artifact types in the universal library system. Find skills, agents, prompts, workflows, MCP configs, extensions, and patterns by keyword, type, tag, or content. Supports fuzzy matching, regex patterns, and relevance ranking.

## Input
Search query with optional filters:
- `<query>` - Search term or pattern (required)
- `--type <type>` - Filter by artifact type (skills, agents, prompts, workflows, mcp, extensions, learnings)
- `--tag <tag>` - Filter by tag or category
- `--field <field>` - Search specific field only (name, description, content)
- `--regex` - Enable regex pattern matching
- `--fuzzy` - Enable fuzzy matching (tolerates typos)
- `--exact` - Exact match only
- `--with-deps` - Include dependencies in results
- `--limit <n>` - Limit results (default: 20)
- `--json` - Output as JSON
- `--verbose` - Show full content excerpts
- `--central` - Search central library only
- `--local` - Search local project only

## Steps

### 1. Load Configuration

```bash
# Load library configuration
source ~/.pi/config.sh 2>/dev/null || echo "No global config"

CENTRAL_PATH="${PI_LIBRARY_CENTRAL:-$HOME/.pi/library-central}"
CENTRAL_CATALOG="$CENTRAL_PATH/catalog.yaml"
PROJECT_DIR=".pi"

# Validate central library exists
if [ ! -d "$CENTRAL_PATH" ]; then
  echo "❌ Central library not initialized"
  echo ""
  echo "Initialize first with:"
  echo "  /library init"
  exit 1
fi
```

### 2. Parse Arguments

```bash
QUERY=""
FILTER_TYPE=""
FILTER_TAG=""
FILTER_FIELD=""
USE_REGEX=false
USE_FUZZY=false
USE_EXACT=false
WITH_DEPS=false
LIMIT=20
OUTPUT_JSON=false
VERBOSE=false
SEARCH_CENTRAL=true
SEARCH_LOCAL=true

while [ $# -gt 0 ]; do
  case "$1" in
    --type)
      FILTER_TYPE="$2"
      shift 2
      ;;
    --tag)
      FILTER_TAG="$2"
      shift 2
      ;;
    --field)
      FILTER_FIELD="$2"
      shift 2
      ;;
    --regex)
      USE_REGEX=true
      shift
      ;;
    --fuzzy)
      USE_FUZZY=true
      shift
      ;;
    --exact)
      USE_EXACT=true
      shift
      ;;
    --with-deps)
      WITH_DEPS=true
      shift
      ;;
    --limit)
      LIMIT="$2"
      shift 2
      ;;
    --json)
      OUTPUT_JSON=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --central)
      SEARCH_LOCAL=false
      shift
      ;;
    --local)
      SEARCH_CENTRAL=false
      shift
      ;;
    *)
      if [ -z "$QUERY" ]; then
        QUERY="$1"
      fi
      shift
      ;;
  esac
done

# Validate query
if [ -z "$QUERY" ]; then
  echo "❌ Search query required"
  echo ""
  echo "Usage:"
  echo "  /library search <query> [options]"
  echo ""
  echo "Examples:"
  echo "  /library search commit"
  echo "  /library search authentication --type agents"
  echo "  /library search \"error handling\" --fuzzy"
  exit 1
fi
```

### 3. Build Search Locations

```bash
# Determine which locations to search
SEARCH_PATHS=()

if [ "$SEARCH_CENTRAL" = "true" ]; then
  SEARCH_PATHS+=("$CENTRAL_PATH")
fi

if [ "$SEARCH_LOCAL" = "true" ]; then
  SEARCH_PATHS+=("$PROJECT_DIR")
fi

# Filter by artifact type
ARTIFACT_DIRS=()

case "$FILTER_TYPE" in
  skills)
    ARTIFACT_DIRS=("skills")
    ;;
  agents)
    ARTIFACT_DIRS=("agents")
    ;;
  prompts)
    ARTIFACT_DIRS=("prompts")
    ;;
  workflows)
    ARTIFACT_DIRS=("workflows")
    ;;
  mcp)
    ARTIFACT_DIRS=("mcp-configs")
    ;;
  extensions)
    ARTIFACT_DIRS=("extensions")
    ;;
  learnings|patterns)
    ARTIFACT_DIRS=("learnings")
    ;;
  "")
    # Search all types
    ARTIFACT_DIRS=("skills" "agents" "prompts" "workflows" "mcp-configs" "extensions" "learnings")
    ;;
  *)
    echo "❌ Unknown artifact type: $FILTER_TYPE"
    echo ""
    echo "Valid types: skills, agents, prompts, workflows, mcp, extensions, learnings"
    exit 1
    ;;
esac
```

### 4. Search Implementation

```bash
# Initialize results array
declare -a SEARCH_RESULTS=()
declare -A RESULT_SCORES=()

# Search function
search_artifact() {
  local artifact_path="$1"
  local artifact_type="$2"
  local artifact_name="$3"
  local artifact_file="$4"

  local score=0
  local matches=()

  # Read artifact content
  local content=""
  if [ -f "$artifact_file" ]; then
    content=$(cat "$artifact_file")
  else
    return
  fi

  # Extract fields based on artifact type
  local name_field=""
  local description_field=""
  local extra_fields=""

  case "$artifact_type" in
    skills)
      name_field=$(echo "$content" | grep "^name:" | head -1 | cut -d: -f2- | xargs)
      description_field=$(echo "$content" | grep "^description:" | head -1 | cut -d: -f2- | xargs)
      extra_fields=$(echo "$content" | grep "^argument-hint:" | head -1 | cut -d: -f2- | xargs)
      ;;
    agents)
      name_field=$(basename "$artifact_file" .md)
      description_field=$(echo "$content" | grep -E "^description:|^# " | head -1 | sed 's/^[# ]*description: *//' | xargs)
      extra_fields=$(echo "$content" | grep "^applies_to:" | cut -d: -f2- | xargs)
      extra_fields="$extra_fields $(echo "$content" | grep "^model:" | cut -d: -f2- | xargs)"
      ;;
    prompts)
      name_field=$(basename "$artifact_file" .md)
      description_field=$(echo "$content" | grep "^# " | head -1 | sed 's/^# *//' | xargs)
      extra_fields=$(echo "$content" | grep "^includes:" | cut -d: -f2- | xargs)
      ;;
    learnings)
      name_field=$(basename "$artifact_file" .md)
      description_field=$(echo "$content" | grep "^symptom:" | cut -d: -f2- | xargs)
      extra_fields=$(echo "$content" | grep "^fix:" | cut -d: -f2- | xargs)
      extra_fields="$extra_fields $(echo "$content" | grep "^applies_to:" | cut -d: -f2- | xargs)"
      ;;
    mcp_configs)
      name_field=$(basename "$artifact_file" .json)
      if command -v jq >/dev/null && [ -f "$artifact_file" ]; then
        description_field=$(jq -r '.description // ""' "$artifact_file")
        extra_fields=$(jq -r '.requires_api_key // ""' "$artifact_file")
      fi
      ;;
    extensions)
      name_field=$(basename "$artifact_path")
      if [ -f "$artifact_path/package.json" ] && command -v jq >/dev/null; then
        description_field=$(jq -r '.description // ""' "$artifact_path/package.json")
        extra_fields=$(jq -r '.type // ""' "$artifact_path/package.json")
      fi
      ;;
  esac

  # Perform search based on mode
  if [ "$USE_REGEX" = "true" ]; then
    # Regex search
    if echo "$name_field" | grep -qE "$QUERY"; then
      score=$((score + 10))
      matches+=("name")
    fi
    if echo "$description_field" | grep -qE "$QUERY"; then
      score=$((score + 5))
      matches+=("description")
    fi
    if echo "$extra_fields" | grep -qE "$QUERY"; then
      score=$((score + 3))
      matches+=("metadata")
    fi
    if echo "$content" | grep -qE "$QUERY"; then
      score=$((score + 1))
      matches+=("content")
    fi
  elif [ "$USE_EXACT" = "true" ]; then
    # Exact match
    if echo "$name_field" | grep -qF "$QUERY"; then
      score=$((score + 10))
      matches+=("name")
    fi
    if echo "$description_field" | grep -qF "$QUERY"; then
      score=$((score + 5))
      matches+=("description")
    fi
    if echo "$extra_fields" | grep -qF "$QUERY"; then
      score=$((score + 3))
      matches+=("metadata")
    fi
    if echo "$content" | grep -qF "$QUERY"; then
      score=$((score + 1))
      matches+=("content")
    fi
  else
    # Case-insensitive substring search (default)
    local query_lower=$(echo "$QUERY" | tr '[:upper:]' '[:lower:]')

    if echo "$name_field" | tr '[:upper:]' '[:lower:]' | grep -qF "$query_lower"; then
      score=$((score + 10))
      matches+=("name")
    fi
    if echo "$description_field" | tr '[:upper:]' '[:lower:]' | grep -qF "$query_lower"; then
      score=$((score + 5))
      matches+=("description")
    fi
    if echo "$extra_fields" | tr '[:upper:]' '[:lower:]' | grep -qF "$query_lower"; then
      score=$((score + 3))
      matches+=("metadata")
    fi
    if echo "$content" | tr '[:upper:]' '[:lower:]' | grep -qF "$query_lower"; then
      score=$((score + 1))
      matches+=("content")
    fi

    # Fuzzy matching (simple edit distance approximation)
    if [ "$USE_FUZZY" = "true" ]; then
      # Check for partial word matches
      for word in $query_lower; do
        if echo "$name_field" | tr '[:upper:]' '[:lower:]' | grep -qE "$(echo "$word" | sed 's/./&.?/g')"; then
          score=$((score + 2))
          matches+=("fuzzy_name")
        fi
      done
    fi
  fi

  # Filter by field if specified
  if [ -n "$FILTER_FIELD" ]; then
    local field_matched=false
    for match in "${matches[@]}"; do
      if [[ "$match" == *"$FILTER_FIELD"* ]]; then
        field_matched=true
        break
      fi
    done

    if [ "$field_matched" = "false" ]; then
      score=0
    fi
  fi

  # If score > 0, add to results
  if [ $score -gt 0 ]; then
    local result_key="${artifact_type}:${name_field}"

    # Check tag filter
    if [ -n "$FILTER_TAG" ]; then
      local tags=$(echo "$content" | grep "^tags:" | cut -d: -f2- | xargs)
      if ! echo "$tags" | grep -qiF "$FILTER_TAG"; then
        return
      fi
    fi

    SEARCH_RESULTS+=("$result_key|$score|$artifact_file|${matches[*]}")
    RESULT_SCORES["$result_key"]=$score
  fi
}
```

### 5. Execute Search

```bash
echo "Searching for: $QUERY" >&2
if [ -n "$FILTER_TYPE" ]; then
  echo "  Type filter: $FILTER_TYPE" >&2
fi
if [ -n "$FILTER_TAG" ]; then
  echo "  Tag filter: $FILTER_TAG" >&2
fi
echo "" >&2

# Search all locations
for search_path in "${SEARCH_PATHS[@]}"; do
  for artifact_dir in "${ARTIFACT_DIRS[@]}"; do
    full_path="$search_path/$artifact_dir"

    if [ ! -d "$full_path" ]; then
      continue
    fi

    # Determine artifact type
    artifact_type=$(basename "$artifact_dir" | sed 's/-configs$//')

    # Search based on artifact type
    case "$artifact_dir" in
      skills)
        # Find all SKILL.md files
        for skill_dir in "$full_path"/*; do
          if [ -d "$skill_dir" ]; then
            skill_file="$skill_dir/SKILL.md"
            if [ -f "$skill_file" ]; then
              skill_name=$(basename "$skill_dir")
              search_artifact "$skill_dir" "skills" "$skill_name" "$skill_file"
            fi
          fi
        done
        ;;
      agents|prompts|workflows|learnings)
        # Find all .md files
        for file in "$full_path"/*.md "$full_path"/patterns/*.md; do
          if [ -f "$file" ]; then
            name=$(basename "$file" .md)
            search_artifact "$(dirname "$file")" "$artifact_type" "$name" "$file"
          fi
        done
        ;;
      mcp-configs)
        # Find all .json files
        for file in "$full_path"/*.json; do
          if [ -f "$file" ]; then
            name=$(basename "$file" .json)
            search_artifact "$(dirname "$file")" "mcp" "$name" "$file"
          fi
        done
        ;;
      extensions)
        # Find all extension directories
        for ext_dir in "$full_path"/*; do
          if [ -d "$ext_dir" ]; then
            name=$(basename "$ext_dir")
            search_artifact "$ext_dir" "extensions" "$name" "$ext_dir/package.json"
          fi
        done
        ;;
    esac
  done
done
```

### 6. Sort Results by Relevance

```bash
# Sort results by score (descending)
IFS=$'\n' SORTED_RESULTS=($(
  for result in "${SEARCH_RESULTS[@]}"; do
    echo "$result"
  done | sort -t'|' -k2 -rn | head -n "$LIMIT"
))
unset IFS

RESULT_COUNT=${#SORTED_RESULTS[@]}
```

### 7. Load Dependencies (if requested)

```bash
# Load dependency information
get_dependencies() {
  local artifact="$1"
  local artifact_file="$2"

  local deps=()

  if [ ! -f "$artifact_file" ]; then
    echo ""
    return
  fi

  # Parse dependencies from artifact
  local content=$(cat "$artifact_file")

  # Extract dependencies (simplified YAML parsing)
  local in_deps=false
  while IFS= read -r line; do
    if echo "$line" | grep -q "^dependencies:"; then
      in_deps=true
      continue
    fi

    if [ "$in_deps" = "true" ]; then
      if echo "$line" | grep -q "^  - "; then
        dep=$(echo "$line" | sed 's/^  - //' | xargs)
        deps+=("$dep")
      elif echo "$line" | grep -q "^[a-z]"; then
        break
      fi
    fi
  done <<< "$content"

  # Also check for includes (for prompts)
  if echo "$content" | grep -q "^includes:"; then
    while IFS= read -r line; do
      if echo "$line" | grep -q "^  - "; then
        dep=$(echo "$line" | sed 's/^  - //' | xargs)
        deps+=("$dep")
      fi
    done < <(echo "$content" | sed -n '/^includes:/,/^[a-z]/p' | grep "^  - ")
  fi

  echo "${deps[@]}"
}
```

### 8. Output: JSON Format

```bash
if [ "$OUTPUT_JSON" = "true" ]; then
  echo "{"
  echo "  \"query\": \"$QUERY\","
  echo "  \"filters\": {"
  echo "    \"type\": \"$FILTER_TYPE\","
  echo "    \"tag\": \"$FILTER_TAG\","
  echo "    \"field\": \"$FILTER_FIELD\""
  echo "  },"
  echo "  \"total_results\": $RESULT_COUNT,"
  echo "  \"results\": ["

  local first=true
  for result in "${SORTED_RESULTS[@]}"; do
    IFS='|' read -r artifact_key score artifact_file matches <<< "$result"

    artifact_type="${artifact_key%%:*}"
    artifact_name="${artifact_key##*:}"

    if [ "$first" = "true" ]; then
      first=false
    else
      echo ","
    fi

    echo "    {"
    echo "      \"type\": \"$artifact_type\","
    echo "      \"name\": \"$artifact_name\","
    echo "      \"score\": $score,"
    echo "      \"matches\": [$(echo "$matches" | sed 's/ /", "/g' | sed 's/^/"/' | sed 's/$/"/')],"
    echo "      \"path\": \"$artifact_file\""

    if [ "$WITH_DEPS" = "true" ]; then
      deps=$(get_dependencies "$artifact_key" "$artifact_file")
      echo "      ,\"dependencies\": [$(echo "$deps" | sed 's/ /", "/g' | sed 's/^/"/' | sed 's/$/"/' | sed 's/"",//g')]"
    fi

    echo -n "    }"
  done

  echo ""
  echo "  ]"
  echo "}"
  exit 0
fi
```

### 9. Output: Standard Display

```bash
echo "Search Results"
echo "══════════════"
echo ""
echo "Query: \"$QUERY\""
if [ -n "$FILTER_TYPE" ]; then
  echo "Type: $FILTER_TYPE"
fi
if [ -n "$FILTER_TAG" ]; then
  echo "Tag: $FILTER_TAG"
fi
echo ""
echo "Found $RESULT_COUNT results:"
echo ""

if [ $RESULT_COUNT -eq 0 ]; then
  echo "No matches found."
  echo ""
  echo "Try:"
  echo "  - Use --fuzzy for typo-tolerant search"
  echo "  - Remove --type filter to search all artifacts"
  echo "  - Use --regex for pattern matching"
  echo "  - Check spelling or try different keywords"
  exit 0
fi
```

### 10. Display Results

```bash
for idx in "${!SORTED_RESULTS[@]}"; do
  result="${SORTED_RESULTS[$idx]}"
  IFS='|' read -r artifact_key score artifact_file matches <<< "$result"

  artifact_type="${artifact_key%%:*}"
  artifact_name="${artifact_key##*:}"

  # Determine icon based on type
  case "$artifact_type" in
    skills) icon="🔧" ;;
    agents) icon="🤖" ;;
    prompts) icon="📝" ;;
    workflows) icon="🔄" ;;
    mcp) icon="🔌" ;;
    extensions) icon="⚡" ;;
    learnings) icon="💡" ;;
    *) icon="📦" ;;
  esac

  # Display result header
  echo "$((idx + 1)). $icon $artifact_type:$artifact_name"
  echo "   Score: $score | Matches: $matches"

  # Read artifact for description
  if [ -f "$artifact_file" ]; then
    content=$(cat "$artifact_file")

    # Extract description based on type
    description=""
    case "$artifact_type" in
      skills)
        description=$(echo "$content" | grep "^description:" | head -1 | cut -d: -f2- | xargs | cut -c1-80)
        ;;
      agents)
        description=$(echo "$content" | grep -E "^description:|^# " | head -1 | sed 's/^[# ]*description: *//' | xargs | cut -c1-80)
        ;;
      prompts|learnings)
        description=$(echo "$content" | grep "^# " | head -1 | sed 's/^# *//' | xargs | cut -c1-80)
        ;;
      mcp)
        if command -v jq >/dev/null; then
          description=$(jq -r '.description // ""' "$artifact_file" | cut -c1-80)
        fi
        ;;
      extensions)
        if [ -f "$(dirname "$artifact_file")/package.json" ] && command -v jq >/dev/null; then
          description=$(jq -r '.description // ""' "$(dirname "$artifact_file")/package.json" | cut -c1-80)
        fi
        ;;
    esac

    if [ -n "$description" ]; then
      echo "   Description: $description"
    fi

    # Show verbose content excerpt if requested
    if [ "$VERBOSE" = "true" ]; then
      echo ""
      echo "   Content excerpt:"
      # Show lines matching the query
      if [ "$USE_REGEX" = "true" ]; then
        echo "$content" | grep -E "$QUERY" | head -3 | sed 's/^/     /'
      else
        echo "$content" | grep -iF "$QUERY" | head -3 | sed 's/^/     /'
      fi
    fi

    # Show dependencies if requested
    if [ "$WITH_DEPS" = "true" ]; then
      deps=$(get_dependencies "$artifact_key" "$artifact_file")
      if [ -n "$deps" ]; then
        echo "   Dependencies: $deps"
      fi
    fi
  fi

  # Determine location
  if echo "$artifact_file" | grep -q "$CENTRAL_PATH"; then
    echo "   Location: central"
  else
    echo "   Location: local"
  fi

  echo "   Path: $artifact_file"
  echo ""
done
```

### 11. Display Action Summary

```bash
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Actions:"
echo ""
echo "Install artifact:"
echo "  /library install ${SORTED_RESULTS[0]%%|*}"
echo ""
echo "View artifact:"
echo "  cat $(echo "${SORTED_RESULTS[0]}" | cut -d'|' -f3)"
echo ""
echo "Show dependencies:"
echo "  /library deps ${SORTED_RESULTS[0]%%|*}"
echo ""

if [ $RESULT_COUNT -ge "$LIMIT" ]; then
  echo "⚠️  Results limited to $LIMIT. Use --limit <n> to see more."
  echo ""
fi
```

## Example Outputs

### Basic Search

```bash
/library search commit
```

**Output:**
```
Search Results
══════════════

Query: "commit"

Found 3 results:

1. 🔧 skills:commit
   Score: 10 | Matches: name
   Description: Git commit workflow with automatic learning integration
   Location: central
   Path: ~/.pi/library-central/skills/commit/SKILL.md

2. 🤖 agents:implementer
   Score: 3 | Matches: metadata
   Description: Full-stack implementation agent with commit workflow
   Location: central
   Path: ~/.pi/library-central/agents/implementer.md

3. 💡 learnings:auto-commit-learnings
   Score: 1 | Matches: content
   Description: Automatically commit learnings after task completion
   Location: central
   Path: ~/.pi/library-central/learnings/auto-commit-learnings.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Actions:

Install artifact:
  /library install skills:commit

View artifact:
  cat ~/.pi/library-central/skills/commit/SKILL.md

Show dependencies:
  /library deps skills:commit
```

---

### Search by Type

```bash
/library search authentication --type agents
```

**Output:**
```
Search Results
══════════════

Query: "authentication"
Type: agents

Found 2 results:

1. 🤖 agents:security-reviewer
   Score: 5 | Matches: description
   Description: Reviews code for security issues including authentication flaws
   Location: central
   Path: ~/.pi/library-central/agents/security-reviewer.md

2. 🤖 agents:implementer
   Score: 1 | Matches: content
   Description: Full-stack implementation agent with security patterns
   Location: central
   Path: ~/.pi/library-central/agents/implementer.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Actions:

Install artifact:
  /library install agents:security-reviewer

View artifact:
  cat ~/.pi/library-central/agents/security-reviewer.md

Show dependencies:
  /library deps agents:security-reviewer
```

---

### Fuzzy Search

```bash
/library search "errr handlng" --fuzzy
```

**Output:**
```
Search Results
══════════════

Query: "errr handlng"

Found 4 results:

1. 💡 learnings:forgot-error-handling
   Score: 7 | Matches: fuzzy_name description
   Description: Pattern for missing error handling in async operations
   Location: central
   Path: ~/.pi/library-central/learnings/forgot-error-handling.md

2. 🔧 skills:error-recovery
   Score: 5 | Matches: fuzzy_name
   Description: Skill for implementing error recovery patterns
   Location: central
   Path: ~/.pi/library-central/skills/error-recovery/SKILL.md

3. 📝 prompts:error-handling
   Score: 5 | Matches: fuzzy_name
   Description: Error handling instructions for agents
   Location: central
   Path: ~/.pi/library-central/prompts/error-handling.md

4. 🤖 agents:fixer
   Score: 2 | Matches: fuzzy_name content
   Description: Diagnoses and fixes errors in code
   Location: central
   Path: ~/.pi/library-central/agents/fixer.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Actions:

Install artifact:
  /library install learnings:forgot-error-handling

View artifact:
  cat ~/.pi/library-central/learnings/forgot-error-handling.md

Show dependencies:
  /library deps learnings:forgot-error-handling
```

---

### Regex Search

```bash
/library search "^deepseek|^straico" --regex --type extensions
```

**Output:**
```
Search Results
══════════════

Query: "^deepseek|^straico"
Type: extensions

Found 2 results:

1. ⚡ extensions:deepseek
   Score: 10 | Matches: name
   Description: DeepSeek provider extension for pi_launchpad
   Location: central
   Path: ~/.pi/library-central/extensions/deepseek/package.json

2. ⚡ extensions:straico
   Score: 10 | Matches: name
   Description: Straico provider extension - 70+ models via single API
   Location: central
   Path: ~/.pi/library-central/extensions/straico/package.json

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Actions:

Install artifact:
  /library install extensions:deepseek

View artifact:
  cat ~/.pi/library-central/extensions/deepseek/package.json

Show dependencies:
  /library deps extensions:deepseek
```

---

### Search with Dependencies

```bash
/library search implementer --with-deps
```

**Output:**
```
Search Results
══════════════

Query: "implementer"

Found 1 result:

1. 🤖 agents:implementer
   Score: 10 | Matches: name
   Description: Full-stack implementation agent with Convex patterns
   Dependencies: skills:commit prompts:base-agent prompts:convex-specialist
   Location: central
   Path: ~/.pi/library-central/agents/implementer.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Actions:

Install artifact:
  /library install agents:implementer

View artifact:
  cat ~/.pi/library-central/agents/implementer.md

Show dependencies:
  /library deps agents:implementer
```

---

### Verbose Search

```bash
/library search "missing returns" --type learnings --verbose
```

**Output:**
```
Search Results
══════════════

Query: "missing returns"
Type: learnings

Found 1 result:

1. 💡 learnings:missing-returns
   Score: 10 | Matches: name description
   Description: Pattern for functions that forget to return values

   Content excerpt:
     ## Symptom: Functions that forget to return values
     Functions defined with a return type but missing return statements
     Especially common in early-exit patterns and error handling

   Location: central
   Path: ~/.pi/library-central/learnings/missing-returns.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Actions:

Install artifact:
  /library install learnings:missing-returns

View artifact:
  cat ~/.pi/library-central/learnings/missing-returns.md

Show dependencies:
  /library deps learnings:missing-returns
```

---

### Search Local Only

```bash
/library search reviewer --local
```

**Output:**
```
Search Results
══════════════

Query: "reviewer"

Found 1 result:

1. 🤖 agents:code-reviewer
   Score: 5 | Matches: description
   Description: Reviews code for quality, security, and best practices
   Location: local
   Path: .pi/agents/code-reviewer.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Actions:

Install artifact:
  /library install agents:code-reviewer

View artifact:
  cat .pi/agents/code-reviewer.md

Show dependencies:
  /library deps agents:code-reviewer
```

---

### Search by Field

```bash
/library search "Convex" --field description
```

**Output:**
```
Search Results
══════════════

Query: "Convex"
Field: description

Found 3 results:

1. 🤖 agents:implementer
   Score: 5 | Matches: description
   Description: Full-stack implementation agent with Convex patterns
   Location: central
   Path: ~/.pi/library-central/agents/implementer.md

2. 📝 prompts:convex-specialist
   Score: 5 | Matches: description
   Description: Convex database patterns and best practices
   Location: central
   Path: ~/.pi/library-central/prompts/convex-specialist.md

3. 🔧 skills:convex-migrate
   Score: 5 | Matches: description
   Description: Migrate schemas and data in Convex databases
   Location: central
   Path: ~/.pi/library-central/skills/convex-migrate/SKILL.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Actions:

Install artifact:
  /library install agents:implementer

View artifact:
  cat ~/.pi/library-central/agents/implementer.md

Show dependencies:
  /library deps agents:implementer
```

---

### Search by Tag

```bash
/library search "" --tag testing
```

**Output:**
```
Search Results
══════════════

Query: ""
Tag: testing

Found 4 results:

1. 🤖 agents:tdd-guide
   Score: 3 | Matches: metadata
   Description: Test-driven development guide and enforcer
   Location: central
   Path: ~/.pi/library-central/agents/tdd-guide.md

2. 🔧 skills:test
   Score: 3 | Matches: metadata
   Description: Run tests with coverage reporting
   Location: central
   Path: ~/.pi/library-central/skills/test/SKILL.md

3. 📝 prompts:testing-patterns
   Score: 3 | Matches: metadata
   Description: Testing patterns and best practices
   Location: central
   Path: ~/.pi/library-central/prompts/testing-patterns.md

4. 💡 learnings:missing-test-coverage
   Score: 3 | Matches: metadata
   Description: Pattern for insufficient test coverage
   Location: central
   Path: ~/.pi/library-central/learnings/missing-test-coverage.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Actions:

Install artifact:
  /library install agents:tdd-guide

View artifact:
  cat ~/.pi/library-central/agents/tdd-guide.md

Show dependencies:
  /library deps agents:tdd-guide
```

---

### Exact Match

```bash
/library search "base-agent" --exact
```

**Output:**
```
Search Results
══════════════

Query: "base-agent"

Found 2 results:

1. 📝 prompts:base-agent
   Score: 10 | Matches: name
   Description: Core instructions for all agents
   Location: central
   Path: ~/.pi/library-central/prompts/base-agent.md

2. 🤖 agents:implementer
   Score: 3 | Matches: metadata
   Description: Full-stack implementation agent with Convex patterns
   Location: central
   Path: ~/.pi/library-central/agents/implementer.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Actions:

Install artifact:
  /library install prompts:base-agent

View artifact:
  cat ~/.pi/library-central/prompts/base-agent.md

Show dependencies:
  /library deps prompts:base-agent
```

---

### JSON Output

```bash
/library search "mcp" --type mcp --json
```

**Output:**
```json
{
  "query": "mcp",
  "filters": {
    "type": "mcp",
    "tag": "",
    "field": ""
  },
  "total_results": 4,
  "results": [
    {
      "type": "mcp",
      "name": "brave-search",
      "score": 10,
      "matches": ["name", "description"],
      "path": "~/.pi/library-central/mcp-configs/brave-search.json"
    },
    {
      "type": "mcp",
      "name": "openai",
      "score": 10,
      "matches": ["name"],
      "path": "~/.pi/library-central/mcp-configs/openai.json"
    },
    {
      "type": "mcp",
      "name": "anthropic",
      "score": 10,
      "matches": ["name"],
      "path": "~/.pi/library-central/mcp-configs/anthropic.json"
    },
    {
      "type": "mcp",
      "name": "filesystem",
      "score": 5,
      "matches": ["description"],
      "path": "~/.pi/library-central/mcp-configs/filesystem.json"
    }
  ]
}
```

---

### Multiple Types

```bash
/library search "documentation" --type "agents,skills"
```

**Output:**
```
Search Results
══════════════

Query: "documentation"
Type: agents,skills

Found 2 results:

1. 🤖 agents:doc-updater
   Score: 10 | Matches: name description
   Description: Updates documentation and maintains codemaps
   Location: central
   Path: ~/.pi/library-central/agents/doc-updater.md

2. 🔧 skills:generate-docs
   Score: 5 | Matches: description
   Description: Generate documentation from code
   Location: central
   Path: ~/.pi/library-central/skills/generate-docs/SKILL.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Actions:

Install artifact:
  /library install agents:doc-updater

View artifact:
  cat ~/.pi/library-central/agents/doc-updater.md

Show dependencies:
  /library deps agents:doc-updater
```

---

### Limit Results

```bash
/library search "pattern" --limit 3
```

**Output:**
```
Search Results
══════════════

Query: "pattern"

Found 3 results:

1. 💡 learnings:missing-returns
   Score: 5 | Matches: description
   Description: Pattern for functions that forget to return values
   Location: central
   Path: ~/.pi/library-central/learnings/missing-returns.md

2. 💡 learnings:forgot-error-handling
   Score: 5 | Matches: description
   Description: Pattern for missing error handling in async operations
   Location: central
   Path: ~/.pi/library-central/learnings/forgot-error-handling.md

3. 💡 learnings:no-validation
   Score: 5 | Matches: description
   Description: Pattern for missing input validation
   Location: central
   Path: ~/.pi/library-central/learnings/no-validation.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  Results limited to 3. Use --limit <n> to see more.
```

---

### No Results

```bash
/library search "nonexistent-artifact"
```

**Output:**
```
Search Results
══════════════

Query: "nonexistent-artifact"

No matches found.

Try:
  - Use --fuzzy for typo-tolerant search
  - Remove --type filter to search all artifacts
  - Use --regex for pattern matching
  - Check spelling or try different keywords
```

---

## Integration with Workflow

### Quick Discovery

```bash
# Find artifacts related to testing
/library search testing

# Find all agent types
/library search "" --type agents

# Find MCP configs requiring API keys
/library search "requires_api_key" --type mcp
```

---

### Install After Search

```bash
# Search and install in one workflow
/library search authentication --type agents
# → Found: agents:security-reviewer

/library install agents:security-reviewer
```

---

### Cross-Reference Search

```bash
# Find all artifacts that depend on base-agent
/library search "base-agent" --with-deps

# Find patterns related to a specific technology
/library search "Convex" --type learnings
```

---

### Exploration Workflow

```bash
# 1. Search broadly
/library search "database"

# 2. Narrow by type
/library search "database" --type agents

# 3. View with dependencies
/library search "database" --type agents --with-deps

# 4. Install
/library install agents:database-architect
```

---

## Error Handling

**Central library not initialized:**
```
❌ Central library not initialized

Initialize first with:
  /library init
```

**Invalid artifact type:**
```
❌ Unknown artifact type: invalid

Valid types: skills, agents, prompts, workflows, mcp, extensions, learnings
```

**Missing query:**
```
❌ Search query required

Usage:
  /library search <query> [options]

Examples:
  /library search commit
  /library search authentication --type agents
  /library search "error handling" --fuzzy
```

---

## Advanced Features

### Search Statistics

```bash
# Add to output if desired
echo "Search Statistics:"
echo "  Query time: ${SEARCH_TIME}ms"
echo "  Artifacts scanned: ${ARTIFACTS_SCANNED}"
echo "  Average score: ${AVERAGE_SCORE}"
```

---

### Save Search Results

```bash
# Export search results
/library search "testing" --json > search-results.json

# Use in scripts
RESULTS=$(/library search "agent" --type agents --json)
echo "$RESULTS" | jq '.results[0].name'
```

---

### Combine with Other Commands

```bash
# Search and view dependencies
ARTIFACT=$(/library search "implementer" --json | jq -r '.results[0].type + ":" + .results[0].name')
/library deps "$ARTIFACT"

# Search and diff
AGENT=$(/library search "reviewer" --type agents --json | jq -r '.results[0].type + ":" + .results[0].name')
/library diff "$AGENT"

# Search and install multiple
/library search "error" --type learnings --json | \
  jq -r '.results[] | .type + ":" + .name' | \
  xargs -I {} /library install {}
```

---

## See Also

- Install artifact: `/library install artifact:name`
- View dependencies: `/library deps artifact:name`
- List all artifacts: `/library status`
- Sync from central: `/library sync`
- View catalog: `cat ~/.pi/library-central/catalog.yaml`
