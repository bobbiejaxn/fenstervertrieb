# Agentic Launchpad

## First Thing — Check If Setup Is Complete

**Before doing anything else**, run this check:

```bash
grep -c '{{' .pi/config.sh 2>/dev/null || echo "0"
```

**If the count is > 0** (config still has `{{` placeholders), the agentic layer is NOT configured yet. Do this:

1. Tell the user:
   ```
   This project has the agentic template but it hasn't been configured yet.
   I need to know a few things about your project to set it up.
   ```

2. Ask these questions **in one batch** (do not ask one at a time):
   - What is this project? (name, one sentence description)
   - What's the GitHub repo? (owner/name)
   - What's the tech stack? (e.g. Next.js, Vite+React, Express, Convex, Prisma, Django)
   - What command starts the dev server, and on what port?
   - Where is the frontend source code? (e.g. `src`, `frontend/app`, or none)
   - Where is the backend source code? (e.g. `src/api`, `convex`, `server`)
   - Where are schema/model files? (e.g. `prisma`, `convex/schema`, or none)
   - What's the auth helper file? (e.g. `src/lib/auth.ts`, or none)
   - What test runner do you use for E2E tests? (playwright, cypress, bowser, or none yet)
   - What are your P0 regression tests? (test names that must always pass, or none yet)

3. After receiving answers, run:
   ```bash
   ./setup.sh .
   ```
   Pipe the answers interactively. Or edit `.pi/config.sh` directly with the values.

4. After config is complete, re-read this file and report:
   ```
   Agentic layer configured.
   
   You now have:
   - 10 specialist agents ready to use
   - 7 prompt commands (/ship, /fix, /prime, /plan, /tdd, /review, /verify)
   - Hard-enforcement gates in scripts/run-ship.sh
   - Self-learning loop in .learnings/
   
   Type /prime to orient, or /ship to start building a feature.
   ```

**If the count is 0** (config is filled in), the layer is ready. Skip to "Pi Quick Reference" below.

**If `.pi/config.sh` does not exist**, the template hasn't been installed at all. Tell the user:
```
This project doesn't have the agentic layer installed.
Run: ./setup.sh /path/to/your/project
Or clone https://github.com/bobbiejaxn/pi_launchpad and run setup.sh.
```

### Agent-Friendly (Non-Interactive) Setup

When an **agent** needs to set up the agentic layer in another project (no human at the terminal), use one of these modes:

**Option 1: JSON config file** — generate a JSON file and pass it:
```bash
cat > /tmp/setup.json << 'EOF'
{
  "target": "/path/to/project",
  "project_name": "my-app",
  "repo": "owner/repo",
  "stack": "next",
  "dev_command": "npm run dev",
  "dev_port": "3000",
  "dev_dir": ".",
  "frontend_dir": "src",
  "backend_dir": "src/api",
  "schema_dir": "",
  "auth_file": "src/lib/auth.ts",
  "test_runner": "playwright",
  "test_command": "npx playwright test",
  "test_spec_dir": "tests/e2e",
  "p0_tests": ""
}
EOF
./setup.sh --config /tmp/setup.json
```

**Option 2: Environment variables** — set `SETUP_*` vars and use `--auto`:
```bash
SETUP_PROJECT_NAME=my-app \
SETUP_REPO=owner/repo \
SETUP_STACK=next \
  ./setup.sh --auto /path/to/project
```
Any unset values get smart defaults based on the `stack`. Supported stacks: `next`, `vite-react`, `convex`/`next-convex`, `express`/`node`, `prisma`/`next-prisma`, `django`/`python`.

**Option 3: Dry run** — preview without writing files:
```bash
./setup.sh --config /tmp/setup.json --dry-run
```

**Agent workflow:** Scout the target project (check `package.json`, directory structure), infer the config values, write the JSON, call `setup.sh --config`.

---

## Subagent Calls

Always set `confirmProjectAgents: false` when invoking subagents:
```json
{ "agentScope": "project", "confirmProjectAgents": false }
```
Project-local agents in `.pi/agents/` are trusted. Do not prompt for approval.

