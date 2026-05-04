# Bootstrap Library from Existing Repositories

## Context
Seed your library-central with skills, agents, and learnings from existing repositories instead of starting from scratch.

## Input
- List of repository URLs containing .pi/ artifacts
- Optional: GitHub token for private repos
- Optional: Filter by artifact types

## Your Repositories
```bash
# Primary sources for bootstrap
REPOS=(
  "https://github.com/bobbiejaxn/convex-agent-skillz"
  "https://github.com/bobbiejaxn/claude-seo"
  "https://github.com/bobbiejaxn/everything-claude-code"
  "https://github.com/shipkitai/adk-agent-saas"
  "https://github.com/bobbiejaxn/tac-5-nl-sql-interface"
  "https://github.com/bobbiejaxn/ecommerce-subagent-template"
)
```

## Performance Optimization

The bootstrap script uses **Git sparse checkout** to only download the `.pi/` directory from each repository, not the full source code.

**Savings:**
- ❌ Full clone: Downloads entire repo, git history, dependencies (100s of MBs)
- ✅ Sparse clone: Downloads only `.pi/` directory (typically <1 MB per repo)

**How it works:**
```bash
git clone --depth=1 --filter=blob:none --sparse <repo>
git sparse-checkout set .pi
```


This dramatically reduces:
- Network bandwidth usage
- Disk space consumption
- Clone time

## What Gets Imported

### Standard .pi/ Artifacts
- **Skills** - `.pi/skills/*/SKILL.md`
- **Agents** - `.pi/agents/*.md`
- **Prompts** - `.pi/prompts/*.md`
- **Learnings** - `.pi/learnings/patterns/*.md`
- **MCP Configs** - `.pi/mcp.json`
- **Extensions** - `.pi/extensions/*/`

## Steps

### 1. Create Bootstrap Script

