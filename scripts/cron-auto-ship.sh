#!/usr/bin/env bash
# cron-auto-ship.sh
# Fetches ONE issue labeled 'spec-approved', runs the full /ship workflow
# (PM spec confirmed → architect → implementer + tests → reviewer → gates → PR),
# then labels the issue 'shipped'.
#
# Runs nightly (e.g. 10pm — 1h after spec-writer).
# One issue per run — ship is slow and needs full attention.

set -euo pipefail

# ── Paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load project config
source "$PROJECT_DIR/.pi/config.sh"

LOG_DIR="$PROJECT_DIR/logs/cron"
LOG_FILE="$LOG_DIR/auto-ship-$(date +%Y%m%d-%H%M%S).log"

# Resolve binaries — prefer config, fall back to PATH
PI_BIN="${PI_BIN:-$(command -v pi)}"
GH_BIN="${GH_BIN:-$(command -v gh)}"

# ── Setup ─────────────────────────────────────────────────────────────────────
mkdir -p "$LOG_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

log "════════════════════════════════════════"
log "  AUTO-SHIP CRON — $(date)"
log "════════════════════════════════════════"

cd "$PROJECT_DIR"

# ── Cleanup trap: on any exit, return to main + remove in-progress label ──────
TRAPPED_ISSUE=""
cleanup() {
  local EXIT_CODE=$?
  if [ $EXIT_CODE -ne 0 ] && [ -n "$TRAPPED_ISSUE" ]; then
    log "Cleanup trap: removing in-progress label from #$TRAPPED_ISSUE"
    "$GH_BIN" issue edit "$TRAPPED_ISSUE" --repo "$REPO" --remove-label "in-progress" 2>/dev/null || true
  fi
  # Always return to main with a clean tree for the next run
  if [ "$(git rev-parse --abbrev-ref HEAD 2>/dev/null)" != "main" ]; then
    git checkout main 2>/dev/null || true
  fi
  if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
    git add .learnings/ 2>/dev/null && git commit -m "chore: learnings cleanup on exit" 2>/dev/null || true
    git stash 2>/dev/null || true
  fi
}
trap cleanup EXIT

# ── Recovery: always land on main with a clean tree ───────────────────────────
recover_clean_state() {
  log "Recovering clean state..."

  # 1. If on a feature branch, commit any learnings then return to main
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
  if [ "$CURRENT_BRANCH" != "main" ]; then
    log "On branch '$CURRENT_BRANCH' — returning to main"

    # Commit .learnings if dirty (safe, never breaks anything)
    if ! git diff --quiet -- .learnings/ || ! git diff --cached --quiet -- .learnings/; then
      git add .learnings/ 2>/dev/null || true
      git commit -m "chore: learnings from previous auto-ship session" 2>/dev/null || true
      log "Committed dirty learnings on feature branch"
    fi

    git checkout main 2>/dev/null || { log "ERROR: could not checkout main"; exit 1; }
  fi

  # 2. On main — handle any remaining dirty files
  if ! git diff --quiet || ! git diff --cached --quiet; then
    # Commit .learnings if that's all that's dirty
    DIRTY_FILES=$(git diff --name-only; git diff --cached --name-only)
    ONLY_LEARNINGS=$(echo "$DIRTY_FILES" | grep -v "^\.learnings/" | wc -l | tr -d ' ')

    if [ "$ONLY_LEARNINGS" -eq 0 ]; then
      git add .learnings/
      git commit -m "chore: learnings from previous auto-ship session"
      log "Committed dirty learnings on main — tree now clean"
    else
      # Unknown dirty files — stash to preserve work, don't abort
      log "Stashing uncommitted changes to clean working tree..."
      git stash push -m "auto-ship-cron stash $(date +%Y%m%d-%H%M%S)"
      log "Stashed. Will pop on exit if ship fails."
    fi
  fi

  # 3. Verify clean
  if ! git diff --quiet || ! git diff --cached --quiet; then
    log "ERROR: Could not recover clean state. git status:"
    git status
    exit 1
  fi

  log "Clean state confirmed on branch: $(git rev-parse --abbrev-ref HEAD)"
}

recover_clean_state

# ── Loop: ship all spec-approved issues in queue ───────────────────────────────
SHIPPED_COUNT=0
EXIT_CODE=0  # initialise so cleanup trap never sees unbound variable

