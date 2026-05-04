---
name: library
description: "General library system for distributing all pi_launchpad artifacts (skills, agents, prompts, workflows, MCP configs, extensions, learnings). Manages central repository, sync, push, install, and dependencies."
argument-hint: "[command] [artifact-type:name or options]"
---

# Library - General Distribution System

A universal system for distributing and managing all pi_launchpad artifacts across projects.

## What Gets Distributed

```
~/.pi/library-central/
├── catalog.yaml              # Master catalog (all artifact types)
├── skills/                   # All skills
├── agents/                   # All agent definitions
├── prompts/                  # Reusable prompt templates
├── workflows/                # Multi-step procedures
├── mcp-configs/              # MCP server configurations
├── extensions/               # Provider extensions
└── learnings/                # Accumulated patterns
```

## How It Works

```
Develop artifact in Project A
        ↓
/library push skill:commit
        ↓
Central repository (~/.pi/library-central/)
        ↓
/library sync (in Project B)
        ↓
Project B gets artifact instantly
```

## Commands

### Setup (Once)

| Command | Purpose |
|---------|---------|
| `/library init [path]` | Initialize central library repository |

### Distribution

| Command | Purpose |
|---------|---------|
| `/library sync` | Pull all artifacts from central to project |
| `/library sync --only skills` | Sync specific artifact types |
| `/library install skill:commit` | Install specific artifact |
| `/library push skill:commit` | Share artifact to central |
| `/library push --all` | Push all local artifacts to central |

### Management

| Command | Purpose |
|---------|---------|
| `/library status` | Show catalog and sync status |
| `/library search <query>` | Search for artifacts |
| `/library deps skill:commit` | Show artifact dependencies |
| `/library outdated` | Show artifacts with updates available |

### Customization

| Command | Purpose |
|---------|---------|
| `/library customize agent:implementer` | Fork artifact for local changes |
| `/library revert agent:implementer` | Revert to central version |
| `/library diff agent:implementer` | Compare local vs central |

## Artifact Types

### 1. Skills (skill:name)

Reusable capabilities like `/commit`, `/review-pr`.

```yaml
skills:
  - name: commit
    source: skills/commit/SKILL.md
    version: 1.2.0
    description: "Git commit workflow"
    dependencies: []
```

**Commands:**
```bash
/library install skill:commit
/library push skill:my-skill
```

---

### 2. Agents (agent:name)

Complete agent definitions like `implementer.md`, `reviewer.md`.

```yaml
agents:
  - name: implementer
    source: agents/implementer.md
    version: 2.1.0
    model: anthropic/claude-opus-4-6
    dependencies: [skill:commit, prompt:base-agent]
```

**Commands:**
```bash
/library install agent:implementer
/library push agent:implementer
```

---

### 3. Prompts (prompt:name)

Reusable prompt templates for composable agents.

```yaml
prompts:
  - name: base-agent
    source: prompts/base-agent.md
    version: 1.0.0
    description: "Core instructions for all agents"
    includes: []

  - name: convex-specialist
    source: prompts/convex-specialist.md
    includes: [prompt:base-agent]
```

**Commands:**
```bash
/library install prompt:base-agent
/library push prompt:convex-specialist
```

---

### 4. Workflows (workflow:name)

Multi-step procedures like feature development flows.

```yaml
workflows:
  - name: feature-workflow
    source: workflows/feature-workflow.md
    version: 1.0.0
    steps: [design, implement, test, review, deploy]
```

**Commands:**
```bash
/library install workflow:feature-workflow
/library push workflow:bugfix-flow
```

---

### 5. MCP Configs (mcp:name)

Model Context Protocol server configurations.

```yaml
mcp_configs:
  - name: brave-search
    source: mcp-configs/brave-search.json
    version: 1.0.0
    requires_api_key: true
```

**Commands:**
```bash
/library install mcp:brave-search
/library push mcp:deepseek
```

---

### 6. Extensions (ext:name)

Provider extensions (Straico, DeepSeek, etc.).

```yaml
extensions:
  - name: deepseek
    source: extensions/deepseek/
    version: 1.0.0
    type: provider
    files: [index.ts, package.json]
```

**Commands:**
```bash
/library install ext:deepseek
/library push ext:straico
```

---

### 7. Learnings (pattern:name)

Accumulated patterns (migrated from `/learnings`).

```yaml
learnings:
  - pattern_key: missing-returns
    source: learnings/patterns/missing-returns.md
    status: promoted
    impact: high
```

**Commands:**
```bash
/library install pattern:missing-returns
/library push pattern:forgot-team-scope

# Legacy /learnings commands still work
/learnings sync  # Same as /library sync --only learnings
```