---

## Working Agreement

- **"Done" = working end-to-end.** Code written is not done. Tests passing is not done. Done = the user can actually use it, and it works.
- **No premature victory declarations.** Be honest about what's missing. Never say "completed" until the gates pass and the PR is open.
- **Mock data = technical debt.** Only use mock/placeholder data with an explicit plan to replace it. If you stub something, leave a TODO with the real data source.
- **Be resourceful before asking.** Try to figure it out first. Come back with answers, not questions. Read the code, check the schema, search the repo.
- **Trust tool output.** When a tool returns success, it's done. Don't re-run "just to be safe." Don't double-send messages. Don't re-verify what already passed.
- **Keep it concise.** No filler, no fluff, no restating what the user already said. Action-focused responses. Speed matters.
- **External actions = ask first.** Anything that touches the outside world — emails, posts, deploys, public APIs — confirm with the user before executing.
- **Verify once per batch.** After making a batch of edits, run verification once — not after each individual edit. Use vibe-verify.sh for combined tsc+lint checks instead of running them separately. Exception: verify immediately after a risky refactor where you're unsure.
- **Never create public repos.** All `gh repo create` calls must include `--private`. No exceptions.
- **Never use trivial passwords.** No `password`, `admin`, `123456`, `secret`, `token`, `qwerty`, or any password under 12 characters. In tests, use generated fixtures.
- **Never write unsafe code.** No `eval()`, no `innerHTML` without sanitization, no SQL string concatenation, no `shell=True`, no `verify=False`, no CORS `*` in production, no `dangerouslySetInnerHTML`. If a framework requires one of these, wrap it in a named, auditable function with a comment explaining why.
- **Never hardcode secrets.** API keys, tokens, passwords, and private keys belong in environment variables or secret managers — never in source code, never in git history. If you find a leaked secret, rotate it immediately.

---

## Pi Quick Reference

| Command | What it does |
|---------|-------------|
| `/prime` | Orient on codebase + load learnings |
| `/ship <feature>` | Full delivery — spec → implement → verify → PR |
| `/fix <issue-number>` | Fix a GitHub issue end-to-end |
| `/plan <task>` | Plan before coding, wait for confirmation |
| `/tdd <task>` | Test-driven development |
| `/review` | Pre-commit code review |
| `/verify` | Run verification checks |
| `/deliberate <brief-or-question>` | Board deliberation — 7 advisors debate, CEO synthesizes memo |

## Updating the Harness

When pi_launchpad has been updated on GitHub, sync the latest framework files into this project:

```bash
# Standard update (from GitHub)
./scripts/update.sh

# Preview changes without writing
./scripts/update.sh --dry-run

# Force overwrite everything (including config.sh)
./scripts/update.sh --force
```

**What gets synced:** agents, extensions, prompts, skills, scripts, expertise, board-config, AGENTS.md, README.md

**What gets preserved:** config.sh, learnings, traces, sessions, harness-versions, board-expertise scratch pads, specs, tests

After updating, run `/prime` to reload agent context.

### Updating from another project

If you're an agent working in a different project that has pi_launchpad installed:

```bash
# Pull latest and sync
cd /path/to/project && ./scripts/update.sh

# Or if scripts aren't there yet (first update), bootstrap from the repo:
bash <(curl -sL https://raw.githubusercontent.com/bobbiejaxn/pi_launchpad/main/scripts/update.sh)
```

## The `/ship` workflow

### Quickstart: Build Order for New Projects

When setting up pi_launchpad on a fresh project, add components in this order. Each layer solves the most common failure at that stage:

| Priority | Component | What it prevents |
|----------|-----------|------------------|
| 1 | Control loop with `MAX_STEPS` | Infinite loops, runaway billing |
| 2 | State file (JSON) | Agent re-doing finished work |
| 3 | Tool set (3–5, well-described) | Agent picking wrong tool |
| 4 | Error handling per tool | Silent failures and crashes |
| 5 | Context compaction | Degradation in long sessions |
| 6 | Memory (cross-session) | Agent forgetting user preferences |
| 7 | Planning (plan files) | Incoherent multi-step execution |