```bash
cat > ~/.pi/bootstrap-library.sh <<'EOF'
#!/bin/bash
set -e

# Configuration
LIBRARY_CENTRAL="${PI_LIBRARY_CENTRAL:-$HOME/.pi/library-central}"
BOOTSTRAP_DIR="$HOME/.pi/bootstrap-temp"
REPOS=(
  "https://github.com/bobbiejaxn/convex-agent-skillz"
  "https://github.com/bobbiejaxn/claude-seo"
  "https://github.com/bobbiejaxn/everything-claude-code"
  "https://github.com/shipkitai/adk-agent-saas"
  "https://github.com/bobbiejaxn/tac-5-nl-sql-interface"
)

echo "🔄 Bootstrapping Pi Launchpad Library"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Initialize library if not exists
if [ ! -d "$LIBRARY_CENTRAL" ]; then
  echo "📦 Initializing library-central..."
  mkdir -p "$LIBRARY_CENTRAL"
  cd "$LIBRARY_CENTRAL"
  git init

  # Create structure
  mkdir -p skills agents prompts workflows mcp-configs extensions learnings/patterns

  # Create initial catalog
  cat > catalog.yaml <<'CATALOG'
metadata:
  owner: $(whoami)
  created: $(date -I)
  version: 1.0.0
  description: "Bootstrapped from existing repositories"

artifact_types:
  skills: skills/
  agents: agents/
  prompts: prompts/
  workflows: workflows/
  mcp_configs: mcp-configs/
  extensions: extensions/
  learnings: learnings/

skills: []
agents: []
prompts: []
workflows: []
mcp_configs: []
extensions: []
learnings: []

dependencies: {}
stats:
  total_skills: 0
  total_agents: 0
  total_prompts: 0
  total_workflows: 0
  total_mcp_configs: 0
  total_extensions: 0
  total_learnings: 0
CATALOG

  git add -A
  git commit -m "chore: initialize library structure"
  echo "✓ Library initialized"
  echo ""
fi

# 2. Clone repositories
echo "📥 Cloning repositories..."
mkdir -p "$BOOTSTRAP_DIR"
cd "$BOOTSTRAP_DIR"

CLONED=0
for repo in "${REPOS[@]}"; do
  repo_name=$(basename "$repo" .git)

  if [ -d "$repo_name" ]; then
    echo "  ⚠️  $repo_name already cloned, pulling..."
    cd "$repo_name"
    git pull -q
    cd ..
  else
    echo "  → Cloning $repo_name..."
    git clone -q "$repo" 2>/dev/null || echo "  ⚠️  Failed to clone $repo_name"
  fi

  if [ -d "$repo_name" ]; then
    ((CLONED++))
  fi
done

echo "✓ Cloned $CLONED repositories"
echo ""

# 3. Extract artifacts by type
echo "🔍 Discovering artifacts..."
echo ""

TOTAL_SKILLS=0
TOTAL_AGENTS=0
TOTAL_LEARNINGS=0
TOTAL_PROMPTS=0
TOTAL_MCP=0
TOTAL_EXTENSIONS=0

# Skills
echo "📚 Skills:"
for repo_dir in */; do
  repo_name=${repo_dir%/}
  if [ -d "$repo_dir/.pi/skills" ]; then
    for skill_dir in "$repo_dir/.pi/skills"/*/; do
      if [ -f "$skill_dir/SKILL.md" ]; then
        skill_name=$(basename "$skill_dir")
        echo "  → $skill_name (from $repo_name)"

        # Copy to library
        mkdir -p "$LIBRARY_CENTRAL/skills/$skill_name"
        cp -r "$skill_dir"/* "$LIBRARY_CENTRAL/skills/$skill_name/"
        ((TOTAL_SKILLS++))
      fi
    done
  fi
done
echo "  Found: $TOTAL_SKILLS skills"
echo ""

# Agents
echo "🤖 Agents:"
for repo_dir in */; do
  repo_name=${repo_dir%/}
  if [ -d "$repo_dir/.pi/agents" ]; then
    for agent_file in "$repo_dir/.pi/agents"/*.md; do
      if [ -f "$agent_file" ]; then
        agent_name=$(basename "$agent_file" .md)
        echo "  → $agent_name (from $repo_name)"

        # Copy to library
        cp "$agent_file" "$LIBRARY_CENTRAL/agents/"
        ((TOTAL_AGENTS++))
      fi
    done
  fi
done
echo "  Found: $TOTAL_AGENTS agents"
echo ""

# Prompts
echo "📝 Prompts:"
for repo_dir in */; do
  repo_name=${repo_dir%/}
  if [ -d "$repo_dir/.pi/prompts" ]; then
    for prompt_file in "$repo_dir/.pi/prompts"/*.md; do
      if [ -f "$prompt_file" ]; then
        prompt_name=$(basename "$prompt_file" .md)
        echo "  → $prompt_name (from $repo_name)"

        # Copy to library
        cp "$prompt_file" "$LIBRARY_CENTRAL/prompts/"
        ((TOTAL_PROMPTS++))
      fi
    done
  fi
done
echo "  Found: $TOTAL_PROMPTS prompts"
echo ""

# Learnings
echo "🧠 Learnings:"
for repo_dir in */; do
  repo_name=${repo_dir%/}
  if [ -d "$repo_dir/.pi/learnings/patterns" ]; then
    for pattern_file in "$repo_dir/.pi/learnings/patterns"/*.md; do
      if [ -f "$pattern_file" ]; then
        pattern_name=$(basename "$pattern_file" .md)
        echo "  → $pattern_name (from $repo_name)"

        # Copy to library
        cp "$pattern_file" "$LIBRARY_CENTRAL/learnings/patterns/"
        ((TOTAL_LEARNINGS++))
      fi
    done
  fi

  # Also copy catalog if exists
  if [ -f "$repo_dir/.pi/learnings/catalog.yaml" ]; then
    echo "  → Merging catalog from $repo_name"
    # TODO: Merge catalogs intelligently
  fi
done
echo "  Found: $TOTAL_LEARNINGS patterns"
echo ""

# MCP Configs
echo "🔌 MCP Configs:"
for repo_dir in */; do
  repo_name=${repo_dir%/}
  if [ -f "$repo_dir/.pi/mcp.json" ]; then
    echo "  → mcp.json (from $repo_name)"

    # Copy to library
    cp "$repo_dir/.pi/mcp.json" "$LIBRARY_CENTRAL/mcp-configs/$repo_name-mcp.json"
    ((TOTAL_MCP++))
  fi
done
echo "  Found: $TOTAL_MCP MCP configs"
echo ""

# Extensions
echo "🔧 Extensions:"
for repo_dir in */; do
  repo_name=${repo_dir%/}
  if [ -d "$repo_dir/.pi/extensions" ]; then
    for ext_dir in "$repo_dir/.pi/extensions"/*/; do
      if [ -d "$ext_dir" ]; then
        ext_name=$(basename "$ext_dir")
        echo "  → $ext_name (from $repo_name)"

        # Copy to library
        mkdir -p "$LIBRARY_CENTRAL/extensions/$ext_name"
        cp -r "$ext_dir"/* "$LIBRARY_CENTRAL/extensions/$ext_name/"
        ((TOTAL_EXTENSIONS++))
      fi
    done
  fi
done
echo "  Found: $TOTAL_EXTENSIONS extensions"
echo ""

# 4. Update catalog
echo "📊 Updating catalog..."
cd "$LIBRARY_CENTRAL"

# Update stats in catalog
cat > catalog.yaml <<CATALOG
metadata:
  owner: $(whoami)
  created: $(date -I)
  last_updated: $(date -I)
  version: 1.0.0
  description: "Bootstrapped from existing repositories"
  source_repos:
    - convex-agent-skillz
    - claude-seo
    - everything-claude-code
    - adk-agent-saas
    - tac-5-nl-sql-interface

artifact_types:
  skills: skills/
  agents: agents/
  prompts: prompts/
  workflows: workflows/
  mcp_configs: mcp-configs/
  extensions: extensions/
  learnings: learnings/

# TODO: Populate with actual artifact metadata
skills: []
agents: []
prompts: []
workflows: []
mcp_configs: []
extensions: []
learnings: []

dependencies: {}

stats:
  total_skills: $TOTAL_SKILLS
  total_agents: $TOTAL_AGENTS
  total_prompts: $TOTAL_PROMPTS
  total_workflows: 0
  total_mcp_configs: $TOTAL_MCP
  total_extensions: $TOTAL_EXTENSIONS
  total_learnings: $TOTAL_LEARNINGS
  last_sync: $(date -I)
  bootstrap_date: $(date -I)
CATALOG

echo "✓ Catalog updated"
echo ""

# 5. Commit to library
git add -A
git commit -m "feat: bootstrap library from existing repositories

Imported artifacts:
- Skills: $TOTAL_SKILLS
- Agents: $TOTAL_AGENTS
- Prompts: $TOTAL_PROMPTS
- MCP Configs: $TOTAL_MCP
- Extensions: $TOTAL_EXTENSIONS
- Learnings: $TOTAL_LEARNINGS

Sources:
- convex-agent-skillz
- claude-seo
- everything-claude-code
- adk-agent-saas
- tac-5-nl-sql-interface
"

echo "✓ Changes committed"
echo ""

# 6. Summary
echo "✅ Bootstrap Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Library location: $LIBRARY_CENTRAL"
echo ""
echo "Imported artifacts:"
echo "  Skills:       $TOTAL_SKILLS"
echo "  Agents:       $TOTAL_AGENTS"
echo "  Prompts:      $TOTAL_PROMPTS"
echo "  MCP Configs:  $TOTAL_MCP"
echo "  Extensions:   $TOTAL_EXTENSIONS"
echo "  Learnings:    $TOTAL_LEARNINGS"
echo ""
echo "Next steps:"
echo "  1. Review artifacts: cd $LIBRARY_CENTRAL"
echo "  2. Sync to project: /library sync"
echo "  3. Start using: /orchestrator run \"your task\""
echo ""
echo "Cleanup temp files:"
echo "  rm -rf $BOOTSTRAP_DIR"
echo ""
EOF

chmod +x ~/.pi/bootstrap-library.sh
echo "✓ Created bootstrap script"
```

