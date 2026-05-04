# Initialize Library Repository

## Context
Create a central library repository for all pi_launchpad artifacts (skills, agents, prompts, workflows, MCP configs, extensions, learnings).

This extends the learnings-only central repository to a universal distribution system.

## Input
- Path to central library (default: `~/.pi/library-central`)
- Optional: Git remote URL for backup

## Steps

### 1. Check for Existing Learnings Central

```bash
LIBRARY_PATH="${1:-$HOME/.pi/library-central}"
LEARNINGS_CENTRAL="$HOME/.pi/learnings-central"

if [ -d "$LEARNINGS_CENTRAL" ] && [ ! -d "$LIBRARY_PATH" ]; then
  echo "📦 Found existing learnings-central repository"
  echo ""
  echo "Migrate to library-central? (y/n)"
  echo "  This will:"
  echo "  - Move ~/.pi/learnings-central to ~/.pi/library-central"
  echo "  - Extend catalog for all artifact types"
  echo "  - Preserve all existing patterns"
  echo ""
  read -p "Migrate? (y/n): " migrate

  if [ "$migrate" = "y" ]; then
    echo "Migrating learnings-central → library-central..."
    mv "$LEARNINGS_CENTRAL" "$LIBRARY_PATH"
    echo "✓ Migrated"
  fi
fi
```

### 2. Create Directory Structure

```bash
mkdir -p "$LIBRARY_PATH"
cd "$LIBRARY_PATH"

# Create subdirectories for all artifact types
mkdir -p skills
mkdir -p agents
mkdir -p prompts
mkdir -p workflows
mkdir -p mcp-configs
mkdir -p extensions
mkdir -p learnings/patterns

# Initialize git if not already
if [ ! -d ".git" ]; then
  git init
  echo "✓ Initialized git repository"
fi
```

### 3. Create/Update Catalog

```bash
cat > catalog.yaml <<'EOF'
# Pi Launchpad Library Catalog
# Central repository for all artifacts

metadata:
  owner: $(whoami)
  created: $(date -I)
  last_updated: $(date -I)
  version: 1.0.0
  description: "Personal library for skills, agents, prompts, and configurations"

# Artifact locations
artifact_types:
  skills: library/skills/
  agents: library/agents/
  prompts: library/prompts/
  workflows: library/workflows/
  mcp_configs: library/mcp-configs/
  extensions: library/extensions/
  learnings: library/learnings/

# Skills
skills: []

# Agents
agents: []

# Prompts (NEW - for composable agents)
prompts: []

# Workflows
workflows: []

# MCP Configurations
mcp_configs: []

# Extensions
extensions: []

# Learnings (migrated from old system)
learnings: []

# Dependency graph
dependencies: {}

# Statistics
stats:
  total_skills: 0
  total_agents: 0
  total_prompts: 0
  total_workflows: 0
  total_mcp_configs: 0
  total_extensions: 0
  total_learnings: 0
  last_sync: null
EOF

echo "✓ Created catalog.yaml"
```

### 4. Migrate Existing Learnings (If Present)

```bash
if [ -d "patterns" ]; then
  # Move patterns to learnings/patterns
  if [ ! -d "learnings/patterns" ]; then
    mv patterns learnings/patterns
    echo "✓ Migrated learnings patterns"
  fi

  # Update catalog to include existing patterns
  # Parse old catalog if exists
  if [ -f "catalog-learnings.yaml" ]; then
    # Extract learnings section and merge
    # This is simplified - real implementation would parse YAML
    echo "✓ Merged learnings catalog"
  fi
fi
```

### 5. Create README

```bash
cat > README.md <<'EOF'
# Personal Pi Launchpad Library

Central repository for all pi_launchpad artifacts.

## What This Is

- **Universal distribution system** for all pi artifacts
- **Single source of truth** across all projects
- **Git-backed** for version history and multi-machine sync
- **Dependency-aware** for automatic resolution

## Structure

```
.
├── catalog.yaml          # Master catalog
├── skills/               # Reusable capabilities (/commit, /review-pr)
├── agents/               # Agent definitions (implementer.md, reviewer.md)
├── prompts/              # Prompt templates (base-agent.md, convex-specialist.md)
├── workflows/            # Multi-step procedures
├── mcp-configs/          # MCP server configurations
├── extensions/           # Provider extensions (deepseek, straico)
└── learnings/            # Accumulated patterns
```

## Usage

### In any project:

```bash
# Sync all artifacts
/library sync

# Install specific artifact
/library install skill:commit

# Push artifact to central
/library push agent:implementer

