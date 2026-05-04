#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# Obsidian Direct Write Tool — Write content directly to PKM vault
# ═══════════════════════════════════════════════════════════════════════════════
# Bypasses inbox, places content in correct PARA location with proper frontmatter
# Usage: obsidian-write.sh --title "Title" --content "..." [options]
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# ─── Configuration ───────────────────────────────────────────────────────────
VAULT_PATH="${OBSIDIAN_VAULT:-/Users/michaelguiao/Projects/PKM}"
DATE=$(date +%Y-%m-%d)
DATETIME=$(date +"%Y-%m-%d %H:%M")

# ─── Parse Arguments ─────────────────────────────────────────────────────────
TITLE=""
CONTENT=""
TYPE=""
DOMAIN=""
PROJECT=""
AREA=""
LOCATION=""  # Override auto-detection
STATUS="active"
TAGS=""
SOURCE=""
RELEVANT_PROJECTS=""
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --title)
      TITLE="$2"
      shift 2
      ;;
    --content)
      CONTENT="$2"
      shift 2
      ;;
    --type)
      TYPE="$2"
      shift 2
      ;;
    --domain)
      DOMAIN="$2"
      shift 2
      ;;
    --project)
      PROJECT="$2"
      shift 2
      ;;
    --area)
      AREA="$2"
      shift 2
      ;;
    --location)
      LOCATION="$2"
      shift 2
      ;;
    --status)
      STATUS="$2"
      shift 2
      ;;
    --tags)
      TAGS="$2"
      shift 2
      ;;
    --source)
      SOURCE="$2"
      shift 2
      ;;
    --relevant-projects)
      RELEVANT_PROJECTS="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --help|-h)
      echo "Usage: obsidian-write.sh [OPTIONS]"
      echo ""
      echo "Required:"
      echo "  --title TITLE           Note title"
      echo "  --content CONTENT       Note content (use '-' for stdin)"
      echo ""
      echo "Optional (auto-detected if not provided):"
      echo "  --type TYPE            [adr|spec|research|learning|pattern|reference|task|insight|guide|process]"
      echo "  --domain DOMAIN        Subject area (ai-agents, cyber-risk, etc.)"
      echo "  --project PROJECT      Target project name"
      echo "  --area AREA            Target area name"
      echo "  --location PATH        Override: write to specific path"
      echo ""
      echo "Optional metadata:"
      echo "  --status STATUS        [draft|active|archived] (default: active)"
      echo "  --tags TAGS            Comma-separated tags"
      echo "  --source URL           External source URL"
 echo "  --relevant-projects    Comma-separated project names"
      echo ""
      echo "Other:"
      echo "  --dry-run              Show what would be written without writing"
      echo "  --help                 Show this help"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# ─── Validation ──────────────────────────────────────────────────────────────
if [[ -z "$TITLE" ]]; then
  echo "Error: --title is required"
  exit 1
fi

if [[ -z "$CONTENT" ]]; then
  echo "Error: --content is required (use '-' for stdin)"
  exit 1
fi

if [[ "$CONTENT" == "-" ]]; then
  CONTENT=$(cat)
fi

if [[ ! -d "$VAULT_PATH" ]]; then
  echo "Error: Vault not found at $VAULT_PATH"
  echo "Set OBSIDIAN_VAULT environment variable or modify script"
  exit 1
fi

# ─── Auto-Detect Type if Not Provided ────────────────────────────────────────
if [[ -z "$TYPE" ]]; then
  # Simple heuristics based on content
  if echo "$TITLE" | grep -qi "adr\|decision\|architecture"; then
    TYPE="adr"
  elif echo "$TITLE" | grep -qi "research\|study\|analysis"; then
    TYPE="research"
  elif echo "$TITLE" | grep -qi "how to\|guide\|tutorial"; then
    TYPE="guide"
  elif echo "$TITLE" | grep -qi "pattern\|template"; then
    TYPE="pattern"
  elif echo "$CONTENT" | grep -q "^#.*SPEC\|^#.*RFC"; then
    TYPE="spec"
  elif [[ -n "$PROJECT" ]]; then
    TYPE="task"
  else
    TYPE="learning"
  fi
  echo "Auto-detected type: $TYPE"