---

## Execution

All `/library` commands are executed via the library-manager script:

```bash
./scripts/library-manager.sh <command> [args]
```

**When a user invokes `/library <command>`, execute the corresponding bash command:**

| User Command | Bash Execution |
|--------------|----------------|
| `/library init` | `./scripts/library-manager.sh init` |
| `/library sync` | `./scripts/library-manager.sh sync` |
| `/library sync skills` | `./scripts/library-manager.sh sync skills` |
| `/library push skill:name` | `./scripts/library-manager.sh push skill:name` |
| `/library status` | `./scripts/library-manager.sh status` |
| `/library search query` | `./scripts/library-manager.sh search query` |
| `/library bootstrap` | `./scripts/library-manager.sh bootstrap` |

**Before executing:**
1. Read the matching cookbook file for the command
2. Understand the expected inputs/outputs
3. Execute the bash command
4. Report results to user

## Cookbook

Each command has detailed step-by-step instructions.

### Setup Cookbooks

| Command | Cookbook | Use When |
|---------|----------|----------|
| init | [cookbook/init.md](cookbook/init.md) | First time setup |

### Distribution Cookbooks

| Command | Cookbook | Use When |
|---------|----------|----------|
| sync | [cookbook/sync.md](cookbook/sync.md) | Pull artifacts from central |
| install | [cookbook/install.md](cookbook/install.md) | Install specific artifact |
| push | [cookbook/push.md](cookbook/push.md) | Share artifact to central |

### Management Cookbooks

| Command | Cookbook | Use When |
|---------|----------|----------|
| status | [cookbook/status.md](cookbook/status.md) | Check sync status |
| search | [cookbook/search.md](cookbook/search.md) | Find artifacts |
| deps | [cookbook/deps.md](cookbook/deps.md) | Show dependencies |

### Customization Cookbooks

| Command | Cookbook | Use When |
|---------|----------|----------|
| customize | [cookbook/customize.md](cookbook/customize.md) | Fork for local changes |
| diff | [cookbook/diff.md](cookbook/diff.md) | Compare versions |

## Dependency Resolution

Artifacts can depend on other artifacts:

```yaml
# Agent depends on skill and prompt
agent:implementer:
  dependencies:
    - skill:commit
    - prompt:base-agent

# Prompt includes other prompts
prompt:convex-specialist:
  includes:
    - prompt:base-agent
    - prompt:typescript-strict
```

**Auto-resolution:**
```bash
/library install agent:implementer

# Automatically installs:
# 1. skill:commit (dependency)
# 2. prompt:base-agent (dependency)
# 3. agent:implementer (requested)
```

---

## Version Management

Each artifact has semantic versioning:

```yaml
agents:
  - name: implementer
    version: 2.1.0
    changelog:
      - v2.1.0: "Added Convex patterns"
      - v2.0.0: "Major rewrite for modularity"
      - v1.5.0: "Improved error handling"
```

**Pin versions:**
```yaml
# Project-local config
dependencies:
  agent:implementer: "2.1.0"  # Pin to specific version
  skill:commit: "latest"       # Always use latest
```

---

## Sync Strategy

### Merge Priority (High to Low)

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

Result: Uses local customization, skips central
```

---

## Configuration

### Global Config (~/.pi/config.sh)

```bash
# Library configuration
export PI_LIBRARY_CENTRAL="${HOME}/.pi/library-central"

# Sync behavior
export PI_LIBRARY_AUTO_SYNC="true"        # Auto-sync on session start
export PI_LIBRARY_AUTO_INSTALL_DEPS="true" # Auto-install dependencies
export PI_LIBRARY_AUTO_PUSH="prompt"      # prompt | auto | manual

# Git settings
export PI_LIBRARY_AUTO_COMMIT="true"
export PI_LIBRARY_AUTO_PUSH_GIT="false"
```

### Project Config (<project>/.pi/config.sh)

```bash
# Project-specific library config
export PI_LIBRARY_SYNC_TYPES="skills,agents,prompts,learnings"

# Pin versions
export PI_LIBRARY_PIN_VERSIONS="agent:implementer@2.1.0,skill:commit@1.0.0"

# Exclude from sync
export PI_LIBRARY_EXCLUDE="ext:straico,mcp:openai"
```

---

## Migration from /learnings

The `/learnings` skill is now a subset of `/library`:

```bash
# Old commands (still work)
/learnings sync
/learnings push pattern-key

# New equivalent
/library sync --only learnings
/library push pattern:pattern-key

