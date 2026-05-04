---
description: Load when writing or reviewing any code in this project. Provides access to AGENTS.md rules, verification commands, context building, and learning retrieval.
---

# Project Rules

Single source of truth for all coding rules. When rules conflict, AGENTS.md wins.

## Trigger
Load when writing or reviewing any code in this project.

## Authoritative source
`AGENTS.md` at the repo root. Read it. Do not restate rules here.

## Verification sequence

Read from `.pi/config.sh`:
```bash
source .pi/config.sh
for cmd in "${VERIFY_COMMANDS[@]}"; do eval "$cmd"; done
```

## Context engineering

Agents do not read the full codebase. Use `./scripts/build-context.sh` to pre-filter context per agent.

## Learning retrieval

Before acting, each agent receives relevant learnings from `.learnings/LEARNINGS.md` via the context builder or learning-agent.

## Rule update process

1. Edit `AGENTS.md` — this is the change
2. Do not create new rules in `.pi/skills/` unless they are domain-specific
3. Learning-agent auto-promotes patterns to skill files when they recur 3+ times
4. Do not duplicate rules across files

<!-- Learned rules auto-promoted by learning-agent are appended below -->
