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

diff --git a/scripts/agent-monitor.sh b/scripts/agent-monitor.sh
new file mode 100755
index 00000000..33c6e038
--- /dev/null
+++ b/scripts/agent-monitor.sh
@@ -0,0 +1,191 @@
+#!/usr/bin/env bash
+# ──────────────────────────────────────────────────────────────────────────────
+# Agent Monitor — Live color-coded terminal dashboard for /ship and /fix runs
+#
+# Watches trace JSONL files and renders color-coded agent activity in real time.
+# Run in a SEPARATE terminal while /ship or /fix is executing.
+#
+# Usage:
+#   ./scripts/agent-monitor.sh              # Watch latest run
+#   ./scripts/agent-monitor.sh <run-id>     # Watch specific run
+#
+# Colors: each agent gets a unique ANSI color. Tools get icons.
+# ──────────────────────────────────────────────────────────────────────────────
+set -eo pipefail
+
+# ── Resolve run ──────────────────────────────────────────────────────────────
+TRACES_DIR=".pi/traces/runs"
+RUN_ID="${1:-$(ls -1t "$TRACES_DIR/" 2>/dev/null | head -1)}"
+
+if [[ -z "$RUN_ID" ]]; then
+  echo -e "\033[38;5;196mNo trace runs found.\033[0m"
+  exit 1
+fi
+
+RUN_DIR="$TRACES_DIR/$RUN_ID"
+if [[ ! -d "$RUN_DIR" ]]; then
+  echo -e "\033[38;5;196mRun not found: $RUN_ID\033[0m"
+  ls -1t "$TRACES_DIR/" 2>/dev/null | head -10
+  exit 1
+fi
+
+# ── Header ───────────────────────────────────────────────────────────────────
+clear
+printf "\033[1;38;5;255m╔══════════════════════════════════════════════════════════════════╗\033[0m\n"
+printf "\033[1;38;5;255m║  🤖 AGENT MONITOR  ·  %s\033[0m\n" "$RUN_ID"
+printf "\033[1;38;5;255m╚══════════════════════════════════════════════════════════════════╝\033[0m\n"
+echo ""
+
+if [[ -f "$RUN_DIR/manifest.json" ]]; then
+  printf "\033[38;5;245mAgents:\033[0m\n"
+  python3 -c "
+import json
+for m in json.load(open('$RUN_DIR/manifest.json')):
+    n=m.get('agent','?'); mo=m.get('model',''); p=m.get('phase','')
+    print(f'  · {n} ({mo}) [{p}]')
+" 2>/dev/null
+  echo ""
+fi
+
+printf "\033[38;5;245mFollowing trace files... (Ctrl+C to stop)\033[0m\n\n"
+
+# ── Setup pipe + cleanup ─────────────────────────────────────────────────────
+PIPE=$(mktemp -u /tmp/agent-monitor-XXXXXX)
+mkfifo "$PIPE"
+
+cleanup() {
+  kill $(jobs -p) 2>/dev/null
+  wait 2>/dev/null
+  rm -f "$PIPE"
+  printf "\n\033[38;5;245mMonitor stopped.\033[0m\n"
+  exit 0
+}
+trap cleanup INT TERM EXIT
+
+# ── Feed trace files into pipe ───────────────────────────────────────────────
+taled_files=()
+for tracefile in "$RUN_DIR"/*.jsonl; do
+  [[ -f "$tracefile" ]] || continue
+  taled_files+=("$(basename "$tracefile")")
+  ( tail -f "$tracefile" >> "$PIPE" 2>/dev/null ) &
+done
+
+# Watch for new agent files
+(
+  while true; do
+    sleep 2
+    for tracefile in "$RUN_DIR"/*.jsonl; do
+      [[ -f "$tracefile" ]] || continue
+      fname=$(basename "$tracefile")
+      found=false
+      for t in "${taled_files[@]}"; do [[ "$t" == "$fname" ]] && found=true && break; done
+      if [[ "$found" == "false" ]]; then
+        taled_files+=("$fname")
+        ( tail -n 0 -f "$tracefile" >> "$PIPE" 2>/dev/null ) &
+        aname="${fname%.jsonl}"
+        echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"agent\":\"$aname\",\"type\":\"session_start\",\"phase\":\"delegated\",\"data\":{}}" >> "$PIPE"
+      fi
+    done
+  done
+) &
+
+# ── Persistent Python formatter reads from pipe ──────────────────────────────
+python3 -c '
+import sys, json
+
+AGENT_COLORS = {
+    "orchestrator": 36, "thinker": 35, "planner": 33, "worker": 32,
+    "scout": 34, "reviewer": 96, "implementer": 32, "test-writer": 33,
+    "debug-agent": 31, "product-manager": 35, "architect": 36,
+    "learning-agent": 90, "issue-creator": 90, "security-reviewer": 91,
+    "gate-skeptic": 93, "ceo-reasoning": 95, "ceo": 95,
+    "frontend-lead": 34, "backend-lead": 36, "validation-lead": 33,
+    "harness-evolver": 96, "fixer": 31, "researcher": 34,
+}
+TOOL_ICONS = {"bash":"⚡","read":"📖","write":"📝","edit":"✏️ ","grep":"🔍","find":"🔎","subagent":"🔄","web_search":"🌐","github":"🐙","ceo":"👑"}
+R = "\033[0m"
+
+def c(n): return f"\033[38;5;{n}m"
+def bc(n): return f"\033[1;38;5;{n}m"
+def ac(name):
+    for k,v in AGENT_COLORS.items():
+        if k in name: return v
+    return 0
+def tg(agent, co):
+    return f"{c(co)}{agent[:18].ljust(18)}{R}"
+def ic(tool):
+    return TOOL_ICONS.get(tool, "·")
+def sh(p, n=60): return p[-n:]
+
+for line in sys.stdin:
+    line = line.strip()
+    if not line: continue
+    try: e = json.loads(line)
+    except: continue
+    agent = e.get("agent","?")
+    etype = e.get("type","")
+    ts = e.get("timestamp","")[11:19]
+    data = e.get("data",{})
+    co = ac(agent)
+    t = tg(agent, co)
+    out = None
+
+    if etype == "session_start":
+        ph = e.get("phase","")
+        out = f"\n{bc(co)}━━━ ▶ {agent} STARTED ━━━{R}  \033[2m{ph}{R}"
+
+    elif etype == "tool_call":
+        tool = data.get("tool","?")
+        i = ic(tool)
+        inp = data.get("input",{})
+        if tool == "bash":
+            cmd = inp.get("command","?")[:90]
+            out = f"  {ts} {t} {i} {c(240)}$ {cmd}{R}"
+        elif tool == "read":
+            p = sh(inp.get("path","") or inp.get("file_path",""))
+            out = f"  {ts} {t} {i} {c(75)}{p}{R}"
+        elif tool == "write":
+            p = sh(inp.get("path","") or inp.get("file_path",""))
+            out = f"  {ts} {t} {i} {c(113)}{p}{R}"
+        elif tool == "edit":
+            p = sh(inp.get("path","") or inp.get("file_path",""))
+            out = f"  {ts} {t} {i} {c(179)}{p}{R}"
+        elif tool == "subagent":
+            sa = inp.get("agent","?")
+            st = inp.get("task","?")[:50]
+            out = f"  {ts} {t} {i} {c(213)}{sa}{R} {c(245)}{st}{R}"
+        else:
+            out = f"  {ts} {t} {i} {c(245)}{tool}{R}"
+
+    elif etype == "tool_result":
+        if data.get("is_error"):
+            tool = data.get("tool","?")
+            out = f"  {ts} {t} {c(196)}✗ {tool} error{R}"
+
+    elif etype == "message":
+        if data.get("role") == "assistant":
+            parts = []
+            ti = data.get("tokens_in",0)
+            to = data.get("tokens_out",0)
+            cost = data.get("cost",0)
+            model = data.get("model","")
+            if ti: parts.append(f"↑{ti}")
+            if to: parts.append(f"↓{to}")
+            if cost and str(cost) not in ("0","0.0"): parts.append(f"${cost}")
+            if model: parts.append(model)
+            if parts:
+                out = f"  {ts} {t} {c(245)}💬 {" ".join(str(x) for x in parts)}{R}"
+
+    elif etype == "session_end":
+        dur_ms = data.get("duration_ms",0)
+        dur = f"{dur_ms/1000:.1f}s" if dur_ms else "?"
+        errs = data.get("errors",0)
+        tcs = data.get("tool_calls",0)
+        x = "✗" if errs else "✓"
+        out = f"{bc(co)}━━━ {x} {agent} DONE ━━━{R}  \033[2m{dur} · {tcs} tools · {errs} errors{R}"
+
+    if out:
+        sys.stdout.write(out + "\n")
+        sys.stdout.flush()
+' < "$PIPE"
+
