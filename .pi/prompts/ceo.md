---
description: "CEO agent — autonomous goal-driven orchestration. Give it a goal, it plans, delegates, reviews, and iterates."
---

# /ceo

CEO goal: $@

Autonomous CEO agent. Receives a high-level goal and orchestrates worker agents to achieve it.

## Input Parsing

Parse the user's input:
- If `--resume` flag is present: resume the latest CEO session
- If `--goal "..." --requirements "..."`: use explicit flags
- If `--max-iterations N`: override default iteration limit (default: 20)
- Otherwise: treat entire input as the goal, no separate requirements

## Steps

1. **Load project context**:
   - Source `.pi/config.sh` for project identity and verification commands
   - Read `AGENTS.md` for project rules and conventions

2. **Invoke the CEO tool**:
   Call the `ceo` tool with parsed parameters:
   - `goal`: the parsed goal string
   - `requirements`: the parsed requirements (or empty string)
   - `resume`: true if --resume flag, false otherwise
   - `maxIterations`: parsed value or omit for default

3. **Progress reporting**:
   The CEO tool will emit updates at each phase transition (PLAN, DELEGATE, REVIEW, DECIDE, VERIFY). Report these to the user.

4. **On completion**:
   Show the final summary including tasks completed, iterations used, and any PRs created.

5. **On escalation**:
   Show what's stuck, what was tried, and what the human needs to decide. Create a GitHub issue with the details if appropriate.

## Examples

```
/ceo Build user authentication with JWT and rate limiting
/ceo --resume
/ceo --goal "Add pagination to API" --requirements "Cursor-based, backward compatible"
/ceo --max-iterations 30 Build full checkout flow with Stripe integration
```
