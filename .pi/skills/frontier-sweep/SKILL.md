---
name: frontier-sweep
description: Scan Ollama Cloud for the latest frontier models, benchmark them against the registry, and update agent assignments to always use the best available model. Run weekly or when you hear about new model releases. Triggers on "update models", "frontier sweep", "check new models", "upgrade agents", "model sweep".
---

# Frontier Sweep — Keep Agents on the Best Models

One skill to: scan → evaluate → assign → commit. Keeps every agent on the frontier.

## When to Run

- Weekly (every Monday)
- After hearing about a new model release
- When you say "update models", "frontier sweep", "check new models"
- After `ollama pull <new-model>`

## Step 1 — Scan Ollama Cloud Library (NOT local models)

**Critical: `ollama list` only shows locally pulled models. The Ollama Cloud catalog is much larger. Always scrape the library.**

```bash
# Fetch the full Ollama Cloud library catalog (229+ models)
LIBRARY_HTML=$(curl -sL https://ollama.com/library)
CLOUD_MODELS=$(echo "$LIBRARY_HTML" | sed -n 's/.*href="\/library\/\([^"]*\)".*/\1/p' | sort -u)

echo "Ollama Cloud has $(echo "$CLOUD_MODELS" | wc -l) models"

# Also check locally pulled models (some may be local-only)
LOCAL_MODELS=$(ollama list 2>/dev/null | tail -n +2 | awk '{print $1}' | sed 's/:.*//' | sort -u)

# Combine: all unique model names from both sources
ALL_MODELS=$(echo -e "$CLOUD_MODELS\n$LOCAL_MODELS" | sort -u)

# Compare against what's in the registry
REGISTRY_MODELS=$(grep 'ollama_id:' .pi/extensions/model-router/registry.yaml | sed 's/.*: "//; s/"//' | sed 's/:cloud//' | sort -u)

# Find NEW models (in Ollama but not in registry)
NEW_MODELS=$(comm -23 <(echo "$ALL_MODELS") <(echo "$REGISTRY_MODELS"))

echo "=== New models not in registry ==="
echo "$NEW_MODELS"

# Filter to frontier-relevant models only (skip embeddings, small models, etc.)
FRONTIER=$(echo "$NEW_MODELS" | grep -iE 'kimi|deepseek|glm|minimax|qwen|llama[3-4]|gemma[3-4]|mistral|codestral|command|phi[3-4]|codellama')
echo ""
echo "=== Frontier models to evaluate ==="
echo "$FRONTIER"
```

### Why scrape ollama.com/library?

- `ollama list` → only models you've already pulled locally
- `ollama.com/library` → the **entire** Ollama Cloud catalog (229+ models as of 2026-04)
- `:cloud` tag → streams from Ollama's servers without pulling the full weights
- Example: `kimi-k2.6:cloud` was available on Ollama Cloud but invisible to `ollama list`

## Step 2 — Pull New Frontier Models

For each new frontier model, pull the `:cloud` tag:

```bash
for model in $FRONTIER; do
  echo "Pulling $model:cloud..."
  ollama pull "$model:cloud" 2>&1
done
```

This downloads a tiny manifest (a few KB) — the actual weights stream on first use via `:cloud`.

## Step 3 — Evaluate New Models

For each new model, gather:

```bash
# Model metadata
ollama show <model>:cloud 2>/dev/null | head -20

# Quick capability test (coding)
time ollama run <model>:cloud 'Write a TypeScript generic function pluck that extracts values by key from an array of objects. Include proper type narrowing for null and undefined. Keep it under 20 lines.' 2>&1

# Quick capability test (reasoning)
time ollama run <model>:cloud 'A system has 3 components, each with 99.9% uptime. What is the overall system uptime if they are in series? Show your work.' 2>&1
```

Then look up benchmark scores from:
- **Artificial Analysis** (artificialanalysis.ai) — Intelligence Index, speed, price
- **LMSYS Chatbot Arena** (arena.ai) — human preference ELO
- **SWE-bench Verified** — real-world software engineering
- **LiveCodeBench** — coding benchmark
- **Terminal-Bench 2.0** — agentic coding
- **CodersEra** — deep dives with exact numbers

For each new model, create a registry entry in `.pi/extensions/model-router/registry.yaml`:

```yaml
  <model-name>:
    ollama_id: "<model-name>:cloud"
    provider: <provider>
    params: "<size/architecture>"
    context: <context-window>
    capabilities:
      coding: <0-100>
      reasoning: <0-100>
      structured: <0-100>
      speed: <0-100>
      agentic: <0-100>
    role_fit: [roles this model would excel at]
    tags: [relevant tags]
    notes: "Source and key benchmark data."
```

### Capability scoring reference (use real benchmarks)

| Score | Meaning |
|-------|---------|
| 90-100 | Frontier leader (top 3 on benchmark) |
| 80-89 | Competitive with frontier |
| 70-79 | Strong mid-tier |
| 60-69 | Adequate for non-critical roles |
| <60 | Not recommended |