**The sequence is not arbitrary.** Skip to step 6 without step 2 and you'll debug the wrong thing.

```
./scripts/run-ship.sh "[Feature Name]" → PR opened
```

`run-ship.sh` is the hard-enforcement orchestrator. Gates cannot be bypassed:
- Gate 2: static checks from `VERIFY_COMMANDS` in config (exits 1 if any fail)
- Gate 3: dev log check — LOG VERDICT: CLEAN required (exits 1 if errors)
- Gate 4: E2E feature test — max 2 attempts (exits 1 if both fail, creates GH issue)
- Gate 5: P0 regressions — max 2 attempts (exits 1 if failing)
- Gate 6: `gh pr create` — PR is the output artifact

"Done" = all gates pass + PR open. Not "build succeeded", not "I think it works".

## Specialist agents (`.pi/agents/`)

Called via subagent tool with `agentScope: "project"`:

| Agent | Model | Job | Tools |
|-------|-------|-----|-------|
| `product-manager` | GLM-5.1 | PM interview → USVA spec | read |
| `architect` | GLM-5.1 | Implementation plan from USVA | read, grep, glob, find, bash |
| `implementer` | GLM-5 | Execute plan exactly | read, write, edit, bash, grep |
| `reviewer` | GLM-5.1 | Diff review — PASS or FAIL | read, grep, bash |
| `gate-skeptic` | GLM-5.1 | Adversarial readiness check — READY or NOT READY | read, bash |
| `adversarial-tester` | DeepSeek V4 Flash | Active red-team — edge cases, boundary attacks, RBAC probing — BROKEN or SURVIVED | read, bash, grep |
| `test-writer` | GLM-5 | Gherkin → E2E test | read, write, bash |
| `debug-agent` | GLM-5 | Fix exact gate failure | read, write, edit, bash, grep |
| `fixer` | GLM-5 | Triage + fix bugs without a GitHub issue | read, write, edit, bash, grep |
| `idea-capture` | MiniMax-M2.7 | Capture a raw idea as a GitHub issue | bash |
| `issue-creator` | MiniMax-M2.7 | Create GitHub issue for out-of-scope | bash |
| `learning-agent` | GLM-5.1 | Log session, promote patterns | read, write, edit, bash |
| `ceo` | GLM-5.1 | Autonomous CEO — plan, delegate, review | read, write, edit, bash, grep |
| `harness-evolver` | GLM-5.1 | Optimize harness from traces | read, grep, bash |
| `security-reviewer` | GLM-5.1 | Security audit — RBAC, auth, data exposure | read, grep, bash |
| `software-architect` | GLM-5.1 | System design, DDD, domain modeling | read, grep, glob, bash |
| `ui-reviewer` | GLM-5.1 | Frontend diff review — responsive, a11y | read, grep, bash |
| `database-optimizer` | GLM-5.1 | Schema design, query optimization | read, bash, grep, glob |
| `sre` | GLM-5.1 | SLOs, error budgets, reliability | read, bash, grep, glob |
| `knowledge-organizer` | GLM-5.1 | Obsidian notes, properties, MOCs | read, write, edit, grep, glob |
| `unit-test-writer` | GLM-5 | Convex unit/integration tests | read, write, edit, bash, grep |
| `researcher` | Perplexity Sonar | Quick web research | read, bash |
| `deep-researcher` | Perplexity Deep Research | Deep web research | read, bash |
| `reasoning-researcher` | DeepSeek R1 | Complex reasoning research | read, bash |
| `web-researcher` | DeepSeek R1 | Web research + Brave Search | read, bash |

The subagent extension (`.pi/extensions/subagent/`) is included and auto-discovered by pi. It provides the `subagent` tool that all orchestration depends on.

## Parallelism strategy

