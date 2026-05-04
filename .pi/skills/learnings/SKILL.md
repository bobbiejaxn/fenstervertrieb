---
name: learnings
description: "Continuous learning system for pi_launchpad. Logs patterns from sessions, auto-promotes at threshold, applies learnings to agent definitions. Use when you want to log a pattern, apply a learning, check status, or sync learnings. Triggers on /learnings commands."
argument-hint: "[command] [pattern-key or details]"
---

# Learnings - Continuous Improvement System

A meta-skill that closes the learning loop: session outcomes → pattern detection → agent updates → improved agents.

## How It Works

```
Session → Gates Fail → Log Pattern
                          ↓
        Occurs 3x → Auto-Promote
                          ↓
        Apply → Modify Agent Definitions
                          ↓
        Next Session → Improved Agents → Fewer Failures
```

## Variables

> These are auto-detected from the repository structure.

- **LEARNINGS_DIR**: `.pi/learnings/`
- **CATALOG_PATH**: `.pi/learnings/catalog.yaml`
- **PATTERNS_DIR**: `.pi/learnings/patterns/`
- **AGENTS_DIR**: `.pi/agents/`

## Commands

### Pattern Management

| Command | Purpose |
|---------|---------|
| `/learnings log <details>` | Log a new pattern from session |
| `/learnings apply <pattern-key>` | Apply pattern to agent definitions |
| `/learnings promote <pattern-key>` | Manually promote a pattern |
| `/learnings status` | Show catalog status and pending patterns |
| `/learnings analyze <pattern-key>` | Check if pattern improved outcomes |
| `/learnings retire <pattern-key>` | Remove ineffective pattern |

### Distribution & Sync (Phase 3)

| Command | Purpose |
|---------|---------|
| `/learnings init-central [path]` | Initialize central learnings repository |
| `/learnings sync` | Pull patterns from central to project |
| `/learnings push <pattern-key>` | Share pattern to central repository |
| `/learnings customize <pattern-key>` | Fork central pattern for local customization |

## Cookbook

Each command has detailed step-by-step instructions. **Read the relevant cookbook file before executing.**

### Pattern Lifecycle Cookbooks

| Command | Cookbook | Use When |
|---------|----------|----------|
| log | [cookbook/log.md](cookbook/log.md) | Session ended, need to capture learning |
| apply | [cookbook/apply.md](cookbook/apply.md) | Pattern ready to inject into agents |
| promote | [cookbook/promote.md](cookbook/promote.md) | Pattern hit threshold or manual override |
| status | [cookbook/status.md](cookbook/status.md) | Check what patterns exist and their state |
| analyze | [cookbook/analyze.md](cookbook/analyze.md) | Validate pattern effectiveness |
| retire | [cookbook/retire.md](cookbook/retire.md) | Remove pattern that doesn't help |

### Distribution Cookbooks (Phase 3)

| Command | Cookbook | Use When |
|---------|----------|----------|
| init-central | [cookbook/init-central.md](cookbook/init-central.md) | First time setup of central repository |
| sync | [cookbook/sync.md](cookbook/sync.md) | Pull patterns from central to project |
| push | [cookbook/push.md](cookbook/push.md) | Share validated pattern to central |
| customize | [cookbook/customize.md](cookbook/customize.md) | Need project-specific pattern variation |

**When a user invokes `/learnings <command>`, read the matching cookbook file first, then execute the steps.**

## Pattern Format

Each pattern is stored as a markdown file in `.pi/learnings/patterns/`:

```markdown
---
pattern_key: "descriptive-key-name"
occurrences: 3
status: promoted
impact: high
applies_to: [agent:implementer, agent:reviewer]
created: 2026-03-17
last_seen: 2026-03-17
---

# Pattern: Descriptive Title

**Symptom:** What goes wrong
**Root Cause:** Why it happens
**Impact:** High/Medium/Low - consequences

## Evidence
- Session 1: [what happened]
- Session 2: [what happened]
- Session 3: [what happened]

## Agent Instruction Injection

### For: agent:implementer
**Location:** "## Rules — non-negotiable"
**Insert After:** Last rule
**Content:**
```markdown
- **New Rule**: Description of what to do
```

### For: agent:reviewer
**Location:** "## Review checklist — check every item"
**Insert After:** Last checklist item
**Content:**
```markdown
- [ ] Check description
```

## Verification
How to verify this pattern is being followed in future sessions.
```

## Catalog Format

The `catalog.yaml` structure:

```yaml
promotion_threshold: 3

patterns:
  - pattern_key: "missing-returns-validator"
    occurrences: 3
    status: promoted
    impact: high
    applies_to: [agent:implementer, agent:reviewer]
    source: .pi/learnings/patterns/missing-returns-validator.md
    created: 2026-03-17
    last_seen: 2026-03-17
    applied: true
    applied_date: 2026-03-17

applied:
  - pattern_key: "missing-returns-validator"
    applied_date: 2026-03-17
    agents_modified: [implementer.md, reviewer.md]

retired:
  - pattern_key: "old-pattern"
    reason: "No longer relevant after architecture change"
    retired_date: 2026-03-15
```