fi

# ─── Determine PARA Location ─────────────────────────────────────────────────
if [[ -n "$LOCATION" ]]; then
  # User override
  TARGET_DIR="$VAULT_PATH/$LOCATION"
  PARA_TYPE="${PARA_TYPE:-resource}"
elif [[ -n "$PROJECT" ]]; then
  # Project-specific content
  PROJECT_DIR=$(find "$VAULT_PATH/1-Projects" -maxdepth 1 -type d -iname "*$PROJECT*" | head -1)
  if [[ -z "$PROJECT_DIR" ]]; then
    echo "Warning: Project '$PROJECT' not found, creating..."
    PROJECT_DIR="$VAULT_PATH/1-Projects/$PROJECT"
    mkdir -p "$PROJECT_DIR"
  fi
  
  # Subdirectory based on type
  case "$TYPE" in
    adr|spec)
      TARGET_DIR="$PROJECT_DIR/docs"
      ;;
    content)
      TARGET_DIR="$PROJECT_DIR/content"
      ;;
    task)
      TARGET_DIR="$PROJECT_DIR/tasks"
      ;;
    *)
      TARGET_DIR="$PROJECT_DIR"
      ;;
  esac
  PARA_TYPE="project"
  
elif [[ -n "$AREA" ]]; then
  # Area-specific content
  AREA_DIR=$(find "$VAULT_PATH/2-Areas" -maxdepth 1 -type d -iname "*$AREA*" | head -1)
  if [[ -z "$AREA_DIR" ]]; then
    echo "Warning: Area '$AREA' not found, creating..."
    AREA_DIR="$VAULT_PATH/2-Areas/$AREA"
    mkdir -p "$AREA_DIR"
  fi
  TARGET_DIR="$AREA_DIR"
  PARA_TYPE="area"
  
else
  # Resource (default)
  TARGET_DIR="$VAULT_PATH/3-Resources/notes"
  PARA_TYPE="resource"
  
  # Auto-detect domain from content if not provided
  if [[ -z "$DOMAIN" ]]; then
    # Check for domain keywords
    if echo "$CONTENT" | grep -qi "ai.*agent\|llm\|claude\|gpt"; then
      DOMAIN="ai-agents"
    elif echo "$CONTENT" | grep -qi "cyber.*risk\|security\|nis2\|dora"; then
      DOMAIN="cyber-risk"
    elif echo "$CONTENT" | grep -qi "content\|marketing\|seo"; then
      DOMAIN="marketing"
    elif echo "$CONTENT" | grep -qi "ecommerce\|shopify\|store"; then
      DOMAIN="ecommerce"
    else
      DOMAIN="general"
    fi
    echo "Auto-detected domain: $DOMAIN"
  fi
fi

# Ensure target directory exists
mkdir -p "$TARGET_DIR"

# ─── Generate Filename ───────────────────────────────────────────────────────
# Sanitize title: lowercase, replace spaces with hyphens, remove special chars
FILENAME=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/-\+/-/g' | sed 's/^-//;s/-$//')
FILENAME="${DATE}-${FILENAME}.md"
TARGET_PATH="$TARGET_DIR/$FILENAME"

# ─── Build Frontmatter ───────────────────────────────────────────────────────
FRONTMATTER="---
"
FRONTMATTER+="type: ${TYPE}
"
FRONTMATTER+="para_type: ${PARA_TYPE}
"
[[ -n "$DOMAIN" ]] && FRONTMATTER+="domain: ${DOMAIN}
"
[[ -n "$PROJECT" ]] && FRONTMATTER+="project: ${PROJECT}
"
[[ -n "$AREA" ]] && FRONTMATTER+="area: ${AREA}
"
FRONTMATTER+="status: ${STATUS}
"

# Build tags array
ALL_TAGS="$TYPE"
[[ -n "$DOMAIN" ]] && ALL_TAGS+=", $DOMAIN"
[[ -n "$TAGS" ]] && ALL_TAGS+=", $TAGS"
FRONTMATTER+="tags: [${ALL_TAGS}]
"