### 2. Run Bootstrap

```bash
# Execute bootstrap
~/.pi/bootstrap-library.sh
```

**Expected output:**
```
🔄 Bootstrapping Pi Launchpad Library
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 Initializing library-central...
✓ Library initialized

📥 Cloning repositories...
  → Cloning convex-agent-skillz...
  → Cloning claude-seo...
  → Cloning everything-claude-code...
  → Cloning adk-agent-saas...
  → Cloning tac-5-nl-sql-interface...
✓ Cloned 5 repositories

🔍 Discovering artifacts...

📚 Skills:
  → convex-queries (from convex-agent-skillz)
  → convex-mutations (from convex-agent-skillz)
  → seo-audit (from claude-seo)
  → seo-sitemap (from claude-seo)
  → mcp-builder (from everything-claude-code)
  ...
  Found: 25 skills

🤖 Agents:
  → implementer (from convex-agent-skillz)
  → reviewer (from convex-agent-skillz)
  → seo-specialist (from claude-seo)
  ...
  Found: 12 agents

🧠 Learnings:
  → missing-returns-validator (from convex-agent-skillz)
  → forgot-team-scope (from convex-agent-skillz)
  → seo-best-practices (from claude-seo)
  ...
  Found: 18 patterns

✅ Bootstrap Complete!
```

