# Pi Launchpad

Autonomous agent orchestration layer for any software project. Drop it into your repo and get a team of 36 specialist AI agents that plan, build, review, and ship verified features end-to-end — including a CEO agent that can autonomously pursue high-level goals, a board of 8 advisors that debate strategic decisions, an **adversarial red-team agent** that actively tries to break implementations, a **dynamic model router** that selects the best Ollama Cloud model per agent role, and a **self-optimizing harness** that gets better every session.

## What Makes This Different

Most agentic setups give you a single agent with tools. Pi Launchpad gives you **autonomous multi-agent orchestration**:

- **CEO agent** — Give it a goal like "Build user authentication with JWT." It plans the work, delegates tasks to specialist workers in parallel, reviews their output, retries or escalates failures, verifies the result against your test suite, and writes learnings for next time. Fully autonomous PLAN-DELEGATE-REVIEW-DECIDE-VERIFY loop.
- **Board deliberation** — 8 advisors with competing biases (ship-fast vs. architect, security vs. DX, moonshot vs. contrarian) debate strategic decisions, then a CEO synthesizes a decision memo. Runs standalone via `/deliberate` or auto-triggers in `/ship` when complexity warrants it.
- **36 specialist agents** — Each with a defined role, preferred model, and tool access. Architects design, implementers build, reviewers gate, researchers search, board advisors debate — they don't overlap.
- **Self-optimizing harness** — Traces every agent call, diagnoses failures from raw execution logs, and automatically proposes improvements to prompts, skills, and model selections. Based on [Meta-Harness](https://yoonholee.com/meta-harness/) (Stanford, 2026).
- **Per-agent memory** — Each agent maintains a YAML mental model that compounds knowledge across sessions. Your implementer remembers codebase patterns, your reviewer remembers past feedback.
- **Domain locking** — File-level read/write/delete permissions per agent prevent conflicts during parallel execution.
- **Hard-enforcement gates** — 6 deterministic verification gates that no agent can self-report past. Tests must actually pass. PRs are the deliverable.
- **Self-learning loop** — Patterns that recur 3+ times auto-promote from session logs to reusable skills.
- **Overnight automation** — Label GitHub issues `backlog`, wake up to open PRs.

## Quick Start

**New here?** See the [Quick Start Guide](docs/QUICKSTART.md) for setup, architecture diagrams, and example workflows.

```bash
# Bootstrap into any project
./setup.sh /path/to/your/project

# Orient on codebase
/prime

# Ship a feature (full pipeline: spec -> implement -> review -> verify -> PR)
/ship "Add dark mode toggle"

# Autonomous goal pursuit (CEO agent plans and delegates independently)
/ceo Build user authentication with JWT and rate limiting

# Board deliberation on a strategic decision
/deliberate "Should we migrate from REST to GraphQL for the dashboard API?"

# Fix a GitHub issue end-to-end
/fix 42
```

## Architecture

```
.pi/
├── agents/          28 core agents + 8 board advisors (.md definitions)
├── prompts/         22 orchestration workflows (/ship, /fix, /ceo, /deliberate, etc.)
├── extensions/      11 TypeScript extensions (subagent, CEO, model-router, search, GitHub, etc.)
├── skills/          32 reusable patterns and domain expertise
├── board-config.yaml Board deliberation settings and auto-trigger rules
├── board-expertise/  Advisor scratch pads (persistent across sessions)
├── config.sh        Single source of truth for project settings
└── learnings/       Self-learning loop (act -> learn -> reuse -> auto-promote)

scripts/             30 hard-enforcement and automation scripts
docs/                Specs, plans, references, workflow guides
specs/               Deliberation briefs and outputs
```

## CEO Agent: Autonomous Orchestration

The CEO agent is the highest-level orchestrator. It receives a goal and works autonomously:

```
/ceo Build full checkout flow with Stripe integration

CEO Session started. Goal: Build full checkout flow with Stripe integration

[Iteration 1] PLAN phase...
  Generated 4 tasks: schema design, API endpoints, frontend form, integration test

[Iteration 1] DELEGATE phase...
  Delegating 2 tasks to workers in parallel...
  - architect: Design Stripe checkout schema
  - implementer: Build payment API endpoints

[Iteration 1] REVIEW phase...
  Reviewed 2 tasks — both ACCEPTED

[Iteration 1] DECIDE phase...
  Action: PLAN (more tasks remain)

[Iteration 2] PLAN phase...
  Generated 2 follow-up tasks based on completed work

...

[Iteration 4] VERIFY phase...
  Running automated checks: PASSED
  Goal verified! Confidence: 92%

## CEO Session Complete
**Tasks**: 6/6 completed
**Iterations**: 4
```

**How it works:**

| Phase | What happens |
|-------|-------------|
| **PLAN** | CEO reasoning (GLM-5.1) analyzes goal + project state, generates task graph with dependencies |
| **DELEGATE** | Ready tasks dispatched to worker agents in parallel via `spawn("pi")`, up to 4 concurrent |
| **REVIEW** | CEO evaluates each worker's output — ACCEPT, RETRY, REDELEGATE, or ESCALATE |
| **DECIDE** | Assess progress: continue planning, verify goal, or escalate to human |
| **VERIFY** | Run `VERIFY_COMMANDS` from config, check changed files, confirm goal met with confidence score |

**Key capabilities:**
- Immutable state with atomic writes — crash-safe, resumable sessions (`/ceo --resume`)
- Secret sanitization on all worker output before storage
- Automatic escalation: creates GitHub issues when stuck
- Memory dual-write: learnings to `.learnings/` + session notes to Obsidian
- Token-budgeted context: file-based RAG keeps prompts within model limits

## Board Deliberation: Multi-Agent Debate

For strategic and architectural decisions, 8 advisors with competing biases debate before the team commits:

```
/deliberate "Should we migrate from REST to GraphQL for the dashboard API?"

Board deliberation started.

[Round 1] ship-fast: "REST is working. Migration cost is 3 sprints minimum."
[Round 1] board-architect: "GraphQL solves the N+1 dashboard query problem permanently."
[Round 1] security-advisor: "GraphQL expands attack surface — introspection, depth attacks."
[Round 1] dx-advocate: "Developer experience improves dramatically with typed queries."
[Round 1] board-moonshot: "What if we skip both and use tRPC for end-to-end type safety?"
[Round 1] tech-debt-auditor: "REST controllers are already 40% copy-paste. Something needs to change."
[Round 1] board-contrarian: "The real problem is the BFF layer, not the API protocol."

[Round 2] Advisors challenge each other's positions...

[Synthesis] board-ceo: Decision memo generated.
  Recommendation: tRPC for new endpoints, REST unchanged for existing.
  Confidence: 85%
```

**Board members:**

| Agent | Bias | Tension with |
|-------|------|-------------|
| **board-ceo** (GLM-5.1) | Leverage & coherence | Moderator — synthesizes decision memo |
| ship-fast | Speed & delivery | Architect, Tech Debt |
| board-architect | Long-term design | Ship Fast, Moonshot |
| security-advisor | Attack surface | Ship Fast, DX |
| dx-advocate | Developer experience | Security, Architect |
| board-moonshot | 10x simplification | Contrarian, Architect |
| tech-debt-auditor | Sustainability | Ship Fast |
| board-contrarian | Challenge assumptions | Everyone |

**Integration with `/ship`:** When `auto_deliberate.enabled: true` in `.pi/board-config.yaml`, the `/ship` workflow auto-triggers board deliberation (Phase 0.5) when complexity warrants it. The resulting memo feeds into the product-manager and architect phases. Force it with `/ship --deliberate "Feature Name"`.

## Model Providers

No Anthropic OAuth dependency. Models accessed via API keys and Ollama Cloud:

| Provider | Models | Cost | Used by |
|----------|--------|------|--------|
| **Ollama Cloud** | DeepSeek V4 Pro (deep reasoning), V4 Flash (fast reasoning), Qwen3-Coder, MiniMax, Kimi, and 30+ more | $20-100/mo plans | model-router selects dynamically |
| **ZAI API** | GLM-5.1 (coding), GLM-5 (fast) | ~$1.00 / ~$0.20 per 1M tokens | 4 coding agents |
| **MiniMax API** | M2.7 (structured output) | ~$0.30 per 1M tokens | 8 agents |
| **Straico** | Perplexity Sonar, Sonar Deep Research | gateway pricing | 2 research agents |

### Dynamic Model Router

The `model-router` extension maintains a capability registry (coding, reasoning, structured output, speed, agentic) for every model on Ollama Cloud. Each agent role defines weighted requirements. The router scores all models and picks the best fit — no hardcoded assignments.

- **On `pi` launch**: queries Ollama for new models, alerts you with a 🆕 banner
- **Registry**: `.pi/extensions/model-router/registry.yaml` — 9 models, 23 roles
- **Tool actions**: `best-for-role`, `list-models`, `list-roles`, `scan-new`, `refresh`, `update-agents`
- Models update automatically as new ones appear on Ollama Cloud

## Agents (36 = 28 core + 8 board)

| Agent | Model | Role |
|-------|-------|------|
| **ceo** | MiniMax-M2.7 | Autonomous goal orchestration — plans, delegates, reviews, iterates |
| product-manager | MiniMax-M2.7 | PM interview, USVA spec writing |
| **architect** | DeepSeek V4 Flash | Implementation plans from specs |
| **software-architect** | DeepSeek V4 Pro | System design, DDD, architectural patterns, ADRs |
| **security-reviewer** | DeepSeek V4 Pro | STRIDE threat model, RBAC gaps, data leakage |
| learning-agent | DeepSeek V4 Flash | Log session outcomes, retrieve learnings, auto-promote patterns |
| **harness-evolver** | DeepSeek V4 Pro | Reads execution traces, diagnoses failures, proposes harness improvements |
| reviewer | DeepSeek V4 Flash | Diff review — PASS or FAIL with evidence |
| ui-reviewer | DeepSeek V4 Flash | Frontend diff review — responsive, mobile UX, design system |
| **gate-skeptic** | DeepSeek V4 Pro | Evidence-based readiness check (default: NOT READY) |
| database-optimizer | GLM-5.1 | Schema design, query optimization, indexing, migrations |
| sre | MiniMax-M2.7 | SLOs, error budgets, observability, toil automation |
| knowledge-organizer | MiniMax-M2.7 | Obsidian vault organization, properties, wikilinks |
| **validation-lead** | DeepSeek V4 Flash | Coordinates reviewer + security-reviewer + adversarial-tester + gate-skeptic |
| **frontend-lead** | DeepSeek V4 Flash | Frontend team coordinator — delegates to implementer, ui-reviewer, test-writers |
| **backend-lead** | GLM-5.1 | Backend team coordinator — delegates to implementer, database-optimizer, sre |
| **implementer** | GLM-5.1 | Execute implementation plans |
| fixer | DeepSeek V4 Flash | Triage + fix bugs without a GitHub issue |
| debug-agent | DeepSeek V4 Flash | Fix exact gate failures (Iron Law: no fix without root cause) |
| test-writer | GLM-5.1 | Gherkin specs, E2E tests |
| unit-test-writer | DeepSeek V4 Flash | Typed unit/integration tests (zero `any`) |
| **adversarial-tester** | DeepSeek V4 Flash | Active red-team — edge cases, boundary attacks, RBAC probing |
| researcher | Straico/Sonar | Quick web research |
| deep-researcher | Straico/Sonar DR | Deep multi-source analysis |
| reasoning-researcher | DeepSeek V4 Flash | Complex reasoning over multiple sources |
| web-researcher | DeepSeek V4 Flash | Web search for current information |
| idea-capture | MiniMax-M2.7 | Capture raw ideas as GitHub issues |
| issue-creator | MiniMax-M2.7 | GitHub issues for out-of-scope work |
| **board-ceo** | MiniMax-M2.7 | Board moderator — drives debate, synthesizes decision memo |
| board/ship-fast | MiniMax-M2.7 | Speed & delivery bias |
| **board/board-architect** | DeepSeek V4 Pro | Long-term design bias |
| **board/security-advisor** | DeepSeek V4 Pro | Attack surface bias |
| board/dx-advocate | DeepSeek V4 Flash | Developer experience bias |
| board/board-moonshot | DeepSeek V4 Flash | 10x simplification bias |
| board/tech-debt-auditor | DeepSeek V4 Flash | Sustainability bias |
| **board/board-contrarian** | DeepSeek V4 Pro | Challenge assumptions — default skeptic |

## Extensions (11)

| Extension | What it does |
|-----------|-------------|
| **ceo** | Autonomous CEO orchestration loop with parallel worker delegation, state management, and memory |
| **subagent** | Core tool — spawns isolated agent processes (single, parallel up to 8, chain modes) |
| **model-router** | Dynamic Ollama Cloud model selection — capability scoring, role matching, new model alerts |
| **trace-recorder** | Captures every tool call, result, and message as structured JSONL — powers the harness evolver |
| **domain-enforcer** | Enforces file-level read/write/delete permissions per agent via `tool_call` hooks |
| brave-search | Web search integration via Brave Search API |
| context7-tools | Library documentation queries |
| deepseek | DeepSeek model provider routing |
| github-tools | GitHub issue/PR API integration |
| obsidian-write | Write notes to Obsidian vault |
| straico | 70+ models via single API key (GPT, Claude, Gemini, Sonar, DeepSeek, Qwen, Grok) |

## Orchestration Library

Shared modules inlined in `.pi/extensions/ceo/orchestrator.ts` that power the CEO agent:

| Module | Purpose |
|--------|---------|
| `assessProgress` | Progress assessment, stuck detection (3+ failed tasks at max attempts) |
| `mergePlanUpdate` | Merge plan updates, resolve task readiness from dependency graphs |
| `getReadyTasks` | Filter tasks whose dependencies are all completed |
| `applyReviewDecision` | Review verdicts (ACCEPT/RETRY/REDELEGATE/ESCALATE) |
| `canRetry` | Retry guard — checks attempt count against max |

## Prompts (22 workflows)

| Command | What it does |
|---------|-------------|
| **`/ceo`** | **Autonomous goal pursuit — plans, delegates, reviews, iterates until done** |
| **`/evolve`** | **Harness evolution — analyze traces, diagnose failures, propose improvements** |
| `/ship` | Full delivery: spec, implement, verify, PR |
| `/ship-fast` | Streamlined delivery: no PM, no USVA, no reviewer |
| `/fix` | Fix a GitHub issue end-to-end |
| `/fix-bug` | Fix a bug from symptoms (no GitHub issue needed) |
| `/fix-gh-issue` | Fix GitHub issue with full agent pipeline |
| `/feature` | Full feature cycle: plan, TDD, review |
| `/plan` | Plan before coding |
| `/tdd` | Test-driven development |
| `/review` | Pre-commit review |
| `/verify` | Run verification checks |
| `/prime` | Orient on codebase + load learnings |
| `/status` | Pipeline health: running/stuck, shipped, value added |
| `/idea` | Capture an idea to GitHub for later |
| `/research` | Quick web research via Perplexity Sonar |
| `/deep-research` | Deep multi-source analysis |
| `/deliberate` | Structured deliberation on complex decisions |
| `/opsx:propose` | OpenSpec: propose a change with full artifacts |
| `/opsx:explore` | OpenSpec: explore ideas and clarify requirements |
| `/opsx:apply` | OpenSpec: implement tasks from a change |
| `/opsx:archive` | OpenSpec: archive a completed change |

## How /ship Works

```
User: /ship "Add dark mode toggle"
  |
  +- Phase 0: learning-agent retrieves past learnings
  +- Phase 0.5: board deliberation (optional — auto-triggers on complexity or --deliberate flag)
  +- Phase 1: product-manager interviews user -> USVA spec (receives deliberation memo if Phase 0.5 ran)
  +- Phase 2: architect reads spec + codebase -> implementation plan (receives deliberation memo if Phase 0.5 ran)
  +- Phase 3+4: test-writer + unit-test-writer + implementer run IN PARALLEL
  +- Phase 4.5: ui-reviewer checks frontend diff (if applicable)
  +- Phase 5: reviewer + security-reviewer (parallel, fix loop if FAIL)
  +- Phase 5.5: adversarial-tester -- active red-team (edge cases, RBAC probing, boundary attacks)
  +- Phase 5.6: gate-skeptic -- evidence-based readiness check
  +- Phase 6: run-ship.sh gates (deterministic, non-bypassable)
  |   +- Gate 1: worktree isolation
  |   +- Gate 2: static checks (from config)
  |   +- Gate 3: dev log capture
  |   +- Gate 4: E2E feature test (2 attempts max)
  |   +- Gate 5: P0 regressions (2 attempts max)
  |   +- Gate 6: gh pr create
  +- Phase 7: learning-agent logs session + auto-promotes
  +- Phase 8: structured report to user
```

## Autoship: Overnight Automation

Ship GitHub issues while you sleep.

### Nightly cron (install once, runs forever)

```bash
./scripts/install-cron.sh
```

- **9 PM** — `cron-spec-writer.sh` picks up `backlog` issues, writes USVA specs, labels `spec-ready`
- **10 PM** — `cron-auto-ship.sh` picks up `spec-approved` issues, runs full /ship pipeline

**Workflow:**
1. Label issues `backlog` in GitHub
2. 9 PM: specs get written and posted as comments
3. You review specs, add `spec-approved` (or `spec-hold` to pause)
4. 10 PM: auto-ship picks up approved issues and ships them
5. Wake up to open PRs

### One-shot overnight loop

```bash
./scripts/autoship.sh          # background, returns shell
./scripts/autoship.sh --fg     # foreground, blocks
```

Runs for 6 hours (configurable). Writes specs immediately, then polls every 5 minutes for approved issues.

## Code Quality Enforcement

Every agent output is enforced at **two layers** — mechanical (scripts) and nuanced (LLM reviewers):

### Mechanical enforcement (`vibe-verify.sh`)

10 checks that run as shell scripts. Non-bypassable. Catches what LLMs miss.

```bash
./scripts/vibe-verify.sh            # Full 10-check scan
./scripts/vibe-verify.sh --quick    # Skip coverage + DRY (fast)
./scripts/vibe-verify.sh --fix     # Auto-fix where possible
```

| # | Check | What it catches | Result |
|---|-------|----------------|--------|
| 1 | **TypeScript strict** | `tsc --noEmit` — type errors | FAIL |
| 2 | **ESLint zero-warnings** | Lint violations | FAIL |
| 3 | **No `any` types** | `: any`, `as any`, `<any>` | FAIL |
| 4 | **No unjustified @ts-ignore** | Error suppression without reason | FAIL |
| 5 | **No unsafe patterns** | `eval()`, `innerHTML`, SQL concat, `shell=True`, CORS `*` | FAIL |
| 6 | **No hardcoded secrets** | AWS keys, GitHub tokens, private keys, connection strings | FAIL |
| 7 | **DRY** | Duplicate code blocks ≥10 lines | WARN |
| 8 | **Coverage threshold** | ≥70% line coverage (configurable) | FAIL |
| 9 | **Function length** | Functions >80 lines (configurable) | WARN |
| 10 | **Import hygiene** | Unused imports | WARN |

All configurable via `.pi/config.sh` or env vars (`VIBE_NO_ANY`, `VIBE_COVERAGE_THRESHOLD`, `VIBE_MAX_FUNC_LINES`, etc.).

### Security enforcement (`security-gate.sh`)

Runs as Gate 2.5 in `/ship`. 5 hard checks:

| Check | What it catches |
|-------|----------------|
| No public repos | `gh repo create` without `--private` |
| No weak passwords | Passwords <9 chars, dictionary words |
| No hardcoded secrets | API keys, tokens, private keys in source |
| No unsafe code | `eval()`, SQL injection, `shell=True`, `verify=False` |
| No secrets in git | Secrets in `git diff` output |

### Nuanced enforcement (LLM reviewers)

The agents handle what scripts can't:

| Agent | What it catches |
|-------|----------------|
| **reviewer** | Architecture, naming, dead code, missing error handling, DRY violations (conceptual) |
| **security-reviewer** | OWASP Top 10, STRIDE threat model, RBAC gaps, data leakage paths |
| **adversarial-tester** | Edge-case inputs, boundary conditions, concurrency attacks, UI edge cases |
| **gate-skeptic** | Evidence-based readiness — demands proof, not claims |

### How they plug together

```
/ship pipeline:
  Gate 2:   vibe-verify.sh (mechanical)     ← exits 1 on violations
  Gate 2.5: security-gate.sh (security)      ← exits 1 on violations
  Phase 5:  reviewer + security-reviewer (LLM) ← nuanced analysis
  Phase 5.5: adversarial-tester (LLM)        ← active red-team
  Phase 5.6: gate-skeptic (LLM)              ← evidence check
```

Mechanical checks run first (fast, deterministic). LLM reviewers run second (thorough, contextual). Neither can be bypassed.

## Self-Learning Loop

The learning system evolves from session outcomes:

```
Session ends
  -> learning-agent logs patterns, errors, decisions
  -> Patterns stored in .learnings/LEARNINGS.md
  -> Patterns that recur 3+ times auto-promote to skill files
  -> Next session: /prime loads promoted learnings into context
```

The CEO agent also writes learnings after every REVIEW phase (retry patterns) and Obsidian notes on session completion.

## Self-Optimizing Harness (Meta-Harness)

The agent harness — prompts, skills, context rules, model selections — automatically improves itself by analyzing execution traces. Based on [Meta-Harness](https://yoonholee.com/meta-harness/) (Lee et al. 2026, Stanford).

```
You work normally (/ship, /fix)
    ↓
Trace recorder captures every agent call silently
    ↓
/evolve (or run after N sessions)
    ↓
Harness evolver reads traces, diagnoses failures
    ↓
Proposes ONE targeted change (evidence-based)
    ↓
Applies + snapshots harness version
    ↓
Next run is measurably better (or auto-reverted)
```

**Key insight from the paper:** Giving the optimizer access to 10M tokens of raw execution traces via filesystem navigation (grep, cat, diff) is 400× more effective than compressing history into summaries.

### Commands

```bash
# Trace analysis
./scripts/trace-index.sh summary         # Overview of all traced runs
./scripts/trace-index.sh failures        # Runs with errors
./scripts/trace-index.sh costly          # Most expensive runs

# Evolve the harness
./scripts/evolve-harness.sh              # General optimization
./scripts/evolve-harness.sh cost         # Reduce token costs
./scripts/evolve-harness.sh gates        # Improve gate pass rate
./scripts/evolve-harness.sh speed        # Reduce execution time

# Version management
./scripts/harness-version.sh snapshot    # Save current state
./scripts/harness-version.sh rollback    # Revert last change
./scripts/harness-version.sh list        # All versions
./scripts/harness-version.sh compare v1 v2  # Diff two versions

# Dashboard
./scripts/harness-report.sh             # Full performance report
./scripts/harness-report.sh brief       # One-line summary
```

### What the evolver can optimize

| Surface | Example |
|---------|---------|
| Agent prompts | "Add visual verification requirement to implementer" |
| Skill composition | "Load output-enforcement for all agents" |
| Model selection | "Downgrade test-writer to GLM-5 (no quality loss)" |
| Context building | "Include test files when building reviewer context" |
| Gate thresholds | "Increase E2E retry from 2 to 3 attempts" |

### Per-Agent Mental Models

Each agent maintains a YAML expertise file (`.pi/expertise/`) that compounds knowledge:

```yaml
# .pi/expertise/implementer-mental-model.yaml
architecture:
  auth:
    pattern: "JWT middleware in src/middleware/auth.ts"
    gotcha: "Token refresh has a race condition under concurrency"
patterns:
  - "Always run tsc before committing — catches 80% of gate failures"
risks:
  - area: "database migrations"
    note: "Must run prisma generate before tsc"
```

Agents read their mental model at task start and update it after completing work. You don't touch these files — the agents maintain them automatically.

## Agent Skills (32)

Composable behavioral rules loaded by agents:

| Skill | For | Purpose |
|-------|-----|---------|
| mental-model | All agents | Read/update personal YAML expertise files |
| zero-micro-management | Leads, orchestrator | Never execute directly — always delegate |
| precise-worker | Workers | Execute exactly what was asked, no scope creep |
| high-autonomy | Orchestrator | Act decisively, zero clarifying questions |
| active-listener | Multi-agent flows | Read conversation log before responding |
| conversational-response | Multi-agent flows | Concise chat-style, detail in files |
| output-enforcement | All agents | Ban LLM truncation patterns, enforce complete output |
| model-router | All agents | Dynamic Ollama Cloud model selection per role |
| ralph-harness-gate | Ralph loops | Mandatory verification before declaring COMPLETE |
| **builder-ethos** | All agents | 3 principles: Boil the Lake, Search Before Building, User Sovereignty + Prime Directives |
| **design-principles** | UI/frontend agents | Anti-slop rules, Core Asset Protocol, 5-dimension critique rubric |
| frontend-design | UI work | Premium design patterns + AI-tells ban list |
| project-rules | All agents | AGENTS.md rules, verification, context building |
| code-guardian | Code review | Prevents `any`, unsafe types, inline styles |
| vercel-deploy-guard | Deployment | Catches known Vercel build failures |
| vibe-test-guardian | Testing | Test enforcement, coverage thresholds |
| **proposal-deck-builder** | Client work | Structured interview → markdown proposal + interactive HTML pitch deck |
| **agentops** | DevOps | Monitor agent performance, automate DevOps with proactive agents |
| **cinematic-sites** | Web design | Transform websites into cinematic experiences with 3D animations |
| **huashu-design** | Design tasks | High-fidelity HTML prototypes, animations, design exploration, expert review |
| **obsidian-direct-write** | PKM | Write content directly to Obsidian vault with correct PARA placement |
| drive | Terminal automation | tmux session control, screenshots, parallel execution |
| + 8 OpenSpec | Change management | propose, explore, apply, archive — structured change workflows |
| **sync-docs** | Maintenance | Scan actual state → update README, AGENTS.md, registry, target projects — run after any change |

## Setup

```bash
./setup.sh /path/to/your/project
```

The setup script asks ~10 questions about your project (name, repo, stack, dev command, test runner) and generates everything.

### Updating an Existing Project

When pi_launchpad is updated on GitHub, sync the latest framework files into any project that has it installed:

```bash
# From inside the project
./scripts/update.sh

# Preview changes first
./scripts/update.sh --dry-run

# Force overwrite everything (including config.sh)
./scripts/update.sh --force
```

**What gets synced:** agents, extensions, prompts, skills, scripts, expertise, board-config, docs
**What gets preserved:** config.sh, learnings, traces, sessions, specs, tests, board-expertise scratch pads

Any agent can update its own project by running `./scripts/update.sh`.

### Non-Interactive Setup (for agents)

Deploy the harness programmatically — no human at the terminal needed:

```bash
# From JSON config
./setup.sh --config setup.json

# From environment variables
SETUP_PROJECT_NAME=my-app SETUP_REPO=owner/repo SETUP_STACK=next \
  ./setup.sh --auto /path/to/project

# Dry run (preview only)
./setup.sh --config setup.json --dry-run
```

See [AGENTS.md](AGENTS.md) for the full JSON schema and env var reference.

### What setup creates

```
your-project/
+-- .pi/
|   +-- config.sh              <- all project-specific values (edit this)
|   +-- agents/                <- 28 core + 8 board agent definitions
|   +-- prompts/               <- 22 prompt templates
|   +-- extensions/
|   |   +-- subagent/          <- core agent spawning
|   |   +-- ceo/               <- autonomous CEO orchestration
|   |   +-- model-router/      <- dynamic Ollama Cloud model selection
|   |   +-- trace-recorder/    <- execution trace capture
|   |   +-- domain-enforcer/   <- file permission enforcement
|   |   +-- brave-search/      <- web search
|   |   +-- github-tools/      <- issue/PR APIs
|   |   +-- straico/           <- multi-model provider
|   |   +-- ...                <- context7, deepseek, obsidian
|   +-- expertise/             <- per-agent mental models (grow over time)
|   +-- traces/                <- execution trace filesystem
|   +-- harness-versions/      <- harness version snapshots
|   +-- sessions/              <- shared conversation logs
|   +-- skills/                <- 27 composable behavior skills
|   +-- lib/                   <- shared utilities
|   +-- tools/                 <- shell-based MCP wrappers
+-- .learnings/
|   +-- LEARNINGS.md           <- knowledge base (grows over time)
|   +-- ERRORS.md              <- error log
+-- scripts/                   <- hard-enforcement, automation, harness evolution
+-- specs/usva/                <- feature specs
+-- AGENTS.md                  <- project rules (source of truth)
```

### After setup

1. Review `.pi/config.sh` — adjust project-specific values
2. Merge `.pi/AGENTS-SECTION.md` into your `AGENTS.md`
3. Start a session with `/prime`
4. Try `/ceo "your goal"` for autonomous orchestration or `/ship "feature"` for guided delivery

### Supported stacks

Setup has built-in defaults for:
- **next** / **nextjs** — Next.js with TypeScript
- **vite** / **vite-react** — Vite + React
- **convex** / **next-convex** — Next.js + Convex
- **express** / **node** — Express/Node.js backend
- **prisma** / **next-prisma** — Next.js + Prisma
- **django** / **python** — Django / Python

Any stack works — just provide your own values when prompted.

## Testing

76+ tests across 7 files, covering the critical paths that were previously untested.

```bash
# Run all tests
npx vitest run .pi/extensions/ --reporter=verbose
```

| File | Tests | What it catches |
|------|-------|----------------|
| `subagent/subagent.test.ts` | 28 | BUILTIN_TOOLS filter, team lead delegation, frontmatter parsing, regression guard |
| `subagent/agents-validation.test.ts` | 12 | Agent roster: naming, models, tools, duplicates, board completeness |
| `ceo/state-manager.test.ts` | 7 | Session CRUD, state transitions |
| `ceo/context-loader.test.ts` | 4 | Context building per agent type |
| `ceo/integration.test.ts` | 5 | Full lifecycle, stuck detection, immutability |
| `ceo/reasoning.test.ts` | 9 | JSON parsing, type guards |
| `ceo/memory-writer.test.ts` | 1 | Secret sanitization |

### Key regressions caught automatically

| Regression | Test that catches it |
|-----------|-------------------|
| `subagent` passed to `--tools` (breaks team leads) | `filters out 'subagent'` + `team lead can delegate` |
| PascalCase tools sneak back in | `no agent uses PascalCase tools` |
| `WebFetch` added to an agent | `no agent lists WebFetch as a tool` |
| Anthropic model names return | `no agent references old Anthropic model names` |
| Agent missing `description` | `every agent has required frontmatter fields` |
| Board member loses model field | `every board member has a model field` |
| Duplicate agent name created | `no duplicate agent names` |

## Configuration

All project-specific values live in `.pi/config.sh`:

| Setting | What it controls |
|---------|-----------------|
| `PROJECT_NAME`, `GITHUB_REPO` | Project identity |
| `DEV_COMMAND`, `DEV_PORT` | Dev server for log capture |
| `VERIFY_COMMANDS` | Static checks, tests, linting (used by gates + CEO VERIFY phase) |
| `TEST_RUNNER`, `TEST_COMMAND` | Test framework (adapts test-writer output) |
| `HARD_RULES` | Reviewer checklist items |
| `SCHEMA_DIR`, `AUTH_FILE`, etc. | Context paths for build-context.sh filtering |
| `CRON_*` settings | Model/provider/limits for overnight automation |

## Multi-Provider Model Routing

Route agents to different providers based on their role:

| Role | Model | Provider |
|------|-------|----------|
| Deep reasoning (security, architect, gate-skeptic, evolver) | DeepSeek V4 Pro | Ollama Cloud |
| Fast reasoning (review, debug, adversarial, leads) | DeepSeek V4 Flash | Ollama Cloud |
| Coding execution (implementer, test-writer, backend) | GLM-5.1 | ZAI API |
| Structured output (PM, CEO, ideas, issues, SRE) | MiniMax-M2.7 | MiniMax API |
| Research (sonar, deep-research) | Perplexity Sonar / Sonar DR | Straico |

Supported providers: Z.ai (`ZAI_API_KEY`), MiniMax (`MINIMAX_API_KEY`), Straico (`STRAICO_API_KEY`), DeepSeek (`DEEPSEEK_API_KEY`), Ollama Cloud (subscription).

The **model-router** extension can dynamically reassign models based on Ollama Cloud availability and capability scores. Run `model-router update-agents` to push optimized assignments.

## Architecture Decisions

- **CEO for autonomy** — High-level goals get autonomous multi-iteration orchestration
- **Board for strategic decisions** — Competing biases surface blind spots before committing
- **Self-optimizing harness** — Traces → diagnosis → targeted fix → measurable improvement
- **Per-agent memory** — Mental models compound domain knowledge across sessions
- **Domain locking** — File permissions prevent agents from stepping on each other
- **Mechanical > LLM enforcement** — `vibe-verify.sh` catches `any` types, unsafe patterns, and hardcoded secrets deterministically; agents handle the nuanced stuff
- **GLM-5.1 for judgment** — PM, architect, security-reviewer, learning, CEO reasoning, board-ceo, harness-evolver
- **GLM-5 for execution** — Implement, review, debug, test-write
- **DeepSeek V4 Pro for deep reasoning** — Security, architecture, gate-skeptic, harness-evolver, board (architect, contrarian, security)
- **DeepSeek V4 Flash for fast reasoning** — Review, debug, adversarial, leads, board (moonshot, DX, tech-debt)
- **MiniMax-M2.7 for translation** — Mechanical tasks (issues, ideas)
- **Dynamic model routing** — model-router selects best Ollama Cloud model per role
- **Builder ethos** — Boil the Lake, Search Before Building, User Sovereignty — injected into all agents
- **Parallel where independent** — Workers don't depend on each other, run concurrently
- **Chain where sequential** — Reviewer -> implementer -> reviewer in one tool call
- **Immutable state** — CEO state uses spread operators + atomic writes, never mutates
- **Config file, not hardcoding** — Every project-specific value in `.pi/config.sh`
- **AGENTS.md is law** — Skills point to it, never restate
- **Two-attempt cap** — No infinite fix loops; create issue and move on
- **Worktree isolation** — Each /ship and CEO session gets clean git state
- **PR as deliverable** — Users review PRs, not code or agent output
- **Cron ships while you sleep** — Label issues, wake up to PRs
- **Learn from every session** — Patterns auto-promote after 3+ recurrences
- **Verify before COMPLETE** — Ralph loops require evidence, not just "it compiles"

## Agentic Horizon Integration

Pi Launchpad integrates the [Agentic Horizon](https://agenticengineer.com/tactical-agentic-coding) trilogy for depth-2 multi-team agent orchestration and infinite brand-consistent UI generation.

### What it adds

| System | What it does |
|--------|-------------|
| **Multi-Team Chat** (lead-agents) | Orchestrator → Team Leads → Workers delegation with domain locking, mental models, task tracking, and a custom TUI. Run `just team`. |
| **CEO + Board** (ceo-agents) | Strategic decision-making with 7 advisors debating competing biases. Run `just ceo`. |
| **Infinite UI Agents** (ui-agents) | Define a brand identity once in YAML, then generate unlimited brand-consistent Vue components across 8 parallel teams. Run `just team-ui`. |

### Setup

```bash
# 1. Clone the trilogy repos
# (from Agentic Horizon member assets)

cd ~/Projects/lead-agents && bun install   # Install extension deps
cd ~/Projects/ui-agents/apps/infinite-ui && bun install  # Install Vue app deps

# 2. Set ANTHROPIC_API_KEY in both .env files
cp .env.sample .env  # in lead-agents and ui-agents

# 3. The `teams` shell function is added to ~/.zshrc by lead-agents /install
# Or manually:
#   teams() { pi -e "/path/to/lead-agents/apps/multi-team-chat/extensions/multi-team-chat.ts" "$@"; }

# 4. Verify
just verify-teams
```

### Commands

```bash
just team           # Multi-team chat (Planning + Engineering + Validation)
just team-ui        # Multi-team chat with UI generation teams
just teamc <path>   # Custom team config
just ceo            # CEO + Board deliberation
just ui-dev         # Start the UI Agents Vue app (port 5173)
just verify-teams   # Check integration health
```

### Team configs deployed in `.pi/multi-team/`

| Config | Teams | Use for |
|--------|-------|----------|
| `multi-team-config.yaml` | Planning + Engineering + Validation | General coding tasks |
| `configs/ui-agents-config.yaml` | Setup + Brand + UI Gen ×3 + Validation ×3 | UI generation |

### How the two agent systems coexist

- **Pi Launchpad agents** (`.pi/agents/`) — use the `subagent` tool, work within pi sessions
- **Multi-team agents** (`.pi/multi-team/agents/`) — use the `delegate` tool, run via `teams` command

Both share mental models, learnings, and project context.

---

## Resources

- [Quick Start Guide](docs/QUICKSTART.md) — Step-by-step setup walkthrough
- [Workflow Guide](docs/workflows/README.md) — Six user stories covering every workflow
- [External References](docs/REFERENCES.md) — Implementation patterns and tutorials
- [Obsidian Integration](docs/obsidian/) — Adaptive knowledge systems
