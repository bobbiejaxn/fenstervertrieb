---
name: mental-model
description: Manage structured YAML expertise files as personal mental models. Use when starting tasks (read for context), completing work (capture learnings), or when your understanding of the system needs updating. Each agent maintains its own expertise file that compounds knowledge session after session.
---

# Mental Model

## Instructions

You have personal expertise files — structured YAML documents that represent your mental model of the system you work on. These are YOUR files. You own them.

### When to Read

- **At the start of every task** — read your expertise file(s) for context before doing anything
- **When you need to recall** prior observations, decisions, or patterns
- **When a teammate references something** you've tracked before

### When to Update

- **After completing meaningful work** — capture what you learned
- **When you discover something new** about the system (architecture, patterns, gotchas)
- **When your understanding changes** — update stale entries, don't just append
- **When you observe patterns** — note what works, what doesn't, what's recurring

### How to Structure

Write structured YAML. Don't be rigid about categories — let the structure emerge from your work. But keep it organized enough that you can scan it quickly.

```yaml
# Good: structured, scannable, evolving
architecture:
  api_layer:
    pattern: "REST with WebSocket for real-time"
    key_files:
      - path: src/api/routes.ts
        note: "All endpoints, ~400 lines"
    decisions:
      - "Chose Express over Fastify for ecosystem maturity"

patterns_discovered:
  - date: "2026-03-24"
    pattern: "All mutations go through Convex actions, not direct DB writes"
    confidence: high

risks:
  - area: "auth"
    note: "Token refresh has a race condition under high concurrency"
    severity: medium

open_questions:
  - "Should we split the auth module? It's growing fast."
```

### What NOT to Store

- Don't copy-paste entire files — reference them by path
- Don't store conversation logs — that's what the session log is for
- Don't store transient data (build output, test results) — just conclusions
- Don't be prescriptive about your own categories — evolve them naturally

### Line Limit

Each expertise file should stay under **500 lines**. After every update:

1. Check the line count
2. If over the limit, trim immediately:
   - Remove least critical entries (old observations, resolved questions)
   - Condense verbose sections
   - Merge redundant entries

### YAML Validation

After every write, validate your YAML is parseable:

```bash
python3 -c "import yaml; yaml.safe_load(open('<file>'))"
```

Fix any syntax errors immediately.

## Expertise File Locations

Each agent's expertise file lives at:
```
.pi/expertise/<agent-name>-mental-model.yaml
```

Examples:
- `.pi/expertise/implementer-mental-model.yaml`
- `.pi/expertise/reviewer-mental-model.yaml`
- `.pi/expertise/architect-mental-model.yaml`
- `.pi/expertise/test-writer-mental-model.yaml`
- `.pi/expertise/product-manager-mental-model.yaml`

These files are created automatically on first use. They persist across sessions and compound knowledge over time.