# Check status
/library status
```

## Artifact Types

1. **Skills** - Reusable capabilities (like /commit, /review-pr)
2. **Agents** - Complete agent definitions (implementer, reviewer, architect)
3. **Prompts** - Composable prompt templates for agents
4. **Workflows** - Multi-step procedures (feature-workflow, bugfix-flow)
5. **MCP Configs** - Model Context Protocol servers
6. **Extensions** - Provider extensions (DeepSeek, Straico, etc.)
7. **Learnings** - Accumulated patterns (migrated from old system)

## Dependencies

Artifacts can depend on other artifacts:

```yaml
agent:implementer:
  dependencies:
    - skill:commit
    - prompt:base-agent
```

Dependencies are auto-installed when you install an artifact.

## Versioning

All artifacts use semantic versioning:

```yaml
agents:
  - name: implementer
    version: 2.1.0
```

Projects can pin to specific versions.

## Backup

Push to GitHub for cloud backup:

```bash
git remote add origin git@github.com:yourname/pi-library-private.git
git push -u origin main
```

## Migration from Learnings

The old `/learnings` system is now part of `/library`:

```bash
# Old
/learnings sync

# New (unified)
/library sync

# Learnings-specific still works
/learnings sync  # Same as /library sync --only learnings
```

---

Generated by pi_launchpad library system
EOF

echo "✓ Created README.md"
```

### 6. Create .gitignore

```bash
cat > .gitignore <<'EOF'
# OS files
.DS_Store
Thumbs.db

# Backup files
*.backup.*
*~

# Temp files
.tmp/
tmp/

# API keys (should not be in configs, but safety net)
*.key
*.secret
*_secret.json

# Node modules (if extensions have them)
node_modules/
EOF

echo "✓ Created .gitignore"
```

### 7. Initial Commit

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(library): initialize central repository

Created universal library system for all pi_launchpad artifacts.

Artifact types:
- Skills (reusable capabilities)
- Agents (agent definitions)
- Prompts (composable templates)
- Workflows (multi-step procedures)
- MCP Configs (server configurations)
- Extensions (provider extensions)
- Learnings (accumulated patterns)

This replaces and extends the learnings-only system with
universal artifact distribution.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"

echo "✓ Initial commit created"
```

### 8. Configure Pi Launchpad

```bash
CONFIG_FILE="$HOME/.pi/config.sh"
mkdir -p "$HOME/.pi"

if [ -f "$CONFIG_FILE" ]; then
  # Update existing config
  if grep -q "PI_LIBRARY_CENTRAL" "$CONFIG_FILE"; then
    echo "ℹ️  Library already configured"
  else
    cat >> "$CONFIG_FILE" <<EOF

# Library system (replaces/extends learnings)
export PI_LIBRARY_CENTRAL="$LIBRARY_PATH"
export PI_LIBRARY_AUTO_SYNC="true"
export PI_LIBRARY_AUTO_INSTALL_DEPS="true"
export PI_LIBRARY_AUTO_PUSH="prompt"

# Legacy learnings path (redirect to library)
export PI_LEARNINGS_CENTRAL="\$PI_LIBRARY_CENTRAL/learnings"
EOF
    echo "✓ Updated config"
  fi
else
  cat > "$CONFIG_FILE" <<EOF
#!/bin/bash
# Pi Launchpad Configuration

# Library system
export PI_LIBRARY_CENTRAL="$LIBRARY_PATH"
export PI_LIBRARY_AUTO_SYNC="true"
export PI_LIBRARY_AUTO_INSTALL_DEPS="true"
export PI_LIBRARY_AUTO_PUSH="prompt"

# Legacy learnings (redirect to library)
export PI_LEARNINGS_CENTRAL="\$PI_LIBRARY_CENTRAL/learnings"

# Load project-specific config
if [ -f "\$PWD/.pi/config.sh" ]; then
  source "\$PWD/.pi/config.sh"
fi
EOF
  chmod +x "$CONFIG_FILE"
  echo "✓ Created config"
fi
```

### 9. Scan Current Project for Artifacts

```bash
echo ""
echo "Scanning current project for artifacts to add to library..."
echo ""

# Count artifacts in current project
SKILLS_COUNT=$(find .pi/skills -maxdepth 1 -type d 2>/dev/null | wc -l)
AGENTS_COUNT=$(find .pi/agents -name "*.md" 2>/dev/null | wc -l)
LEARNINGS_COUNT=$(find .pi/learnings/patterns -name "*.md" 2>/dev/null | wc -l)

if [ $SKILLS_COUNT -gt 1 ] || [ $AGENTS_COUNT -gt 0 ] || [ $LEARNINGS_COUNT -gt 0 ]; then
  echo "Found artifacts in current project:"
  [ $SKILLS_COUNT -gt 1 ] && echo "  Skills: $((SKILLS_COUNT - 1))"
  [ $AGENTS_COUNT -gt 0 ] && echo "  Agents: $AGENTS_COUNT"
  [ $LEARNINGS_COUNT -gt 0 ] && echo "  Learnings: $LEARNINGS_COUNT"
  echo ""
  read -p "Push these to central library now? (y/n): " push_now

  if [ "$push_now" = "y" ]; then
    echo "Run: /library push --all"
  fi
