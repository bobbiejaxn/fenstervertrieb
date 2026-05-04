# Obsidian Direct Write — Integration Guide

Direct-write content to PKM vault from any agent in your stack.

## Quick Reference

```bash
# Basic (auto-detects everything)
obsidian-write.sh \
  --title "AI Agent Research" \
  --content "Research findings..."

# Specify project
obsidian-write.sh \
  --title "Feature Spec" \
  --content "$SPEC" \
  --project resiliently-ai \
  --type spec

# Research to Resources (cross-project)
obsidian-write.sh \
  --title "MiniMax M2.7 Analysis" \
  --content "$RESEARCH" \
  --type research \
  --domain ai-agents \
  --relevant-projects "resiliently-ai,prompt-spaghetti"

# From stdin (pipe)
echo "Learning..." | obsidian-write.sh \
  --title "Pattern: X" \
  --content - \
  --type pattern
```

---

## From Hermes Agent

### Option 1: As a Tool in Hermes

Add to your Hermes `config.yaml`:

```yaml
tools:
  - name: obsidian_write
    description: |
      Write content directly to Obsidian PKM vault with proper PARA placement.
      Use for structured content: research, ADRs, specs, patterns.
      Bypasses inbox - writes directly to correct location.
    command: /Users/michaelguiao/Projects/pi_launchpad/.pi/tools/obsidian-write.sh
    args:
      - --title
      - "{{title}}"
      - --content
      - "{{content}}"
      - --type
      - "{{type|learning}}"
      - --domain
      - "{{domain|general}}"
      - "{{#project}}--project{{/project}}"
      - "{{project}}"
```

### Option 2: From a Hermes Hand

In your custom Hand (e.g., `researcher-hand/`):

```python
import subprocess
import json

def save_to_obsidian(title, content, content_type="research", domain="general", projects=None):
    """Save research output directly to PKM vault."""
    
    cmd = [
        "/Users/michaelguiao/Projects/pi_launchpad/.pi/tools/obsidian-write.sh",
        "--title", title,
        "--content", content,
        "--type", content_type,
        "--domain", domain
    ]
    
    if projects:
        cmd.extend(["--relevant-projects", ",".join(projects)])
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode == 0:
        return f"✅ Saved to vault: {title}"
    else:
        return f"❌ Error: {result.stderr}"

# Usage in Hand
class ResearcherHand:
    def process(self, query):
        # Do research...
        research_output = self.research(query)
        
        # Save directly (no inbox, no token waste)
        save_to_obsidian(
            title=f"Research: {query}",
            content=research_output,
            content_type="research",
            domain="ai-agents",
            projects=["resiliently-ai", "prompt-spaghetti"]
        )
```

---

## From Pi Coding Agent

### After /ship workflow

```bash
# In your pi project, after /ship completes
# Create an ADR automatically:

FEATURE_NAME="Export Analytics"
PROJECT="resiliently-ai"

# Generate ADR content
ADR_CONTENT=$(cat <<EOF
## Context
Added $FEATURE_NAME feature to analytics module.

## Decision
Implemented CSV export with streaming for large datasets.

## Consequences
- Positive: Users can export unlimited rows
- Risk: Memory usage on very large exports

## Implementation
$(cat docs/implementation.md)
EOF
)

# Write directly to vault
/Users/michaelguiao/Projects/pi_launchpad/.pi/tools/obsidian-write.sh \
  --title "ADR: $FEATURE_NAME" \
  --content "$ADR_CONTENT" \
  --type adr \
  --project "$PROJECT" \
  --status active
```

### As a Post-Ship Hook

Add to `.pi/hooks/post-ship`:

```bash
#!/bin/bash
# After successful ship, document in Obsidian

if [[ -f "docs/adr-*.md" ]]; then
  LATEST_ADR=$(ls -t docs/adr-*.md | head -1)
  
  /Users/michaelguiao/Projects/pi_launchpad/.pi/tools/obsidian-write.sh \
    --title "$(head -1 $LATEST_ADR | sed 's/# //')" \
    --content "$(cat $LATEST_ADR)" \
    --type adr \
    --project "$(basename $(pwd))"
fi
```

