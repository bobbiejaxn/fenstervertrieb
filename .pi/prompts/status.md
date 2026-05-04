---
description: Full pipeline health check — running/stuck, time sanity, what was built, value added, open issues by impact, deletion guard
---

Run the following checks in order. Output one structured report. Do not implement anything.

First, load config:
```bash
source .pi/config.sh
```

## Step 1 — Process health

```bash
# Active processes
pgrep -a -f "run-timed-session|cron-auto-ship|cron-spec-writer|autoship" 2>/dev/null || echo "NOTHING RUNNING"

# Last log activity
tail -3 logs/cron/auto-ship-launchd.log 2>/dev/null
tail -3 logs/cron/spec-writer-launchd.log 2>/dev/null
tail -3 logs/cron/session-current.log 2>/dev/null

# Last log timestamps
stat -f "%Sm %N" -t "%H:%M" logs/cron/auto-ship-launchd.log logs/cron/spec-writer-launchd.log 2>/dev/null
```

**Time sanity rules:**
- Last log >45 min ago + process running → flag as SUSPICIOUS
- Last log >90 min ago + process running → flag as STUCK — state the last log line
- Process NOT running + spec-approved issues exist → flag as IDLE WITH QUEUE

## Step 2 — What's in flight

```bash
gh issue list --repo "$REPO" --state open --label in-progress \
  --json number,title --jq '.[] | "#\(.number) \(.title)"'

gh issue list --repo "$REPO" --state open --label spec-approved \
  --json number,title --jq '.[] | "#\(.number) \(.title)"' | sort -t'#' -k2 -n
```

Compute: how long has the current in-progress issue been in flight?
```bash
gh issue view [IN_PROGRESS_NUMBER] --repo "$REPO" --json updatedAt \
  --jq '"In flight since: \(.updatedAt)"' 2>/dev/null
```

## Step 3 — What was built (last 24h)

```bash
gh issue list --repo "$REPO" --state closed \
  --json number,title,labels,closedAt \
  --jq '[.[] | select(.labels | map(.name) | contains(["shipped"])) | select(.closedAt > (now - 86400 | todate))] | .[] | "#\(.number) \(.title)"' \
  | sort -t'#' -k2 -n

git log --oneline --since="24 hours ago"
```

## Step 4 — Value added

For each issue shipped in the last 24h, classify it:
- **User-facing** — visible change to signup, onboarding, UI, or pricing flow
- **Reliability** — type safety, runtime guards, error handling
- **Security** — auth, rate limiting, audit logging
- **DX/cleanup** — refactoring, deduplication, test coverage

## Step 5 — Deletion guard

```bash
# Any files deleted in last 24h of commits?
git log --since="24 hours ago" --diff-filter=D --name-only --pretty=format: | grep -v "^$" | sort | uniq
```

If ANY files were deleted: list them and flag explicitly.
If none: confirm "No files deleted in last 24h"

## Step 6 — GitHub sync

```bash
# Local vs remote
git fetch origin --quiet
git log --oneline origin/main..HEAD  # unpushed commits
git log --oneline HEAD..origin/main  # commits on remote not local
git status --short

# Last push
git log --oneline -5 origin/main
```

Rules:
- Unpushed commits → flag as LOCAL AHEAD — list the commits
- Everything in sync → IN SYNC

If you have a deployment platform CLI available (e.g. `vercel ls`), also check:
- Latest deployment older than last push → DEPLOY BEHIND
- Deployment status not ready → DEPLOY NOT READY
- Everything in sync → DEPLOYED

## Step 7 — Open issues by impact

```bash
gh issue list --repo "$REPO" --state open \
  --json number,title,labels \
  --jq '.[] | select(.labels | map(.name) | (contains(["backlog"]) or contains(["spec-approved"]) or contains(["needs-fix"]))) | "#\(.number) [\(.labels | map(.name) | join(","))] \(.title)"' \
  | sort -t'#' -k2 -n
```

Sort output by impact tier:
1. **Bug** — anything labeled `bug`
2. **Security / reliability** — rate limiting, audit logging, type guards
3. **User-facing** — onboarding, signup, UI
4. **DX / cleanup** — refactoring, constants, tests

## Output format

```
STATUS — [timestamp]
════════════════════════════════════════════

── 1. PIPELINE ──────────────────────────────
[RUNNING | SUSPICIOUS | STUCK | IDLE]
Process: [name or NONE]
Last log: [HH:MM] ([Xm ago])
[If stuck: last log line verbatim]

── 2. IN FLIGHT ─────────────────────────────
#NNN [title] — [Xm in flight]  [OK | SLOW | STALLED]
Spec-approved queue: N issues

── 3. BUILT (last 24h) ──────────────────────
[#NNN title] — shipped HH:MM
[#NNN title] — shipped HH:MM
Total: N shipped

── 4. VALUE ADDED ───────────────────────────
User-facing:  [list or none]
Reliability:  [list or none]
Security:     [list or none]
DX/cleanup:   [list or none]

── 5. DELETION GUARD ────────────────────────
No files deleted  |  DELETED: [list files]

── 6. GITHUB & DEPLOY ───────────────────────
Git:    [IN SYNC | X unpushed commits]
        [list unpushed commits if any]
Deploy: [DEPLOYED (Xm ago) | BEHIND | NOT READY | N/A]

── 7. OPEN ISSUES (by impact) ───────────────
Bugs:      [list or none]
Security:  [list or none]
UX:        [list or none]
Cleanup:   [list or none]

════════════════════════════════════════════
[One-line verdict: all good / what needs attention]
```

Keep it scannable. Flag problems loudly. Never start implementation.
