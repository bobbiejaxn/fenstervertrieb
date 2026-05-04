commit a834119621f845decdd6133f7dd227838e6af5ab
Author: Your Name <michael.guiao@gmail.com>
Date:   Sun Apr 19 19:07:28 2026 +0200

    feat(monitor): live color-coded agent terminal monitor
    
    Two scripts for real-time agent activity monitoring:
    
    scripts/agent-monitor.sh — Full trace-based monitor
    - Watches .pi/traces/runs/<run-id>/*.jsonl in real time
    - Single persistent python3 formatter (no per-event spawn)
    - Color-coded by agent name (16 unique colors in palette)
    - Tool icons: ⚡bash 📖read 📝write ✏️edit 🔍grep 🔄subagent 🌐web 🐙github 👑ceo
    - Auto-detects new agent files (agents starting mid-run)
    - Shows session start/end, tool calls, errors, token usage, cost
    - Usage: ./scripts/agent-monitor.sh [run-id]
    
    scripts/agent-watch.sh — Lightweight session log monitor
    - Watches .pi/sessions/current/conversation.jsonl
    - Color-coded agent tags, truncated message previews
    - Usage: ./scripts/agent-watch.sh
    
    Both scripts clean up background processes on Ctrl+C (no noise).

diff --git a/scripts/agent-watch.sh b/scripts/agent-watch.sh
new file mode 100755
index 00000000..10c14a87
--- /dev/null
+++ b/scripts/agent-watch.sh
@@ -0,0 +1,76 @@
+#!/usr/bin/env bash
+# ──────────────────────────────────────────────────────────────────────────────
+# Agent Watch — Ultra-lightweight agent activity monitor
+#
+# Watches .pi/sessions/current/conversation.jsonl for live agent messages.
+# Works even without trace files. Use alongside /ship or /fix.
+#
+# Usage (in a separate terminal):
+#   ./scripts/agent-watch.sh
+#
+# For full trace monitoring with tool calls, use:
+#   ./scripts/agent-monitor.sh
+# ──────────────────────────────────────────────────────────────────────────────
+set -euo pipefail
+
+SESSION_LOG=".pi/sessions/current/conversation.jsonl"
+
+# Color map for common agents
+get_color() {
+  case "$1" in
+    *implementer*|*worker*)  echo "32" ;;   # green
+    *architect*|*planner*)   echo "36" ;;   # cyan
+    *reviewer*)              echo "96" ;;   # light cyan
+    *scout*)                 echo "34" ;;   # blue
+    *product-manager*|*pm*)  echo "35" ;;   # magenta
+    *test-writer*)           echo "33" ;;   # yellow
+    *debug*)                 echo "31" ;;   # red
+    *learning*)              echo "90" ;;   # gray
+    *ceo*)                   echo "95" ;;   # light magenta
+    *security*)              echo "91" ;;   # light red
+    *orchestrat*)            echo "36" ;;   # cyan
+    *)                       echo "0" ;;    # white
+  esac
+}
+
+# Create session log if it doesn't exist
+mkdir -p .pi/sessions/current
+touch "$SESSION_LOG"
+
+echo -e "\033[1;38;5;255m╔══════════════════════════════════════════╗\033[0m"
+echo -e "\033[1;38;5;255m║  👁  AGENT WATCH  ·  Live Session Feed  ║\033[0m"
+echo -e "\033[1;38;5;255m╚══════════════════════════════════════════╝\033[0m"
+echo ""
+echo -e "\033[38;5;245mWatching $SESSION_LOG (Ctrl+C to stop)\033[0m"
+echo ""
+
+# Tail the log and colorize
+tail -f "$SESSION_LOG" 2>/dev/null | while read -r line; do
+  [[ -z "$line" ]] && continue
+
+  from=$(echo "$line" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('from','?'))" 2>/dev/null || echo "?")
+  msg=$(echo "$line" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('message',''))" 2>/dev/null || echo "")
+  type=$(echo "$line" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('type',''))" 2>/dev/null || echo "")
+  ts=$(echo "$line" | python3 -c "import json,sys; d=json.load(sys.stdin); t=d.get('timestamp',''); print(t[11:19] if len(t)>10 else '')" 2>/dev/null || echo "")
+
+  color=$(get_color "$from")
+
+  # Truncate message for display
+  preview="${msg:0:120}"
+  [[ ${#msg} -gt 120 ]] && preview="${preview}..."
+
+  case "$type" in
+    agent)
+      echo -e "\033[38;5;${color}m$ts [$from]\033[0m $preview"
+      ;;
+    system)
+      echo -e "\033[38;5;245m$ts [system]\033[0m $preview"
+      ;;
+    error)
+      echo -e "\033[38;5;196m$ts [$from] ✗\033[0m $preview"
+      ;;
+    *)
+      echo -e "\033[38;5;${color}m$ts [$from]\033[0m $preview"
+      ;;
+  esac
+done