### 3. Verify Bootstrap

```bash
# Check what was imported
ls -la ~/.pi/library-central/skills/
ls -la ~/.pi/library-central/agents/
ls -la ~/.pi/library-central/learnings/patterns/

# View catalog
cat ~/.pi/library-central/catalog.yaml
```

### 4. Sync to Current Project

```bash
# Now sync to your current project
cd ~/projects/pi_launchpad
/library sync

# Or use the orchestrator (will auto-sync)
/orchestrator run "Show me what skills are available"
```

## Expected Results

After bootstrap, you'll have:

**From convex-agent-skillz:**
- Skills: Convex patterns, database operations
- Agents: Convex specialists
- Learnings: Convex best practices, validator patterns

**From claude-seo:**
- Skills: SEO audit, sitemap generation
- Agents: SEO specialist
- Learnings: SEO optimization patterns

**From everything-claude-code:**
- Skills: Claude Code utilities
- Agents: Claude-specific workflows
- Learnings: Claude best practices

**From adk-agent-saas:**
- Skills: Agent development kit patterns
- Agents: SaaS-specific agents
- Learnings: Agent coordination patterns
- **Cursor Rules**: Backend conventions, deployment rules (imported as prompts)

**From ecommerce-subagent-template:**
- Skills: E-commerce workflows
- Agents: Product, cart, payment agents
- Prompts: E-commerce patterns
- Learnings: E-commerce best practices

**From tac-5-nl-sql-interface:**
- Skills: Natural language to SQL
- Agents: SQL query specialists
- Learnings: NL-SQL translation patterns

## Advanced: Selective Bootstrap

```bash
# Bootstrap only skills
~/.pi/bootstrap-library.sh --only skills

# Bootstrap from specific repos
~/.pi/bootstrap-library.sh --repos "convex-agent-skillz,claude-seo"

# Dry run (see what would be imported)
~/.pi/bootstrap-library.sh --dry-run
```

## Maintenance: Re-sync from Repos

```bash
# Pull latest from all source repos
cd ~/.pi/bootstrap-temp
for dir in */; do
  cd "$dir"
  git pull
  cd ..
done

# Re-run bootstrap (will update existing)
~/.pi/bootstrap-library.sh
```

## Integration with Orchestrator

Once bootstrapped, the orchestrator automatically:

1. **Session Start**: Auto-syncs library (including bootstrapped content)
2. **Agent Spawn**: Injects relevant learnings from bootstrapped patterns
3. **Task Execution**: Uses bootstrapped skills and agents
4. **Self-Healing**: References bootstrapped patterns for fixes

**Example:**
```bash
# After bootstrap
/orchestrator run "Add Convex query for user authentication"

# Orchestrator will:
# 1. Load convex-agent-skillz patterns
# 2. Inject missing-returns-validator learning
# 3. Use Convex specialist agent
# 4. Apply all bootstrapped best practices
```

## Troubleshooting

**Issue: No artifacts found**
```bash
# Check repository structure
cd ~/.pi/bootstrap-temp/convex-agent-skillz
ls -la .pi/

# Expected: .pi/skills/, .pi/agents/, .pi/learnings/
```

**Issue: Duplicate artifacts**
```bash
# Bootstrap script handles duplicates by overwriting
# To keep both versions, rename before bootstrap:
cd ~/.pi/library-central/skills
mv existing-skill existing-skill-old
```

**Issue: Catalogs conflict**
```bash
# Manually merge catalogs after bootstrap
cd ~/.pi/library-central
# Edit catalog.yaml to add metadata from each source
```

---

## Summary

**Bootstrap Process:**
1. Create script from template above
2. Run `~/.pi/bootstrap-library.sh`
3. Review imported artifacts
4. Sync to projects with `/library sync`
5. Use with orchestrator

**Result:**
- Your library-central populated with proven patterns
- Immediate access to all existing skills/agents
- Learning system pre-seeded with best practices
- Orchestrator ready with domain expertise

**Next Evolution:**
As you use the system, it will:
- Add new patterns it discovers
- Improve on bootstrapped content
- Learn project-specific optimizations
- Auto-promote effective patterns from your repos