## Pattern Lifecycle

```
1. Log      → status: pending, occurrences: 1
2. Recurs   → occurrences: 2
3. Promotes → status: promoted (at threshold)
4. Applies  → status: applied, modifies agents
5. Analyze  → measure effectiveness
6. Retire   → if ineffective, status: retired
```

## Auto-Promotion

When a pattern's `occurrences` reaches `promotion_threshold`:
1. Status changes from `pending` → `promoted`
2. Pattern is ready for application
3. Notify user: "Pattern X promoted, ready to apply"

## Integration Points

### Session Start
```bash
# Orchestrator calls before work begins
/learnings status --inject

# Returns:
# - Promoted patterns ready to apply
# - Active warnings for this session
# - Injection text for each agent
```

### Session End
```bash
# Orchestrator calls after PR merged
/learnings log from session

# Captures:
# - What gates failed
# - What patterns were seen
# - New patterns detected
```

## Example Workflows

### Local Pattern Lifecycle

```bash
# Session 1: Gate fails
/learnings log "missing-returns-validator" \
  --symptom "tsc error: function has no return type" \
  --fix "Added returns: v.null()" \
  --applies-to implementer,reviewer

# Session 2: Same issue
/learnings log "missing-returns-validator"
# → occurrences: 2, status: pending

# Session 3: Third time
/learnings log "missing-returns-validator"
# → Auto-promotes! occurrences: 3, status: promoted

# Apply to agents
/learnings apply missing-returns-validator
# → Modifies .pi/agents/implementer.md and reviewer.md
# → Commits changes
# → Status: applied

# Future sessions: agents follow new rule, no more failures
```

### Cross-Project Distribution (Phase 3)

```bash
# Setup: Initialize central repository (once)
/learnings init-central

# In project A: Discover and validate pattern
cd ~/projects/ivi
/learnings log "missing-returns-validator"  # 3x, auto-promotes
/learnings apply missing-returns-validator   # Apply and verify
/learnings analyze missing-returns-validator # Confirm it works
# → EFFECTIVE: 0 occurrences after 7 days

# Share to central repository
/learnings push missing-returns-validator
# → Now in ~/.pi/learnings-central/

# In project B: Pull accumulated wisdom
cd ~/projects/new-saas-app
/learnings sync
# → Pulls missing-returns-validator from central
/learnings apply missing-returns-validator
# → New project starts with best practices built-in!

# Customize for project-specific needs
cd ~/projects/special-client
/learnings sync
/learnings customize missing-returns-validator
# → Edit for project-specific requirements
# → Local version overrides central
```

## Pattern Types

### Code Quality Patterns
- Missing validators
- Type safety violations
- Linting issues
- Test coverage gaps

### Architecture Patterns
- Auth patterns not followed
- Data scoping mistakes
- Schema organization issues
- Performance anti-patterns

### Process Patterns
- Gate failure sequences
- Common debugging paths
- Verification gaps
- Documentation misses

## Central Repository Architecture (Phase 3)

For solo developers managing multiple projects:

```
~/.pi/
└── learnings-central/          # Personal central repository
    ├── .git/                   # Version controlled
    ├── catalog.yaml            # Master pattern catalog
    ├── patterns/               # All validated patterns
    │   ├── missing-returns.md
    │   ├── forgot-team-scope.md
    │   └── no-inline-styles.md
    └── README.md

<project>/.pi/
└── learnings/                  # Project-specific
    ├── catalog.yaml            # References central + local patterns
    └── patterns/               # Local overrides/customizations
```

**Workflow:**
1. Pattern discovered in any project → log locally
2. Pattern validated (promoted, applied, analyzed) → push to central
3. New project → sync from central → instant best practices
4. Project-specific needs → customize pattern locally

**Benefits:**
- **No scattered knowledge**: All learnings in one place
- **New projects start strong**: Pull accumulated wisdom instantly
- **Machine-wide sync**: Same patterns across all devices (via git remote)
- **Selective customization**: Override central patterns when needed

## Design Principles

- **Agent-First**: Pure markdown + YAML, no scripts
- **Catalog-Based**: Patterns are references, not copied
- **Auto-Promotion**: Threshold-based promotion (default: 3x)
- **Measurable**: Track effectiveness with analyze
- **Reversible**: Can retire ineffective patterns
- **Version Controlled**: All changes committed to git
- **Cross-Project**: Can fork & sync like the-library
- **Solo-Optimized**: Simple sync model for one developer

## Example Pattern

See `.pi/learnings/patterns/example-pattern.md` for a complete example.
