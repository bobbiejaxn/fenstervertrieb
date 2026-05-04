#!/usr/bin/env bash
# uninstall-cron.sh — removes auto-ship launchd agents

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"

# Load project config for PROJECT_NAME
source "$PROJECT_DIR/.pi/config.sh"

# Same label prefix as install-cron.sh
LABEL_PREFIX="com.$(echo "$PROJECT_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g;s/--*/-/g;s/^-//;s/-$//')"

log() { echo "[uninstall-cron] $*"; }

for SUFFIX in cron-spec-writer cron-auto-ship; do
  LABEL="${LABEL_PREFIX}.${SUFFIX}"
  PLIST="$LAUNCH_AGENTS_DIR/$LABEL.plist"
  if [ -f "$PLIST" ]; then
    launchctl unload "$PLIST" 2>/dev/null || true
    rm "$PLIST"
    log "Removed $LABEL"
  else
    log "  $LABEL not installed — skipping"
  fi
done

log ""
log "Done. Cron jobs uninstalled."
