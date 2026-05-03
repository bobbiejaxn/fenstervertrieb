# Model Router — Dynamic Ollama Cloud Model Selection

Automatically selects the best Ollama Cloud model for each agent role based on capability scoring. Notifies you when new models appear.

## What It Does

1. **Capability Registry** — `.pi/extensions/model-router/registry.yaml` contains benchmark-verified scores for every model (coding, reasoning, structured output, speed, agentic capability)
2. **Role Matching** — Each agent role defines weighted requirements. The router scores all models and picks the best fit.
3. **New Model Detection** — On every `pi` launch, queries Ollama for models not yet in the registry and alerts you
4. **Agent File Updates** — Can push optimized model assignments to agent `.md` frontmatter

## Files

| File | Purpose |
|------|---------|
| `.pi/extensions/model-router/registry.yaml` | Model capabilities + agent role requirements |
| `.pi/extensions/model-router/.seen-models.json` | Models already notified about (avoids repeat alerts) |
| `.pi/extensions/model-router/agent-model-map.json` | Computed best-model-for-role map (auto-generated) |
| `.pi/extensions/model-router/.ollama-cache.json` | Cached Ollama model list (4hr TTL) |

## Commands

### Query the router

```
# Find the best model for a specific agent role
pi tool model-router '{"action":"best-for-role","role":"implementer"}'

# List all models in registry with scores
pi tool model-router '{"action":"list-models"}'

# List all agent roles and current assignments
pi tool model-router '{"action":"list-roles"}'
```

### Scan for new models

```
# Check Ollama for models not yet in registry
pi tool model-router '{"action":"scan-new"}'

# Force-refresh the Ollama model cache
pi tool model-router '{"action":"refresh"}'
```

### Update agent files

```
# Write best model to each agent's frontmatter
pi tool model-router '{"action":"update-agents"}'
```

## Registry Format

Each model has five capability scores (0-100):

| Dimension | What it measures |
|-----------|-----------------|
| `coding` | Code generation, editing, debugging, multi-file |
| `reasoning` | Analysis, architecture, planning, trade-offs |
| `structured` | JSON/YAML/spec output, templates, following schemas |
| `speed` | TTFT + tokens/sec throughput |
| `agentic` | Tool use, multi-step workflows, instruction following |

Each agent role defines weighted requirements (sum = 1.0):

```yaml
agent_roles:
  implementer:
    requires: { coding: 0.50, agentic: 0.25, speed: 0.15, reasoning: 0.10 }
    description: "Execute plans, write code"
```

The router computes: `score = Σ(capability × weight) / Σ(weights)` for each model and picks the highest.

## Adding a New Model

1. Benchmark the model (or check LMSYS Arena, AkitaOnRails, SWE-bench)
2. Add an entry to `registry.yaml`:

```yaml
models:
  new-model-name:
    ollama_id: "new-model:cloud"
    provider: provider-name
    params: "size/architecture"
    context: 131072
    capabilities:
      coding: 75
      reasoning: 70
      structured: 65
      speed: 80
      agentic: 72
    role_fit: [implementer, test-writer]
    tags: [coding, fast]
    notes: "What you know about this model"
```

3. Run `pi tool model-router '{"action":"update-agents"}'` to push changes

## Notification Flow

```
pi launches
    ↓
Model router extension loads
    ↓
Queries Ollama /api/tags (or uses 4hr cache)
    ↓
Compares against registry + .seen-models.json
    ↓
New models found? → Banner notification in terminal
    ↓
Adds to .seen-models.json (won't re-alert)
    ↓
You decide: add to registry or ignore
```

## Updating Capability Scores

Scores should be updated when:
- New benchmark results are published (LMSYS Arena, SWE-bench)
- You observe real-world performance differences in agentic workflows
- A model gets a major version update

The AkitaOnRails LLM Coding Benchmark is the best practical reference for agentic coding quality (tests real project delivery, not just code completion).

## Triggers

- "model router", "best model for", "model selection"
- "new models", "ollama cloud models", "model registry"
- "update agent models", "optimize model assignments"
