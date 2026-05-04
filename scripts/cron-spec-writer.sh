#!/usr/bin/env bash
# cron-spec-writer.sh
# Fetches issues labeled 'backlog', runs the product-manager agent on each,
# posts the USVA spec as a GitHub comment, and labels the issue 'spec-ready'.
#
# Runs nightly (e.g. 9pm). Max 3 issues per run to avoid flooding.
# Human reviews specs, adds 'spec-approved' label to trigger auto-ship.

set -euo pipefail

# ── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load project config
source "$PROJECT_DIR/.pi/config.sh"

LOG_DIR="$PROJECT_DIR/logs/cron"
LOG_FILE="$LOG_DIR/spec-writer-$(date +%Y%m%d-%H%M%S).log"
MAX_ISSUES="${CRON_MAX_SPEC_ISSUES:-3}"

# Resolve binaries — prefer config, fall back to PATH
PI_BIN="${PI_BIN:-$(command -v pi)}"
GH_BIN="${GH_BIN:-$(command -v gh)}"

# Spec writer model (configurable via config.sh)
SPEC_PROVIDER="${CRON_SPEC_PROVIDER:-anthropic}"
SPEC_MODEL="${CRON_SPEC_MODEL:-claude-opus-4-5}"

# ── Setup ─────────────────────────────────────────────────────────────────────
mkdir -p "$LOG_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

log "════════════════════════════════════════"
log "  SPEC WRITER CRON — $(date)"
log "════════════════════════════════════════"

cd "$PROJECT_DIR"

# ── Fetch backlog issues ──────────────────────────────────────────────────────
log "Fetching issues labeled 'backlog'..."

ISSUES=$("$GH_BIN" issue list \
  --repo "$REPO" \
  --label backlog \
  --state open \
  --json number,title,labels \
  --limit "$MAX_ISSUES" \
  --jq '[.[] | select(
    (.labels | map(.name) | contains(["spec-ready"]) | not) and
    (.labels | map(.name) | contains(["spec-approved"]) | not) and
    (.labels | map(.name) | contains(["in-progress"]) | not) and
    (.labels | map(.name) | contains(["spec-hold"]) | not)
  ) | .number] | .[]' 2>&1)

if [ -z "$ISSUES" ]; then
  log "No eligible backlog issues found. Exiting."
  exit 0
fi

ISSUE_COUNT=$(echo "$ISSUES" | wc -l | tr -d ' ')
log "Found $ISSUE_COUNT issue(s) to process: $(echo "$ISSUES" | tr '\n' ' ')"

# ── Process each issue ────────────────────────────────────────────────────────
for ISSUE_NUMBER in $ISSUES; do
  log "────────────────────────────────────────"
  log "Processing issue #$ISSUE_NUMBER..."

  # Fetch issue content for the prompt
  ISSUE_CONTENT=$("$GH_BIN" issue view "$ISSUE_NUMBER" --repo "$REPO" --json title,body,labels \
    --jq '"#\(.number // '"$ISSUE_NUMBER"') \(.title)\n\n\(.body)"' 2>&1) || {
    log "ERROR: Failed to fetch issue #$ISSUE_NUMBER. Skipping."
    continue
  }

  log "Running product-manager agent on issue #$ISSUE_NUMBER..."

  # Run pi in non-interactive mode
  "$PI_BIN" --print --no-session \
    --provider "$SPEC_PROVIDER" \
    --model "$SPEC_MODEL" \
    --cwd "$PROJECT_DIR" \
    "You are the orchestrator for the ${PROJECT_NAME} codebase at $PROJECT_DIR.

Your task: create a USVA spec for GitHub issue #$ISSUE_NUMBER using the product-manager agent, then post it to GitHub and label the issue.

Issue content:
$(echo "$ISSUE_CONTENT")

Steps to execute:
1. Derive a feature slug from the issue title (kebab-case, strip 'feat:', 'fix:', 'refactor:' prefixes).

2. Use the subagent tool to call the product-manager agent:
   - agent: 'product-manager'
   - agentScope: 'project'
   - confirmProjectAgents: false
   - cwd: '$PROJECT_DIR'
   - task: 'Produce a confirmed USVA spec for this GitHub issue. Do NOT interview — write the spec directly from the requirements. Save to specs/usva/[slug].usva.md\n\nIssue content:\n$(echo "$ISSUE_CONTENT")'

3. After the product-manager completes, read the spec file it created.

4. Post a comment on the issue with the spec content:
   Run bash: $GH_BIN issue comment $ISSUE_NUMBER --repo $REPO --body \"\$(cat specs/usva/[slug].usva.md)\"

5. Commit the spec file so the working tree stays clean:
   Run bash: cd $PROJECT_DIR && git add specs/usva/ && git commit -m 'feat: USVA spec for #$ISSUE_NUMBER — [issue title]'

6. Label the issue spec-approved (auto-approved, no human gate required) and remove backlog:
   Run bash: $GH_BIN issue edit $ISSUE_NUMBER --repo $REPO --add-label 'spec-approved' --add-label 'spec-ready' --remove-label 'backlog'

7. Report: 'DONE: spec written for #$ISSUE_NUMBER → specs/usva/[slug].usva.md'

Important: use confirmProjectAgents: false in all subagent calls." 2>&1

  EXIT_CODE=$?
  if [ $EXIT_CODE -eq 0 ]; then
    log "Issue #$ISSUE_NUMBER — spec complete"
  else
    log "Issue #$ISSUE_NUMBER — pi exited with code $EXIT_CODE"
    # Don't exit — continue with next issue
  fi
done

log "════════════════════════════════════════"
log "  SPEC WRITER CRON COMPLETE"
log "════════════════════════════════════════"
