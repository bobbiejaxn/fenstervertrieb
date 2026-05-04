---
description: Write content and research directly to PKM vault with correct PARA placement, bypassing inbox processing. Use when content is already structured, you know the target project/area, or batch writing multiple files. Triggers on "write to obsidian", "save to vault", "direct write", "obsidian write".
---

# Obsidian Direct Write Skill

Write content/research directly to PKM vault with correct PARA placement, bypassing inbox processing.

## Usage

```bash
# Basic usage - auto-detects location
./.pi/tools/obsidian-write.sh \
  --title "AI Agent Stack Strategy" \
  --content "$(cat research.md)" \
  --type adr \
  --domain ai-agents \
  --projects "resiliently-ai,prompt-spaghetti"

# Force to specific location
./.pi/tools/obsidian-write.sh \
  --title "Content" \
  --content "$CONTENT" \
  --location 1-Projects/resiliently-ai/content/ \
  --type research

# From pipe
cat article.md | ./.pi/tools/obsidian-write.sh \
  --title "Research Summary" \
  --type learning \
  --domain cyber-risk
```

## When to Use vs Inbox

**Use Direct Write when:**
- Content is already structured (research, ADRs, documentation)
- You know the target project/area
- Saving tokens (bypasses inbox processing LLM)
- Batch operations (writing multiple files)

**Use Inbox when:**
- Raw, unstructured thoughts
- Unsure where content belongs
- Quick capture without thinking
- Want AI to suggest connections

## Decision Matrix

| Content Type | Location | Type | Domain Examples |
|-------------|----------|------|-----------------|
| Project specs, features | `1-Projects/{name}/` | `adr`, `spec`, `task` | resiliently-ai, prompt-spaghetti |
| Ongoing responsibilities | `2-Areas/{area}/` | `process`, `guide` | content-creation, cyber-risk |
| Research, patterns, knowledge | `3-Resources/notes/` | `research`, `pattern`, `learning` | ai-agents, cyber-risk, marketing |
| Timeless reference | `3-Resources/notes/` | `reference` | tools, libraries |
| Completed work | `4-Archive/` | `archive` | - |

## Properties Schema

All notes get:
```yaml
---
type: [adr|spec|research|learning|pattern|reference|task|insight|guide|process]
para_type: [project|area|resource|archive]
domain: <subject-area>
project: <if project-specific>
area: <if area-specific>
status: [draft|active|archived]
tags: []
created: YYYY-MM-DD
updated: YYYY-MM-DD
relevant_projects: []  # For cross-project notes
source: <URL if external>
---
```

## Cross-Project Handling

When content spans multiple projects:
1. Place in `3-Resources/notes/` (neutral ground)
2. Tag with `relevant_projects: [p1, p2, p3]`
3. Add backlinks in each project's MOC
4. Update Master Index

## MOC Updates

After writing, the skill:
1. Checks if domain MOC exists
2. Creates if needed (using template)
3. Appends link to relevant sections
4. Updates "Recently Added" dataview

## Integration with Your Stack

**From Hermes Agent:**
```python
# In a Hand or skill
result = subprocess.run([
    "/path/to/pi_launchpad/.pi/tools/obsidian-write.sh",
    "--title", "Research: " + query,
    "--content", research_output,
    "--type", "research",
    "--domain", "ai-agents",
    "--projects", "resiliently-ai"
], capture_output=True)
```

**From Pi Coding Agent:**
```bash
# After /ship generates ADR
.pi/tools/obsidian-write.sh \
  --title "$FEATURE_NAME ADR" \
  --content "$(cat docs/adr-$FEATURE.md)" \
  --type adr \
  --project resiliently-ai
```

**From Claude Code:**
```bash
# Via MCP tool
~/.pi/tools/obsidian-write.sh --title "..." --content "..."
```
