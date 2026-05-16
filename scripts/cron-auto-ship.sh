#!/usr/bin/env bash
# cron-auto-ship.sh
# Fetches ONE issue labeled 'spec-approved', runs the full /ship workflow
# (spec confirmed -> architect -> implementer + tests -> reviewer -> gates -> PR),
# then labels the issue 'shipped'.
#
# Runs nightly (e.g. 10pm -- 1h after spec-writer).
# One issue per run -- ship is slow and needs full attention.

set -euo pipefail

# ── Bash security for cron agents ───────────────────────────────────────
# Cron agents need bash access (to read files, git commit, gh comment).
# Set to log mode — allows bash but logs every call.
# Do NOT use block mode — it hangs the orchestrator on every bash call.
export NO_BASH_MODE="log"
export BASH_WHITELIST_MODE="log"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# Auto-detect project root (works from any nesting level)
PROJECT_DIR="$(cd "$SCRIPT_DIR" && while [ "$(pwd)" != "/" ]; do [ -f ".pi/config.sh" ] && pwd && break; cd ..; done)"

# Load project config
CONFIG_FILE="$PROJECT_DIR/.pi/config.sh"
if [ ! -f "$CONFIG_FILE" ]; then
  echo "ERROR: No .pi/config.sh found. Run setup first."
  exit 1
fi
# shellcheck source=/dev/null
source "$CONFIG_FILE"

# Auto-detect default branch (works for both main and master repos)
DEFAULT_BRANCH="$(cd "$PROJECT_DIR" && git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || git remote show origin 2>/dev/null | grep 'HEAD branch' | awk '{print $NF}' || echo main)"

LOG_DIR="$PROJECT_DIR/logs/cron"
LOG_FILE="$LOG_DIR/auto-ship-$(date +%Y%m%d-%H%M%S).log"

# Resolve binaries
PI_BIN="${PI_BIN:-$(command -v pi || echo "pi")}"
GH_BIN="${GH_BIN:-$(command -v gh)}"

# -- Setup ─────────────────────────────────────────────────────────────────────
mkdir -p "$LOG_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

log "========================================"
log "  AUTO-SHIP CRON -- $(date)"
log "========================================"

cd "$PROJECT_DIR"

# -- Cleanup trap ──────────────────────────────────────────────────────────────
TRAPPED_ISSUE=""
EXIT_CODE=0
cleanup() {
  local CODE=$?
  if [ $CODE -ne 0 ] && [ -n "$TRAPPED_ISSUE" ]; then
    log "Cleanup trap: removing in-progress label from #$TRAPPED_ISSUE"
    "$GH_BIN" issue edit "$TRAPPED_ISSUE" --repo "$REPO" --remove-label "in-progress" 2>/dev/null || true
  fi
  if [ "$(git rev-parse --abbrev-ref HEAD 2>/dev/null)" != "$DEFAULT_BRANCH" ]; then
    git checkout "$DEFAULT_BRANCH" 2>/dev/null || true
  fi
  if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
    git add .learnings/ 2>/dev/null && git commit -m "chore: learnings cleanup on exit" 2>/dev/null || true
    git stash 2>/dev/null || true
  fi
}
trap cleanup EXIT

# -- Recovery: always land on $DEFAULT_BRANCH with a clean tree ───────────────────────────
recover_clean_state() {
  log "Recovering clean state..."

  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
  if [ "$CURRENT_BRANCH" != "$DEFAULT_BRANCH" ]; then
    log "On branch '$CURRENT_BRANCH' -- returning to $DEFAULT_BRANCH"
    if ! git diff --quiet -- .learnings/ || ! git diff --cached --quiet -- .learnings/; then
      git add .learnings/ 2>/dev/null || true
      git commit -m "chore: learnings from previous auto-ship session" 2>/dev/null || true
      log "Committed dirty learnings on feature branch"
    fi
    git checkout "$DEFAULT_BRANCH" 2>/dev/null || { log "ERROR: could not checkout $DEFAULT_BRANCH"; exit 1; }
  fi

  if ! git diff --quiet || ! git diff --cached --quiet; then
    DIRTY_FILES=$(git diff --name-only; git diff --cached --name-only)
    ONLY_LEARNINGS=$(echo "$DIRTY_FILES" | grep -v "^\.learnings/" | wc -l | tr -d ' ')

    if [ "$ONLY_LEARNINGS" -eq 0 ]; then
      git add .learnings/
      git commit -m "chore: learnings from previous auto-ship session"
      log "Committed dirty learnings on $DEFAULT_BRANCH -- tree now clean"
    else
      log "Stashing uncommitted changes to clean working tree..."
      git stash push -m "auto-ship-cron stash $(date +%Y%m%d-%H%M%S)"
      log "Stashed. Will pop on exit if ship fails."
    fi
  fi

  if ! git diff --quiet || ! git diff --cached --quiet; then
    log "ERROR: Could not recover clean state. git status:"
    git status
    exit 1
  fi

  log "Clean state confirmed on branch: $(git rev-parse --abbrev-ref HEAD)"
}

recover_clean_state