while true; do
  log "Fetching next issue labeled 'spec-approved'..."

  ISSUE_NUMBER=$("$GH_BIN" issue list \
    --repo "$REPO" \
    --label spec-approved \
    --state open \
    --json number,labels \
    --limit 1 \
    --jq '[.[] | select(
      (.labels | map(.name) | contains(["in-progress"]) | not) and
      (.labels | map(.name) | contains(["shipped"]) | not) and
      (.labels | map(.name) | contains(["spec-hold"]) | not)
    ) | .number] | first // empty' 2>&1)

  if [ -z "$ISSUE_NUMBER" ]; then
    log "No more spec-approved issues in queue. Done. (Shipped: $SHIPPED_COUNT)"
    break
  fi

  log "Found issue #$ISSUE_NUMBER — starting ship workflow"
  TRAPPED_ISSUE="$ISSUE_NUMBER"

  # Mark in-progress immediately so concurrent runs don't double-pick
  "$GH_BIN" issue edit "$ISSUE_NUMBER" --repo "$REPO" --add-label "in-progress" 2>&1 || true

  # ── Load learnings context ──────────────────────────────────────────────────
  LEARNINGS_FILE="$PROJECT_DIR/.learnings/LEARNINGS.md"
  if [ -f "$LEARNINGS_FILE" ]; then
    LEARNINGS_SNIPPET=$(tail -80 "$LEARNINGS_FILE")
  else
    LEARNINGS_SNIPPET="No learnings file found."
  fi

  # ── Fetch issue + spec ──────────────────────────────────────────────────────
  ISSUE_CONTENT=$("$GH_BIN" issue view "$ISSUE_NUMBER" --repo "$REPO" \
    --json number,title,body --jq '"#\(.number) \(.title)\n\n\(.body)"' 2>&1)

  ISSUE_TITLE=$("$GH_BIN" issue view "$ISSUE_NUMBER" --repo "$REPO" \
    --json title --jq '.title' 2>&1)

  # Derive slug from title (strip prefix, kebab-case)
  FEATURE_SLUG=$(echo "$ISSUE_TITLE" \
    | sed 's/^feat: //;s/^fix: //;s/^refactor: //;s/^chore: //' \
    | tr '[:upper:]' '[:lower:]' \
    | sed 's/[^a-z0-9]/-/g;s/--*/-/g;s/^-//;s/-$//' \
    | cut -c1-50)

  log "Issue: $ISSUE_TITLE"
  log "Slug:  $FEATURE_SLUG"

  # ── Ship model (configurable via config.sh) ─────────────────────────────────
  SHIP_PROVIDER="${CRON_SHIP_PROVIDER:-anthropic}"
  SHIP_MODEL="${CRON_SHIP_MODEL:-claude-sonnet-4-5}"

  # ── Run the ship workflow via pi --print ────────────────────────────────────
  log "Launching pi orchestrator..."

  "$PI_BIN" --print --no-session \
    --provider "$SHIP_PROVIDER" \
    --model "$SHIP_MODEL" \
    --cwd "$PROJECT_DIR" \
    "$(cat <<PI_PROMPT
You are the ship orchestrator for the ${PROJECT_NAME} codebase at $PROJECT_DIR.

Your job: execute the full ship workflow for GitHub issue #$ISSUE_NUMBER end-to-end.
'Done' is defined by run-ship.sh passing all gates — not by you.

## Issue
$ISSUE_CONTENT

## Feature slug
$FEATURE_SLUG

## Injected learnings (apply to every specialist agent)
$LEARNINGS_SNIPPET

## Critical active warnings
- Schema migrations: new fields on populated tables MUST be optional first
- No .filter() after .withIndex() — use compound indexes
- Test files: zero any, zero eslint-disable — use as unknown as T patterns
- git stash + verify clean tree BEFORE running run-ship.sh

---

## Workflow to execute

### Phase 1 — Read the confirmed USVA spec
Run bash to find the spec: find specs/usva -name '*${FEATURE_SLUG}*' 2>/dev/null
If found, read it. If not found, use the issue content directly as the spec.
USVA spec path (likely): specs/usva/${FEATURE_SLUG}.usva.md

### Phase 2 — Architect
Use the subagent tool:
- agent: architect
- agentScope: project
- confirmProjectAgents: false
- cwd: $PROJECT_DIR
- task: Read the confirmed USVA spec and produce a complete implementation plan. USVA spec path: specs/usva/${FEATURE_SLUG}.usva.md. Feature slug: ${FEATURE_SLUG}. Run: ./scripts/build-context.sh architect "${FEATURE_SLUG}" "specs/usva/${FEATURE_SLUG}.usva.md". Learnings to apply: $LEARNINGS_SNIPPET

### Phase 3+4 — Test writer + Implementer (PARALLEL)
Use the subagent tool in parallel mode (tasks array):

1. agent: unit-test-writer
   task: Write fully typed unit tests for ${FEATURE_SLUG}. USVA spec: specs/usva/${FEATURE_SLUG}.usva.md. Zero any. Zero eslint-disable. Use as unknown as T patterns. Paste architect plan + learnings.

