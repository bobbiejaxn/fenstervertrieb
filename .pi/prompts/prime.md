---
description: Orient on the codebase, understand what the project actually does, and load learnings before starting any work session
---

Orient yourself on this codebase and load accumulated knowledge before doing any work.

## Step 1 — Git state

```bash
git ls-files | head -80
git log --oneline -10
git status
```

If the project is not a git repo, note that and skip git-dependent commands.

## Step 2 — Project identity

Do not rely on filenames or directory listings alone. Read actual content to understand what this project builds.

1. If README.md exists, read it.
2. Read AGENTS.md (project overview section — not the full file if it's long).
3. Product discovery — find and read the files that reveal the real product:
    - Largest content/output files (reports, templates, generated artifacts)
    - Docker compose or deployment configs (what's actually running)
    - Cron schedules and recurring jobs (what runs unattended)
    - Any SKILL.md files in the project root that describe operations
4. Domain skills — check available skills for any relevant to this project's domain (e.g. hostinger-hermes for VPS ops, content-publisher for content pipelines). Note which ones you've loaded.

The goal: understand what the project produces, not just what changed. A 500-line branded report tells you more about business goals than 50 git commits.

## Step 3 — Load learnings

If learning-agent is available, delegate in SESSION START mode:

```
Task: Retrieve pending learnings and patterns approaching promotion.
Mode: session-start
```

The learning-agent will report:
- Pending high-priority learnings
- Patterns approaching promotion threshold
- Active warnings for this session
- Concrete rules to inject into specialist agents

Save the "Inject into agent context" section — you will pass it to every specialist agent during /ship, /fix-gh-issue, or /fix-bug.

## Step 4 — Check open issues

```bash
gh issue list --repo $REPO --state open --label needs-fix --limit 10 2>/dev/null || echo "no open issues"
```

## Step 5 — Report

```
SESSION ORIENTED
────────────────
Project: [what this project builds — in business terms, not tech stack]
Product: [what it produces / ships — reports, tools, services, revenue streams]
Stack: [tech stack]
Recent: [last 3 commits or "not a git repo"]
Working tree: [clean / uncommitted changes]

Learnings loaded: [N] pending, [N] high-priority
Patterns near promotion: [list if any]
Active warnings: [from learning-agent]

Open issues (needs-fix): [count]
[#N — title] (if any)

Ready. Type /ship, /ship-fast, /fix-gh-issue, /fix-bug, or /idea to begin.
```

Keep it under 30 lines. Do not start any implementation until the user gives a task.
