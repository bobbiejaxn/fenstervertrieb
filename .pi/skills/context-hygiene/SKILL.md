---
name: context-hygiene
description: Proactive context window management. Agents summarize intermediate results and discard raw exploration data to extend effective session length. Prevents context bloat and loss of high-value decisions during long /ship runs. Load for any agent in long-running multi-step workflows.
---

# Context Hygiene

Manage your context window proactively. After completing a phase of work, summarize what you learned and discard the raw exploration data.

## Rules

1. After exploring a codebase area, write a 2-line summary of what you found. The raw grep/read output is now low-value.
2. After completing a task, summarize the changes in a structured format. The intermediate file reads are now low-value.
3. After a subagent returns, extract the key conclusions. The full subagent output is now low-value.
4. When context feels heavy, prefer concise summaries over re-reading files.

## High-value context (KEEP)

- Specs and decisions (USVA, implementation plan)
- Final code changes (the actual edits made)
- Architecture decisions (why X over Y)
- Test failures (what failed and why)
- Constraints discovered ("Can't use X because Y")

## Low-value context (safe to lose in compaction)

- Completed exploration (grep results that led to a decision)
- Intermediate file reads (files read but not edited)
- Abandoned approaches (code written then reverted)
- Verbose tool output (build logs, test output after summary noted)
- Full subagent results (after conclusions extracted)

## Anti-patterns

- Re-reading files you've already read this session
- Keeping full tool outputs when a summary suffices
- Noting "I should remember this" without actually summarizing it

## Signal phrases (triggers for hygiene)

- "Let me check..." → after checking, summarize
- "I found that..." → capture the finding, discard the search
- "The output shows..." → note the conclusion, drop the log