2. agent: implementer
   task: Execute the implementation plan exactly. USVA spec: specs/usva/${FEATURE_SLUG}.usva.md. Feature slug: ${FEATURE_SLUG}. Run: ./scripts/build-context.sh implementer "${FEATURE_SLUG}". Paste full architect plan and learnings.

### Phase 4.5 — UI Review (frontend changes only)
Check if the diff contains any frontend file changes:
Run bash: git diff main...HEAD --name-only | grep -E '\.tsx$|\.css$' | head -5

If frontend files changed, use the subagent tool:
- agent: ui-reviewer
- agentScope: project
- confirmProjectAgents: false
- task: Review this frontend diff for UI quality, responsive design, mobile UX, and design system compliance. Feature slug: ${FEATURE_SLUG}. Run: ./scripts/build-context.sh reviewer "${FEATURE_SLUG}"

If ui-reviewer returns UI FAIL, delegate fixes back to implementer with the specific findings, then re-run ui-reviewer. Max 2 rounds.
If no frontend files changed, skip this phase.

### Phase 5 — Reviewer loop (max 3 rounds)
Use the subagent tool in chain mode: reviewer then implementer (if FAIL) then reviewer again.
Stop when reviewer returns PASS.
reviewer task: Review the diff against project rules. Return PASS or FAIL. Feature slug: ${FEATURE_SLUG}. Run: ./scripts/build-context.sh reviewer "${FEATURE_SLUG}". Learnings: $LEARNINGS_SNIPPET

### Phase 6 — Run the gates
BEFORE running gates:
1. Commit all changes: git add -A && git commit -m "feat: [feature name] — closes #${ISSUE_NUMBER}"
2. Stash check: git stash then git stash pop if nothing to stash
3. Verify: git status must be clean except untracked
4. Run: ./scripts/run-ship.sh "${ISSUE_TITLE}"

If a gate fails, delegate to debug-agent:
- agent: debug-agent
- task: Fix gate failure. Gate: [N] — [name]. Failure: [paste output]. Feature slug: ${FEATURE_SLUG}. Run: ./scripts/build-context.sh debug-agent "${FEATURE_SLUG}"
Max 2 debug attempts per gate.

### Phase 7 — Label shipped
After PR is opened successfully, run bash:
${GH_BIN} issue edit ${ISSUE_NUMBER} --repo ${REPO} --add-label shipped --remove-label in-progress --remove-label spec-approved
${GH_BIN} issue close ${ISSUE_NUMBER} --repo ${REPO} --reason completed

### Phase 8 — Capture out-of-scope ideas
During implementation, the architect, implementer, and reviewer may surface ideas, edge cases, or adjacent improvements that are out of scope for this issue. Capture each one as a GitHub issue and label it backlog so it enters the next cron cycle.

For each idea, run bash using ./scripts/create-issue.sh with flags: --type enhancement, --found-during set to the current issue title and number, plus --location, --symptom, --context, --affects. All flag values must be shell-quoted strings. After creating each issue, immediately run: ${GH_BIN} issue edit [new-number] --repo ${REPO} --add-label backlog

If no ideas surfaced, skip this phase.

### Phase 9 — Log learnings
Use the subagent tool:
- agent: learning-agent
- agentScope: project
- confirmProjectAgents: false
- task: Mode: session-end. Log this cron-auto-ship session. Feature: ${ISSUE_TITLE} (#${ISSUE_NUMBER}). Run via: cron-auto-ship.sh

### Final report
Print a summary:
- Issue: #${ISSUE_NUMBER} — ${ISSUE_TITLE}
- PR: [URL]
- Gates: all passed / [which failed + fixed]
- Status: SHIPPED or FAILED

Important: use confirmProjectAgents: false in ALL subagent calls.
Do not ask for confirmation at any step — run autonomously to completion.
PI_PROMPT
  )" 2>&1

  EXIT_CODE=$?

  if [ $EXIT_CODE -eq 0 ]; then
    log "Issue #$ISSUE_NUMBER shipped successfully"
    SHIPPED_COUNT=$((SHIPPED_COUNT + 1))
  else
    log "Issue #$ISSUE_NUMBER — pi exited with code $EXIT_CODE"
    "$GH_BIN" issue edit "$ISSUE_NUMBER" --repo "$REPO" --remove-label "in-progress" 2>&1 || true
    log "Removed in-progress label — issue will retry on next run"
  fi

  TRAPPED_ISSUE=""

  # Reset clean state between issues before fetching the next one
  recover_clean_state

done  # ── end queue loop

log "════════════════════════════════════════"
log "  AUTO-SHIP CRON COMPLETE — Shipped: $SHIPPED_COUNT"
log "════════════════════════════════════════"

exit $EXIT_CODE