FRONTMATTER+="created: ${DATE}
"
FRONTMATTER+="updated: ${DATE}
"

[[ -n "$RELEVANT_PROJECTS" ]] && FRONTMATTER+="relevant_projects: [${RELEVANT_PROJECTS}]
"
[[ -n "$SOURCE" ]] && FRONTMATTER+="source: ${SOURCE}
"

FRONTMATTER+="---

"

# ─── Assemble Final Content ──────────────────────────────────────────────────
FINAL_CONTENT="${FRONTMATTER}# ${TITLE}\n\n${CONTENT}"

# ─── Dry Run or Write ────────────────────────────────────────────────────────
if [[ "$DRY_RUN" == true ]]; then
  echo "=== DRY RUN ==="
  echo "Target: $TARGET_PATH"
  echo ""
  echo "---"
  echo "$FINAL_CONTENT" | head -30
  echo "..."
  echo "---"
else
  # Write the file
  echo "$FINAL_CONTENT" > "$TARGET_PATH"
  echo "✅ Written: $TARGET_PATH"
  
  # ─── Update MOCs ───────────────────────────────────────────────────────────
  
  # Update Master Index if it exists
  MASTER_INDEX="$VAULT_PATH/3-Resources/MOCs/index.md"
  if [[ -f "$MASTER_INDEX" ]]; then
    # Add to "Recently Added" section (just append to a list, DataView will pick it up)
    echo "📋 Master Index will show via DataView query"
  fi
  
  # Update or create Domain MOC
  if [[ -n "$DOMAIN" ]]; then
    DOMAIN_MOC="$VAULT_PATH/3-Resources/MOCs/${DOMAIN}-moc.md"
    if [[ ! -f "$DOMAIN_MOC" ]]; then
      # Create new domain MOC from template
      cat > "$DOMAIN_MOC" << EOF
---
type: moc
domain: ${DOMAIN}
status: active
tags: [moc, ${DOMAIN}]
created: ${DATE}
updated: ${DATE}
---

# ${DOMAIN} MOC

Overview of ${DOMAIN} knowledge.

## 🎯 Quick Links

**Most Referenced:**
\`\`\`dataview
TABLE length(file.inlinks) as "Backlinks", type, tags
FROM "3-Resources/notes"
WHERE domain = "${DOMAIN}"
SORT length(file.inlinks) DESC
LIMIT 5
\`\`\`

**Recently Updated:**
\`\`\`dataview
TABLE type, updated, tags
FROM "3-Resources/notes"
WHERE domain = "${DOMAIN}"
SORT updated DESC
LIMIT 5
\`\`\`

## 🔗 Related Notes

- [[${FILENAME%.md}]]

---

**Back to**: [[index|🏠 Home]]
EOF
      echo "✅ Created domain MOC: $DOMAIN_MOC"
    else
      # Add link to existing MOC (append to Related Notes section)
      # This is a simple append - for production, use proper markdown parsing
      echo "- [[${FILENAME%.md}]]" >> "$DOMAIN_MOC"
      echo "📋 Added to domain MOC: $DOMAIN_MOC"
    fi
  fi
  
  # Update Project MOC if relevant
  if [[ -n "$PROJECT" ]]; then
    PROJECT_MOC="$VAULT_PATH/1-Projects/$PROJECT/README.md"
    if [[ -f "$PROJECT_MOC" ]]; then
      echo "📋 Project README exists - manually link if needed"
    fi
  fi
  
  echo ""
  echo "Summary:"
  echo "  File: $TARGET_PATH"
  echo "  Type: $TYPE"
  echo "  PARA: $PARA_TYPE"
  [[ -n "$DOMAIN" ]] && echo "  Domain: $DOMAIN"
  [[ -n "$PROJECT" ]] && echo "  Project: $PROJECT"
  [[ -n "$RELEVANT_PROJECTS" ]] && echo "  Cross-projects: $RELEVANT_PROJECTS"
fi