| Phase | Mode | What runs together |
|-------|------|--------------------|
| `/ship` Phase 0 | single | learning-agent (session-start) |
| `/ship` Phase 0.5 | single | **board deliberation** (optional — triggered by complexity or `--deliberate` flag) |
| `/ship` Phase 1 | single | product-manager (receives deliberation memo if Phase 0.5 ran) |
| `/ship` Phase 2 | single | architect (receives deliberation memo if Phase 0.5 ran) |
| `/ship` Phase 3+4 | **parallel** | test-writer + implementer |
| `/ship` Phase 5 | **chain** | reviewer → implementer → reviewer (fix loop) → adversarial-tester (red-team) → gate-skeptic (readiness) |
| `/ship` Phase 6 | deterministic | run-ship.sh gates |
| `/ship` Phase 7 | single | learning-agent (session-end) |
| `/fix` Phase 0 | **parallel** | learning-agent + issue reader |
| `/fix` Phase 3 | chain | reviewer → implementer (fix loop) |
| `/fix` Phase 5 | **parallel** | PR creation + learning-agent |

Use subagent `tasks` array for parallel, `chain` array for sequential-with-handoff.

## Board deliberation (`.pi/agents/board/`)

A structured multi-agent debate system for strategic and architectural decisions. 7 advisors with competing biases deliberate, then a CEO synthesizes a decision memo.

### Standalone: `/deliberate`

```bash
# With a prepared brief
/deliberate specs/briefs/2026-03-24-websocket-vs-sse/brief.md

# Ad-hoc question
/deliberate "Should we migrate from REST to GraphQL for the dashboard API?"
```

See `.pi/prompts/deliberate.md` for the full workflow.

### Integrated: `/ship` Phase 0.5

When `auto_deliberate.enabled: true` in `.pi/board-config.yaml`, the `/ship` workflow runs `scripts/should-deliberate.sh` before Phase 1. If complexity triggers fire, a board deliberation runs automatically and the resulting memo is injected as context for the product-manager and architect.

Force deliberation on any ship: `/ship --deliberate "Feature Name"`

### Board members

| Agent | Bias | Tension with |
|-------|------|-------------|
| `board/board-ceo` (GLM-5.1) | Leverage & coherence | Moderator — drives debate |
| `board/ship-fast` (GLM-5.1) | Speed & delivery | Architect, Tech Debt |
| `board/board-architect` (GLM-5.1) | Long-term design | Ship Fast, Moonshot |
| `board/security-advisor` (GLM-5.1) | Attack surface | Ship Fast, DX |
| `board/dx-advocate` (GLM-5.1) | Developer experience | Security, Architect |
| `board/board-moonshot` (GLM-5.1) | 10x simplification | Contrarian, Architect |
| `board/tech-debt-auditor` (GLM-5.1) | Sustainability | Ship Fast |
| `board/board-contrarian` (GLM-5.1) | Truth-seeking | Everyone (speaks last) |

### Board artifacts

| Path | Contents |
|------|----------|
| `.pi/board-config.yaml` | Meeting constraints, board roster, auto-deliberation triggers |
| `.pi/board-expertise/` | Persistent scratch pads per board member (updated across sessions) |
| `specs/briefs/` | Input briefs for deliberation |
| `specs/deliberations/` | Output decision memos |
| `scripts/validate-brief.sh` | Checks brief has required sections |
| `scripts/should-deliberate.sh` | Complexity analysis for auto-trigger |

### TUI Extension: `apps/board/`

For the full interactive board experience with live-streaming responses, budget/time gauges, and color-coded board status, launch the Pi extension:

```bash
cd apps/board && bun install && pi -e extensions/board.ts
# Then: /board-begin
```

## Agent Mental Models (`.pi/expertise/`)

Every specialist agent maintains a personal **mental model** — a YAML expertise file that grows over time. When an agent boots up, it reads its mental model. As it works, it updates it. Session after session, knowledge compounds.

```
.pi/expertise/
├── architect-mental-model.yaml
├── implementer-mental-model.yaml
├── reviewer-mental-model.yaml
├── test-writer-mental-model.yaml
├── product-manager-mental-model.yaml
├── debug-agent-mental-model.yaml
└── learning-agent-mental-model.yaml
```