# Unified approach
/library sync  # Syncs everything including learnings
```

**Migration:**
```bash
# Move learnings to library
/library migrate-learnings

# Migrates:
# - .pi/learnings/catalog.yaml → .pi/library/catalog.yaml (learnings section)
# - .pi/learnings/patterns/*.md → .pi/library/learnings/*.md
# - Updates references
```

---

## Workflow Examples

### Solo Developer Workflow

```bash
# Setup (once)
/library init

# In Project A: Develop and share
cd ~/projects/ivi
# Develop amazing commit skill
/library push skill:commit
/library push agent:implementer
/library push pattern:missing-returns

# In Project B: Pull everything
cd ~/projects/new-saas
/library sync

✅ Synced from central:
   - skill:commit
   - agent:implementer
   - prompt:base-agent (dependency)
   - pattern:missing-returns

# New project has all accumulated knowledge!
```

---

### Customization Workflow

```bash
# Sync from central
/library sync

# Customize for project
/library customize agent:implementer
# Edit: Change model, add project-specific rules

# Apply customized version
# Local version overrides central

# Sync again (local customization preserved)
/library sync
# ✓ Skipped: agent:implementer (local customization)
```

---

## Architecture

### Directory Structure

```
~/.pi/
├── library-central/              # Central repository
│   ├── .git/
│   ├── catalog.yaml
│   ├── skills/
│   ├── agents/
│   ├── prompts/
│   ├── workflows/
│   ├── mcp-configs/
│   ├── extensions/
│   └── learnings/
│
└── config.sh                     # Global configuration

<project>/.pi/
├── skills/                       # Synced from central
├── agents/                       # Synced + local customizations
├── prompts/                      # Synced from central
├── mcp.json                      # Synced MCP configs
├── extensions/                   # Synced extensions
├── learnings/                    # Synced patterns
└── config.sh                     # Project configuration
```

---

## Integration Points

### With Orchestrator

```bash
# Orchestrator loads library on session start
orchestrator:
  1. /library sync (get latest artifacts)
  2. Load agents from library
  3. Load prompts from library
  4. Compile prompts with includes
  5. Spawn agents with compiled prompts
```

### With Prompt Engineering

```bash
# Prompts reference library artifacts
{{include: library://prompts/base-agent.md}}
{{if library.has('skill:commit')}}
  Use /commit skill
{{/if}}
```

### With Learning System

```bash
# Learnings are part of library
/library sync
# → Syncs learnings along with everything else

# Push learnings
/library push pattern:missing-returns
# → Same as /learnings push missing-returns
```

---

## Design Principles

- **Universal Distribution**: All artifacts, not just learnings
- **Dependency Aware**: Auto-resolve and install dependencies
- **Version Controlled**: Semantic versioning for all artifacts
- **Git-Backed**: Full version history and cloud sync
- **Solo-Optimized**: Simple workflow for one developer
- **Composable**: Artifacts reference other artifacts
- **Customizable**: Project-specific overrides preserved

---

## Statistics

Track library usage and effectiveness:

```bash
/library stats

Library Statistics
━━━━━━━━━━━━━━━━━

Central Repository:
  Skills: 12
  Agents: 8
  Prompts: 15
  Workflows: 5
  MCP Configs: 4
  Extensions: 3
  Learnings: 23

  Total artifacts: 70

This Project (synced):
  Skills: 8/12 (67%)
  Agents: 6/8 (75%)
  Prompts: 12/15 (80%)
  Learnings: 18/23 (78%)

  Last sync: 2026-03-18 10:34

Most used artifacts:
  1. skill:commit (234 uses)
  2. agent:implementer (189 uses)
  3. prompt:base-agent (189 uses)
```

---

## Advanced Features

### Artifact Templates

```bash
# Create new artifact from template
/library new skill:my-skill --template=skill-basic

# Creates:
# - .pi/skills/my-skill/SKILL.md
# - Pre-filled with template structure
```

### Bulk Operations

```bash
# Push all new artifacts
/library push --all --only-new

# Sync specific artifacts
/library sync --only skill:commit,agent:implementer

# Update all outdated
/library update --all
```

### Export/Import

```bash
# Export library for backup
/library export ~/backups/library-2026-03-18.tar.gz

# Import library on new machine
/library import ~/backups/library-2026-03-18.tar.gz
```

---

## See Also

- Example artifacts: `.pi/library/examples/`
- Learnings subsystem: `/learnings` (legacy interface)
- Prompt engineering: `/prompts` (Week 2 feature)
- Orchestrator integration: `/orchestrator` (Week 3-4 feature)