---

## From Claude Code

### Via MCP Tool

If Claude Code has MCP tool access:

```json
{
  "mcpServers": {
    "obsidian": {
      "command": "/Users/michaelguiao/Projects/pi_launchpad/.pi/tools/obsidian-write.sh",
      "args": ["--title", "{{title}}", "--content", "{{content}}"]
    }
  }
}
```

### Via Shell Command

From within Claude Code session:

```bash
# Document a complex refactoring decision
claude -c "Explain the architecture decision" > /tmp/decision.md

/Users/michaelguiao/Projects/pi_launchpad/.pi/tools/obsidian-write.sh \
  --title "ADR: Microservices Migration" \
  --content "$(cat /tmp/decision.md)" \
  --type adr \
  --project resiliently-ai
```

---

## From OpenClaw / OpenFang

### As a Skill

```yaml
# skills/obsidian-write/skill.yaml
name: obsidian-write
description: Write structured content to PKM vault
type: executable
command: /Users/michaelguiao/Projects/pi_launchpad/.pi/tools/obsidian-write.sh

parameters:
  - name: title
    required: true
  - name: content
    required: true
  - name: type
    default: learning
  - name: domain
    default: general
  - name: project
    required: false
```

### Usage in OpenClaw

```
User: Research competitor pricing and save to vault

OpenClaw: 
  1. Uses browser tool to research
  2. Compiles findings
  3. Calls obsidian-write:
     --title "Competitor Analysis: Q1 2026"
     --content "$RESEARCH"
     --type research
     --domain marketing
     --project asian-shop-v2
```

---

## Routing Logic Summary

| If you specify... | Goes to... | PARA Type |
|-------------------|-----------|-----------|
| `--project X` | `1-Projects/X/` | project |
| `--area X` | `2-Areas/X/` | area |
| Neither | `3-Resources/notes/` | resource |
| `--location X` | `X` (override) | manual |

---

## Cost Comparison

| Method | Tokens Used | Cost | Latency |
|--------|-------------|------|---------|
| **Inbox → Processor** | Content + Classification LLM | ~$0.05-0.15 | 2-5s |
| **Direct Write** | Content only | $0 | Instant |
| **Savings** | ~100% | ~100% | ~90% faster |

**When to use each:**
- **Direct Write**: Structured content, you know the destination
- **Inbox**: Raw thoughts, unsure where it belongs, want AI suggestions

---

## Examples by Content Type

### Research Output → Resources
```bash
obsidian-write.sh \
  --title "Hermes vs OpenClaw Analysis" \
  --content "$DEEP_RESEARCH" \
  --type research \
  --domain ai-agents \
  --relevant-projects "resiliently-ai,prompt-spaghetti"
```

### ADR → Project Docs
```bash
obsidian-write.sh \
  --title "ADR: Database Sharding Strategy" \
  --content "$ADR_CONTENT" \
  --type adr \
  --project resiliently-ai
```

### Pattern → Resources
```bash
obsidian-write.sh \
  --title "Pattern: Agent Task Routing" \
  --content "$PATTERN" \
  --type pattern \
  --domain ai-agents
```

### Process → Area
```bash
obsidian-write.sh \
  --title "Content Production Workflow" \
  --content "$PROCESS" \
  --type process \
  --area content-creation
```

### Learning Note → Resources
```bash
obsidian-write.sh \
  --title "Learning: MCP Protocol" \
  --content "$LEARNING" \
  --type learning \
  --domain ai-agents
```

---

## Testing

```bash
# Dry run (shows what would happen)
obsidian-write.sh \
  --title "Test Note" \
  --content "Test content" \
  --dry-run

# Write to test location
obsidian-write.sh \
  --title "Test" \
  --content "Test" \
  --location "4-Archive/test/"
```