**How it works:**
- Agents read their expertise file at the start of every task
- After completing work, agents update their mental model with learnings
- Files are structured YAML — architecture decisions, patterns, risks, observations
- 500-line limit per file, auto-trimmed by removing least critical entries
- See `.pi/skills/mental-model/SKILL.md` for full guidelines

**You don't touch these files.** The agents maintain them on their own.

## Domain Locking (`.pi/extensions/domain-enforcer/`)

Each agent has explicit **domain permissions** that control what files and directories they can read, write, and delete. This prevents agents from stepping on each other during parallel workflows.

The `domain-enforcer` extension hooks `tool_call` events and blocks violations. Set via `AGENT_DOMAIN_RULES` environment variable when spawning subagents.

Example domain rules:
```json
[
  {"path": ".pi/expertise/", "read": true, "upsert": true, "delete": false},
  {"path": "src/", "read": true, "upsert": true, "delete": true},
  {"path": ".", "read": true, "upsert": false, "delete": false}
]
```

**Principle:** Leads can read everything but write nothing (they delegate). Workers are locked to their domain.

## Team Orchestration (enabled by default)

Team-based 3-layer hierarchy is the default execution model:

```
CEO / /ship → Team Leads → Workers
```

| Team | Lead | Workers | Domain | Hard Rules |
|------|------|---------|--------|-----------|
| frontend | `frontend-lead` | implementer, ui-reviewer, test-writer, unit-test-writer | $FRONTEND_DIR | no-inline-styles, no-any |
| backend | `backend-lead` | implementer, database-optimizer, sre, unit-test-writer | $BACKEND_DIR, $SCHEMA_DIR | no-any, explicit-return-types |
| validation | `validation-lead` | reviewer, security-reviewer, adversarial-tester, gate-skeptic | read-only | none |

**Auto-activation in `/ship`**: Phase 2.5 detects domains touched. Activates teams when frontend + backend + schema all touched (3+ domains).

**In `/ceo`**: Tasks routed to team leads using `TEAM_*_CONSULT_WHEN` hints from config.sh for intelligent task-to-team matching.

**Legacy mode**: Set `TEAMS_ENABLED=false` in `.pi/config.sh` to revert to flat agent delegation (CEO directly coordinates workers).

## Session Management & Conversation Awareness

Agents share a conversation log during multi-agent workflows for coordination:

```bash
./scripts/session.sh new "feature-auth"    # Create new session
./scripts/session.sh current               # Show active session
FROM=architect TYPE=agent ./scripts/session.sh log "Planned 3-file change for auth"
./scripts/session.sh archive               # Archive when done
./scripts/session.sh list                  # List all sessions
```

Session directory:
```
.pi/sessions/current/
├── conversation.jsonl     # Shared log — all agents read/write
└── artifacts/             # Session-specific outputs
```

The `active-listener` skill makes agents read the last N entries before responding. The `conversational-response` skill keeps responses concise (chat-style) and pushes detail to files.

## Composable Agent Skills

