#!/usr/bin/env bash
# autoship.sh
#
# Run once to kick off the autoship loop:
#   1. Runs spec-writer immediately (creates USVA specs for all 'backlog' issues)
#   2. Polls every 5 min for 'spec-approved' issues and ships them
#   3. Self-terminates after 6 hours
#
# Usage:
#   ./scripts/autoship.sh          # runs in background, returns shell
#   ./scripts/autoship.sh --fg     # runs in foreground (blocks)

set -euo pipefail

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

LOG_DIR="$PROJECT_DIR/logs/cron"
RUN_ID="autoship-$(date +%Y%m%d-%H%M%S)"
LOG_FILE="$LOG_DIR/${RUN_ID}.log"
PID_FILE="$LOG_DIR/autoship.pid"

DURATION_HOURS="${AUTOSHIP_DURATION_HOURS:-6}"
POLL_INTERVAL_SECONDS="${AUTOSHIP_POLL_INTERVAL:-300}"

GH_BIN="${GH_BIN:-$(command -v gh)}"

mkdir -p "$LOG_DIR"

# -- Foreground vs background ──────────────────────────────────────────────────
if [[ "${1:-}" != "--fg" ]]; then
  echo ""
  echo "  Starting autoship loop in background..."
  echo "  Duration:  ${DURATION_HOURS}h  (polls every $((POLL_INTERVAL_SECONDS / 60)) min for spec-approved)"
  echo "  Log:       $LOG_FILE"
  echo "  Stop early: kill \$(cat $PID_FILE)"
  echo ""
  nohup bash "$0" --fg >> "$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"
  echo "  PID: $(cat $PID_FILE)"
  echo ""
  exit 0
fi

# -- Foreground loop ───────────────────────────────────────────────────────────
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

DEADLINE=$(( $(date +%s) + DURATION_HOURS * 3600 ))

log "================================================"
log "  OVERNIGHT LOOP STARTED -- PID $$"
log "  Will run until: $(date -r $DEADLINE '+%Y-%m-%d %H:%M:%S')"
log "================================================"

cd "$PROJECT_DIR"

# -- Phase 1: Run spec-writer immediately ──────────────────────────────────────
log ""
log "PHASE 1 -- Spec Writer (immediate)"
log "----------------------------------------"
bash "$SCRIPT_DIR/cron-spec-writer.sh" || log "spec-writer exited non-zero (check log above)"

log ""
log "Specs created. Review them on GitHub and add 'spec-approved' label."
log "Polling for spec-approved issues every $((POLL_INTERVAL_SECONDS / 60)) min until $(date -r $DEADLINE '+%H:%M')..."
log ""

# -- Phase 2: Poll loop ────────────────────────────────────────────────────────
ROUND=0

while true; do
  NOW=$(date +%s)
  REMAINING=$(( DEADLINE - NOW ))

  if (( REMAINING <= 0 )); then
    log "================================================"
    log "  ${DURATION_HOURS}-hour window expired. Overnight loop done."
    log "================================================"
    rm -f "$PID_FILE"
    exit 0
  fi

  REMAINING_H=$(( REMAINING / 3600 ))
  REMAINING_M=$(( (REMAINING % 3600) / 60 ))

  # Auto-approve any spec-ready issues
  READY=$("$GH_BIN" issue list \
    --repo "$REPO" \
    --label spec-ready \
    --state open \
    --json number,labels \
    --jq '[.[] | select(
      (.labels | map(.name) | contains(["spec-approved"]) | not) and
      (.labels | map(.name) | contains(["spec-hold"]) | not)
    ) | .number] | .[]' 2>/dev/null || true)

  for N in $READY; do
    log "Auto-approving issue #$N (spec-ready -> spec-approved)"
    "$GH_BIN" issue edit "$N" --repo "$REPO" --add-label "spec-approved" 2>/dev/null || true
  done

  # Check for spec-approved issues
  ISSUE_COUNT=$("$GH_BIN" issue list \
    --repo "$REPO" \
    --label spec-approved \
    --state open \
    --json number,labels \
    --jq '[.[] | select(
      (.labels | map(.name) | contains(["in-progress"]) | not) and
      (.labels | map(.name) | contains(["shipped"]) | not) and
      (.labels | map(.name) | contains(["spec-hold"]) | not)
    )] | length' 2>/dev/null || echo "0")

  log "Poll #$((++ROUND)) -- ${REMAINING_H}h ${REMAINING_M}m remaining -- ${ISSUE_COUNT} spec-approved issue(s) ready"

  if (( ISSUE_COUNT > 0 )); then
    log "Found ${ISSUE_COUNT} issue(s) -- running auto-ship..."
    bash "$SCRIPT_DIR/cron-auto-ship.sh" || log "auto-ship exited non-zero (check log above)"
    log "auto-ship done. Continuing poll loop..."
  else
    log "Nothing ready yet. Sleeping ${POLL_INTERVAL_SECONDS}s..."
  fi

  SLEEP_TIME=$(( POLL_INTERVAL_SECONDS < REMAINING ? POLL_INTERVAL_SECONDS : REMAINING ))
  sleep "$SLEEP_TIME"
done