**Score mapping from benchmarks:**
- SWE-bench Verified 80%+ → coding: 90+
- LiveCodeBench 89%+ → coding: 90+
- Intelligence Index 52+ → reasoning: 90+
- Output speed >50 tok/s → speed: 80+
- Agentic benchmarks (Terminal-Bench 60%+) → agentic: 85+

## Step 4 — Score All Models Against All Roles

For each agent role in the registry, compute the weighted score for every model:

```bash
# The registry has agent_roles with weighted requirements
# Score = sum(capability * weight) for each dimension

# Use the model-router to compute best model per role
pi tool model-router '{"action":"list-roles"}'
```

The scoring formula (from model-router):
```
score = coding * coding_weight + reasoning * reasoning_weight + structured * structured_weight + speed * speed_weight + agentic * agentic_weight
```

For each role, rank all models by score. The highest score wins.

## Step 5 — Assign with Balance Constraints

**Do NOT just assign the #1 model to everything.** Apply these constraints:

| Constraint | Rule |
|-----------|------|
| **Max per model** | No model gets more than 12 agents (out of 46) |
| **Provider diversity** | At least 3 different providers must be used |
| **Cost awareness** | Budget models (Flash) for high-volume roles (audit, format), premium (Pro, K2.6) for low-volume high-stakes roles (security, architect) |
| **Role-fit override** | If a model scores <70% of the top scorer for a role, skip it even if it has capacity |
| **Stability** | If the current model scores within 5% of the best, keep the current assignment (avoid churn) |

### Assignment algorithm

```
For each role (sorted by importance: ceo > architect > security > reviewer > ...):
  1. Get all models, sorted by score for this role
  2. Filter out models that hit the max-per-model cap
  3. If current model scores within 5% of best → keep current
  4. Otherwise → assign the best available model
  5. Check provider diversity — if one provider has >60% of assignments, prefer next-best from another provider
```

## Step 6 — Update Agent Files

For each agent whose model assignment changed:

```bash
# Read current model
CURRENT=$(grep '^model:' .pi/agents/<agent>.md | head -1 | sed 's/model: //')

# If different from new assignment, update
if [ "$CURRENT" != "$NEW_MODEL" ]; then
  sed -i '' "s/^model: .*/model: $NEW_MODEL/" .pi/agents/<agent>.md
  echo "Updated <agent>: $CURRENT → $NEW_MODEL"
fi
```

Do the same for board agents in `.pi/agents/board/`.

## Step 7 — Update registry role_fit

For each model in the registry, update `role_fit` to list the agents actually using that model:

```bash
for model in $(grep '^model:' .pi/agents/*.md .pi/agents/board/*.md | awk -F: '{print $3}' | sort -u); do
  agents=$(grep -rl "model: $model" .pi/agents/*.md .pi/agents/board/*.md | xargs -I{} basename {} .md | tr '\n' ',' | sed 's/,$//')
  echo "$model → [$agents]"
done
```

Update the `role_fit:` field in the registry.

## Step 8 — Report and Commit

Print the full report:

```
FRONTIER SWEEP — [date]
═══════════════════════

Ollama Cloud catalog: [N] models (scraped from ollama.com/library)
Locally pulled: [M] models
New frontier models found: [K]
  - model-1 (provider, params, :cloud pulled)
  - model-2 (provider, params, :cloud pulled)

Models evaluated: [E]
Assignments changed: [C]
Assignments kept (within 5%): [J]

NEW DISTRIBUTION:
  Model-A (provider): [N] agents (+/-Δ)
  Model-B (provider): [N] agents (+/-Δ)
  Model-C (provider): [N] agents (+/-Δ)
  ...

CHANGES:
  agent-1: old-model → new-model (score +X%)
  agent-2: old-model → new-model (score +X%)
  ...

KEPT (stable within 5%):
  agent-3: kept model-A (score 92 vs best 94)
  agent-4: kept model-A (score 88 vs best 90)
```

Then commit:

```bash
git add -A
git commit -m "feat: frontier sweep — update [C] agent model assignments

New models: [list from ollama.com/library]
Changes: [list]
Distribution: [model:count pairs]
Score improvements: [avg improvement %]"
git push
```

## Step 9 — Sync Target Projects

```bash
./scripts/update.sh --local . --target /path/to/project
```

## Rules

1. **Always scrape ollama.com/library** — `ollama list` is NOT the full catalog, only locally pulled models
2. **Always pull `:cloud` tags** — tiny manifest download, streams weights on demand
3. **Balance > raw scores** — a diverse model fleet is more resilient than one perfect model
4. **5% stability threshold** — don't churn assignments for marginal gains
5. **Commit with evidence** — include score deltas in the commit message
6. **Test before full rollout** — if a new model is untested, assign it to 1-2 low-stakes agents first, verify quality over a week, then expand
7. **Never remove a model from registry** — just mark it `[deprecated]` if superseded
8. **Record the sweep** — append results to `.pi/frontier-sweep-history.md` for trend tracking
9. **Filter noise early** — skip embeddings, mini models, and specialty models — only evaluate frontier-class