New skills adapted from [lead-agents](https://agenticengineer.com/tactical-agentic-coding/):

| Skill | For | Purpose |
|-------|-----|---------|
| `mental-model` | All agents | Read/update personal expertise YAML files |
| `zero-micro-management` | Leads, orchestrator | Never execute directly — always delegate |
| `precise-worker` | Workers (implementer, test-writer) | Execute exactly what was asked, no scope creep |
| `high-autonomy` | Orchestrator, leads | Act decisively, zero clarifying questions |
| `active-listener` | All agents in multi-agent flows | Read conversation log before every response |
| `conversational-response` | All agents in multi-agent flows | Concise chat-style responses, detail in files |
| `output-enforcement` | All agents | Ban truncation patterns, enforce complete output |

## Terminal Automation (`.pi/skills/drive/`)

Drive gives agents full programmatic control over tmux sessions — creating terminals, running commands, reading output, taking screenshots, and orchestrating parallel workloads.

```bash
# Setup
brew install tmux
cd .pi/skills/drive/app && uv sync

# Usage
drive session create worker-1 --json          # Create tmux session
drive run worker-1 "npm test" --json           # Run command and wait
drive logs worker-1 --json                     # Read terminal output
drive screenshot worker-1 --json               # Capture terminal screenshot
drive poll worker-1 "PASS\|FAIL" --json        # Wait for pattern
drive fanout "npm test" s1 s2 s3 --json        # Parallel execution
```

See `.pi/skills/drive/SKILL.md` for the full command reference.

## Self-learning loop

1. **Act**: agents work during `/ship` or `/fix`
2. **Learn**: `learning-agent` logs to `.learnings/LEARNINGS.md` at session end
3. **Reuse**: `learning-agent` retrieves learnings at session start, injects into agents
4. **Promote**: at 3 recurrences, rules auto-written to skill files

## Context engineering

Each agent receives only what it needs:
```bash
./scripts/build-context.sh <agent> <feature-slug> [usva-path]
```

## Configuration

All project-specific values live in `.pi/config.sh`. Edit that file — not the agents or scripts.

## Adding domain skills

Create `.pi/skills/your-domain/SKILL.md` with patterns specific to your project. The learning-agent will auto-promote recurring patterns there.

## Available MCP Tools

Model Context Protocol (MCP) tools extend agent capabilities with external APIs.

### Prerequisites

Add to `~/.zshrc` or `~/.bashrc`:
```bash
export GITHUB_TOKEN=$(gh auth token)  # or: ghp_xxx...
export BRAVE_API_KEY=BSxxx...         # from https://api.search.brave.com/app/keys
```

### GitHub MCP

Browse issues, PRs, and repositories.

```bash
./.pi/tools/github.sh list-issues <owner> <repo> [state]     # List issues
./.pi/tools/github.sh get-issue <owner> <repo> <number>      # Get issue details
./.pi/tools/github.sh search-issues <query>                  # Search issues
./.pi/tools/github.sh list-prs <owner> <repo> [state]        # List PRs
./.pi/tools/github.sh get-pr <owner> <repo> <number>         # Get PR details
```

**Example:**
```bash
./.pi/tools/github.sh list-issues bobbiejaxn pi_launchpad open
```

### Web Search (Brave)

Search the web for current information.

```bash
./.pi/tools/web-search.sh "search query" [count]
```

**Example:**
```bash
./.pi/tools/web-search.sh "latest MCP server best practices" 5
```

### Context7 Documentation

Query up-to-date code documentation and examples from Context7.

```bash
# Step 1: Find the library ID
./.pi/tools/context7.sh resolve <library-name> "<query>"

# Step 2: Query documentation
./.pi/tools/context7.sh query <library-id> "<question>"
```

**Examples:**
```bash
./.pi/tools/context7.sh resolve react "how to use hooks"
./.pi/tools/context7.sh query "/facebook/react" "useEffect cleanup examples"
./.pi/tools/context7.sh query "/vercel/next.js" "app router with prisma"
```

**Workflow:**
1. Use `resolve` to find the library ID (e.g., `/facebook/react`)
2. Use `query` with that ID to ask specific questions

### Adding New MCP Servers

To add a new MCP server, load the skill and follow the 7-step workflow:

```bash
# Read the skill first
read .pi/skills/mcp-wrapper/SKILL.md

# Then say: "add <server-name> MCP server"
```

The skill will autonomously:
1. **CHOOSE** — Identify the npm package and credentials
2. **INSTALL** — Verify npx availability
3. **CONFIGURE** — Guide credential setup
4. **TEST** — Verify standalone operation
5. **WRAP** — Create `.pi/tools/<server>.sh`
6. **DOCUMENT** — Update AGENTS.md
7. **VERIFY** — End-to-end test

## Meta-Harness: Self-Optimizing Harness

The harness (agent prompts, skills, context rules, model selections) automatically improves itself by observing execution traces and proposing targeted changes. Based on the [Meta-Harness paper](https://yoonholee.com/meta-harness/) (Lee et al. 2026, Stanford).

### Architecture

```
Layer 1: Trace Recorder    .pi/extensions/trace-recorder/  — captures every agent call
Layer 2: Trace Filesystem   .pi/traces/                     — structured JSONL logs
Layer 3: Harness Evolver    .pi/agents/harness-evolver.md   — proposes improvements
Layer 4: Harness Versioning .pi/harness-versions/           — snapshot, rollback, compare
```

### Commands

```bash
# Traces
./scripts/trace-index.sh rebuild         # Rebuild index from all runs
./scripts/trace-index.sh summary         # Overview of all traced runs
./scripts/trace-index.sh failures        # Show runs with errors
./scripts/trace-index.sh costly          # Most expensive runs
./scripts/trace-index.sh agent <name>    # All traces for an agent

# Evolve
./scripts/evolve-harness.sh              # General optimization pass
./scripts/evolve-harness.sh cost         # Focus on cost reduction
./scripts/evolve-harness.sh gates        # Focus on gate pass rate
./scripts/evolve-harness.sh speed        # Focus on execution speed
./scripts/evolve-harness.sh <run-id>     # Diagnose specific run
/evolve                                  # Prompt template

# Versioning
./scripts/harness-version.sh snapshot    # Save current harness state
./scripts/harness-version.sh rollback    # Revert to previous version
./scripts/harness-version.sh list        # List all versions
./scripts/harness-version.sh compare v1 v2  # Diff two versions
./scripts/harness-version.sh export      # Export current config

# Report
./scripts/harness-report.sh              # Full performance dashboard
./scripts/harness-report.sh brief        # One-line summary
```

### How traces are recorded

The trace recorder extension runs silently during all agent sessions. Set these env vars when spawning subagents to enable tracing:

```bash
TRACE_RUN_ID="20260324-ship-auth"    # Unique run identifier
TRACE_AGENT_NAME="implementer"        # Which agent
TRACE_PHASE="ship.implement"          # Workflow phase
```

Traces are written to `.pi/traces/runs/<run-id>/<agent>.jsonl` — one line per event (tool call, result, message, error). The evolver reads these with `grep` and `cat` to diagnose failures.

### Evolution loop

```
You work normally (/ship, /fix)
    ↓
Trace recorder captures everything
    ↓
/evolve (or automatic after N runs)
    ↓
Evolver reads traces, diagnoses failures
    ↓
Proposes ONE targeted change
    ↓
Applies change + snapshots harness version
    ↓
Next run is measurably better (or reverted)
```

See `docs/meta-harness-implementation.md` for the full architectural plan.

---

## Live Verifier Agent System

A two-agent observer system that runs alongside the builder in real-time. The verifier watches the builder's session transcript via a unix domain socket, independently re-checks every claim using deterministic read-only tools, and sends corrective feedback back to the builder automatically.

### Architecture

```
Builder (your terminal)          Verifier (separate window)
  ┌─────────────────┐              ┌─────────────────┐
  │ pi (writes code) │◄──unix──────►│ pi (reads only)  │
  │ socket server    │   socket     │ bash=script-only │
  │ lifecycle ticks  │              │ verifier_prompt  │
  └────────┬─────────┘              └──────────────────┘
           │ writes session.jsonl    reads ──────────────┘
           ▼
   ~/.pi/agent/sessions/<sid>.jsonl
```

### Security — 3-layer read-only enforcement

1. **Persona tools list** — no `write`, no `edit` in the verifier's tool allowlist
2. **Bash policy override** — `mode: script-only`, only the domain verification script can run
3. **Script itself** — SQLite opened `mode=ro&immutable=1`, Python runs `ruff --check` not `ruff`

### Launch commands

```bash
./scripts/launch-verifier.sh                  # Generic verifier
./scripts/launch-verifier.sh --agent sqlite   # SQLite domain
./scripts/launch-verifier.sh --agent python   # Python domain
./scripts/launch-verifier.sh --agent image    # Image vision verifier
./scripts/launch-verifier.sh --clean          # Kill stale processes
```

### Domain verifiers

| Persona | Bash policy | What it verifies |
|---------|-------------|-----------------|
| `verify_sqlite` | `script-only` → `verify_sqlite.py` | Schemas, FKs, indexes, integrity, migrations |
| `verify_python` | `script-only` → `verify_python.py` | Type-check (`uvx ty`), lint (`ruff`), format, `pytest` |
| `verify_image` | None (vision-only) | Generated images match user's prompt |
| `verifier` (generic) | Default bash | Claim decomposition, general verification |

### Integration with /ship

- **Phase 5.5.5** — Optional live verifier for critical features
- Does not block the pipeline — runs alongside, supplements adversarial-tester
- Findings auto-correct up to 3 loops, then escalate to human

### File locations

```
apps/verifier/               Pi extension (verifiable.ts, verifier.ts, cross-agent.ts)
  _shared/                  IPC, launcher, socket-path, frontmatter, env
.pi/verifier/
  agents/                   4 domain persona .md files
  scripts/                  verify_sqlite.py, verify_python.py
  prompts/                  verify_on_stop.md, builder_error.md
scripts/launch-verifier.sh   Boot script
```

### Authoring new domain verifiers

1. Clone `.pi/verifier/scripts/verify_sqlite.py` → `verify_<domain>.py`
2. Clone `.pi/verifier/agents/verify_sqlite.md` → `verify_<domain>.md`
3. Update frontmatter: `bash_policy`, `verification_focus`, `domain`
4. Wire into `launch-verifier.sh --agent <domain>`

## Agentic Horizon — Multi-Team System

pi_launchpad integrates the [Agentic Horizon](https://agenticengineer.com/tactical-agentic-coding) trilogy for multi-team agent orchestration and infinite UI generation.

### Repos

| Repo | Location | Purpose |
|------|----------|----------|
| `lead-agents` | `~/Projects/lead-agents` | Multi-Team Chat runtime (`teams` command) |
| `ceo-agents` | `~/Projects/ceo-agents` | CEO + Board strategic deliberation |
| `ui-agents` | `~/Projects/ui-agents` | Infinite brand-consistent UI generation |

### Prerequisites

- `teams` shell function installed (in `~/.zshrc`) — comes from lead-agents `/install`
- `ANTHROPIC_API_KEY` set in lead-agents `.env`
- Bun + just + uv installed

### Commands

| Command | What it does |
|---------|-------------|
| `just team` | Launch multi-team chat (default Planning+Engineering+Validation teams) |
| `just team-ui` | Launch multi-team chat with UI generation teams |
| `just teamc <path>` | Launch with a custom team config |
| `just ceo` | Launch CEO + Board deliberation |
| `just ui-dev` | Start the UI Agents Vue app (port 5173) |

### Team Configs

Two team configs are deployed in `.pi/multi-team/`:

| Config | Teams | Use for |
|--------|-------|----------|
| `multi-team-config.yaml` | Planning + Engineering + Validation (default) | General coding tasks |
| `configs/ui-agents-config.yaml` | Setup + Brand + UI Gen ×3 + Validation ×3 | UI generation |

### How it connects to pi_launchpad

The multi-team system runs **alongside** pi_launchpad's own agents:

- **pi_launchpad agents** (`.pi/agents/`) — use the `subagent` tool, work within pi sessions
- **Multi-team agents** (`.pi/multi-team/agents/`) — use the `delegate` tool, run via `teams` command

Both share:
- Mental models (`.pi/multi-team/expertise/` + `.pi/expertise/`)
- Learnings (`.learnings/`)
- Project context (AGENTS.md, schemas, specs)

### Workflow: Generate UI for a pi_launchpad project

```bash
# 1. Start the multi-team system
just team-ui

# 2. Create a brand
/new-brand mybrand "A modern SaaS brand"

# 3. Generate UI components
/generate mybrand myproduct landing 3 "Hero sections with bold typography"

# 4. Start the Vue app to browse
just ui-dev
```

### Workflow: Board deliberation for architecture decisions

```bash
just ceo
# Then: /deliberate "Should we migrate from REST to GraphQL?"
```

---

## Rule source of truth

`AGENTS.md` (this file). Skills point to it, never restate. When rules conflict, AGENTS.md wins.