# -- Loop: ship all spec-approved issues in queue ───────────────────────────────
SHIPPED_COUNT=0

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

  log "Found issue #$ISSUE_NUMBER -- starting ship workflow"
  TRAPPED_ISSUE="$ISSUE_NUMBER"

  "$GH_BIN" issue edit "$ISSUE_NUMBER" --repo "$REPO" --add-label "in-progress" 2>&1 || true

  # -- Load learnings context ──────────────────────────────────────────────────
  LEARNINGS_FILE="$PROJECT_DIR/.learnings/LEARNINGS.md"
  if [ -f "$LEARNINGS_FILE" ]; then
    LEARNINGS_SNIPPET=$(tail -80 "$LEARNINGS_FILE")
  else
    LEARNINGS_SNIPPET="No learnings file found."
  fi

  # -- Fetch issue + spec ──────────────────────────────────────────────────────
  ISSUE_CONTENT=$("$GH_BIN" issue view "$ISSUE_NUMBER" --repo "$REPO" \
    --json number,title,body --jq '"#\(.number) \(.title)\n\n\(.body)"' 2>&1)

  ISSUE_TITLE=$("$GH_BIN" issue view "$ISSUE_NUMBER" --repo "$REPO" \
    --json title --jq '.title' 2>&1)

  FEATURE_SLUG=$(echo "$ISSUE_TITLE" \
    | sed 's/^feat: //;s/^fix: //;s/^refactor: //;s/^chore: //' \
    | tr '[:upper:]' '[:lower:]' \
    | sed 's/[^a-z0-9]/-/g;s/--*/-/g;s/^-//;s/-$//' \
    | cut -c1-50)

  log "Issue: $ISSUE_TITLE"
  log "Slug:  $FEATURE_SLUG"

  # -- Run the ship workflow via pi -p ─────────────────────────────────────────
  log "Launching pi ship orchestrator..."

  "$PI_BIN" -p "You are the ship orchestrator for the ${PROJECT_NAME} codebase at $PROJECT_DIR.

Your job: execute the full ship workflow for GitHub issue #$ISSUE_NUMBER end-to-end.
'Done' is defined by run-ship.sh passing all gates -- not by you.

## Issue
$ISSUE_CONTENT

## Feature slug
$FEATURE_SLUG

## Injected learnings (apply to every step)
$LEARNINGS_SNIPPET

## Critical active warnings
- Schema migrations: new fields on populated tables MUST be optional first
- Test files: zero any, zero eslint-disable -- use as unknown as T patterns
- git stash + verify clean tree BEFORE running run-ship.sh

---

## Workflow to execute

### Phase 1 -- Read the confirmed USVA spec
Run bash to find the spec: find specs/usva -name '*${FEATURE_SLUG}*' 2>/dev/null
If found, read it. If not found, use the issue content directly as the spec.

### Phase 2 -- Architecture
Use the subagent tool to delegate to the architect agent:
- Task: Read the confirmed USVA spec and produce a complete implementation plan.
- Include: USVA spec path, feature slug, learnings context.

### Phase 3+4 -- Test writer + Implementer (PARALLEL)
Use parallel subagent calls:
1. test-writer: Write E2E tests from the USVA spec.
2. implementer: Execute the implementation plan exactly.

### Phase 4.5 -- UI Review (frontend changes only)
Check if the diff contains frontend file changes. If yes, delegate to ui-reviewer.

### Phase 5 -- Reviewer loop (max 3 rounds)
Chain: reviewer -> implementer (if FAIL) -> reviewer again. Stop when PASS.

### Phase 5.5 -- Security review
Delegate to security-reviewer for auth, RBAC, data exposure checks.

Additionally, run the security gate script:
  Run bash: ./scripts/security-gate.sh
If on local (Claude available), also run the Claude oracle security review:
  Run bash: source ./scripts/claude-oracle.sh && claude_oracle_security_review
The oracle is budget-tracked and only runs if available.

### Phase 6 -- Run the gates
BEFORE running gates:
1. Commit all changes: git add -A && git commit -m \"feat: [feature name] -- closes #${ISSUE_NUMBER}\"
2. Stash check: git stash then git stash pop if nothing to stash
3. Verify: git status must be clean except untracked
4. Run: ./scripts/run-ship.sh \"${ISSUE_TITLE}\"
5. Run: ./scripts/security-gate.sh

If a gate fails, delegate to debug-agent. Max 2 debug attempts per gate.

### Phase 7 -- Label shipped
After PR is opened successfully, run bash:
$GH_BIN issue edit ${ISSUE_NUMBER} --repo ${REPO} --add-label shipped --remove-label in-progress --remove-label spec-approved
$GH_BIN issue close ${ISSUE_NUMBER} --repo ${REPO} --reason completed

### Phase 8 -- Capture out-of-scope ideas
During implementation, if any ideas or edge cases are surfaced that are out of scope,
capture each as a GitHub issue and label it backlog so it enters the next cron cycle.

### Phase 9 -- Log learnings
Delegate to learning-agent in session-end mode.

### Final report
Print a summary: Issue, PR URL, Gates status, SHIPPED or FAILED.

Important: run autonomously to completion, do not ask for confirmation at any step." 2>&1

  EXIT_CODE=$?

  if [ $EXIT_CODE -eq 0 ]; then
    log "Issue #$ISSUE_NUMBER shipped successfully"
    SHIPPED_COUNT=$((SHIPPED_COUNT + 1))
  else
    log "Issue #$ISSUE_NUMBER -- pi exited with code $EXIT_CODE"
    "$GH_BIN" issue edit "$ISSUE_NUMBER" --repo "$REPO" --remove-label "in-progress" 2>&1 || true
    log "Removed in-progress label -- issue will retry on next run"
  fi

  TRAPPED_ISSUE=""
  recover_clean_state

done

log "========================================"
log "  AUTO-SHIP CRON COMPLETE -- Shipped: $SHIPPED_COUNT"
log "========================================"

exit $EXIT_CODE