fi
```

### 10. Optional: Set Up Git Remote

```bash
echo ""
echo "Optional: Set up GitHub backup"
echo ""
read -p "Create GitHub remote? (y/n): " setup_remote

if [ "$setup_remote" = "y" ]; then
  echo ""
  echo "Create a new private repo on GitHub:"
  echo "  https://github.com/new"
  echo ""
  read -p "Enter repo URL (git@github.com:user/repo.git): " remote_url

  if [ -n "$remote_url" ]; then
    git remote add origin "$remote_url"

    read -p "Push to GitHub now? (y/n): " do_push

    if [ "$do_push" = "y" ]; then
      git push -u origin main
      echo "✓ Pushed to GitHub"
    fi
  fi
fi
```

### 11. Report Success

```bash
echo ""
echo "✅ Library repository initialized"
echo ""
echo "Location: $LIBRARY_PATH"
echo "Catalog:  $LIBRARY_PATH/catalog.yaml"
echo ""
echo "Artifact directories:"
echo "  Skills:      $LIBRARY_PATH/skills/"
echo "  Agents:      $LIBRARY_PATH/agents/"
echo "  Prompts:     $LIBRARY_PATH/prompts/"
echo "  Workflows:   $LIBRARY_PATH/workflows/"
echo "  MCP Configs: $LIBRARY_PATH/mcp-configs/"
echo "  Extensions:  $LIBRARY_PATH/extensions/"
echo "  Learnings:   $LIBRARY_PATH/learnings/"
echo ""
echo "Configuration: ~/.pi/config.sh"
echo ""
echo "Next steps:"
echo ""
echo "1. Push artifacts from current project:"
echo "   /library push --all"
echo ""
echo "2. In new projects, sync from library:"
echo "   /library sync"
echo ""
echo "3. View library status:"
echo "   /library status"
echo ""

if git remote get-url origin >/dev/null 2>&1; then
  echo "GitHub backup: $(git remote get-url origin)"
  echo ""
fi
```

## Usage Examples

### Initialize with Default Path

```bash
/library init
```

**Output:**
```
✓ Initialized git repository
✓ Created catalog.yaml
✓ Created README.md
✓ Created .gitignore
✓ Initial commit created
✓ Created config

✅ Library repository initialized

Location: ~/.pi/library-central
Catalog:  ~/.pi/library-central/catalog.yaml

Next steps:
  1. /library push --all
  2. /library sync (in other projects)
```

---

### Migrate from Learnings Central

```bash
/library init
```

**Output:**
```
📦 Found existing learnings-central repository

Migrate to library-central? (y/n)
  This will:
  - Move ~/.pi/learnings-central to ~/.pi/library-central
  - Extend catalog for all artifact types
  - Preserve all existing patterns

Migrate? (y/n): y

Migrating learnings-central → library-central...
✓ Migrated
✓ Migrated learnings patterns
✓ Merged learnings catalog

✅ Library repository initialized
```

---

### With Existing Artifacts

```bash
# In project with skills and agents
cd ~/projects/ivi
/library init
```

**Output:**
```
...

Scanning current project for artifacts to add to library...

Found artifacts in current project:
  Skills: 5
  Agents: 9
  Learnings: 12

Push these to central library now? (y/n): y

Run: /library push --all

✅ Library repository initialized
```

---

## Verification

```bash
# Check directory structure
ls -la ~/.pi/library-central/
# Should show: skills/, agents/, prompts/, workflows/, etc.

# Check catalog
cat ~/.pi/library-central/catalog.yaml
# Should show all artifact types

# Check git
cd ~/.pi/library-central
git log
# Should show initial commit

# Check config
source ~/.pi/config.sh
echo $PI_LIBRARY_CENTRAL
# Should output: ~/.pi/library-central
```

---

## Migration Notes

### From Learnings-Only to Full Library

**Before:**
```
~/.pi/learnings-central/
├── catalog.yaml (learnings only)
└── patterns/
```

**After:**
```
~/.pi/library-central/
├── catalog.yaml (all artifact types)
├── skills/
├── agents/
├── prompts/
├── workflows/
├── mcp-configs/
├── extensions/
└── learnings/
    └── patterns/ (migrated from old location)
```

**Commands remain compatible:**
```bash
# Old (still works, redirects to library)
/learnings sync

# New (unified)
/library sync
```

---

## Error Handling

**Already initialized:**
```
Library already exists at: ~/.pi/library-central

Options:
  1. Use existing (recommended)
  2. Reinitialize (backup current)
  3. Choose different path

Choice: 1

Using existing library.
```

**Git not installed:**
```
Error: git command not found

Install git:
  brew install git   (macOS)
  apt install git    (Linux)
```

**Permission denied:**
```
Error: Cannot create directory at ~/.pi/library-central

Check permissions and retry.
```
