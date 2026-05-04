---
name: active-listener
description: Read the conversation log at the start of every task for full context. Ensures you know what's happened, what's been decided, and what's still open before responding. Use when working in multi-agent workflows where coordination matters.
---

# Active Listener

## Instructions

Before doing any work, read the conversation log to understand what's already happened in this session.

### On Every Task Start

1. Check if a conversation log exists at `.pi/sessions/current/conversation.jsonl`
2. If it exists, read the last 15-20 entries
3. Each line is a JSON object with `from`, `message`, `timestamp`, `type`, and optionally `team`
4. Understand what's happened: what was asked, what's been decided, what's unresolved

### Log Format

```jsonl
{"from": "user", "message": "Ship the auth feature", "timestamp": "2026-03-24T10:00:00Z", "type": "user"}
{"from": "orchestrator", "message": "Delegating to architect for planning", "timestamp": "2026-03-24T10:00:05Z", "type": "orchestrator"}
{"from": "architect", "message": "Plan: 3 files need changes...", "timestamp": "2026-03-24T10:00:30Z", "type": "agent", "team": "planning"}
{"from": "implementer", "message": "Implemented auth middleware", "timestamp": "2026-03-24T10:02:00Z", "type": "agent", "team": "engineering"}
```

### Rules

- **Always read before responding.** No exceptions.
- **Don't repeat work.** If a teammate already covered it, build on it or agree — don't restate.
- **Flag conflicts.** If your analysis contradicts a prior response, say so with reasoning.
- **Reference, don't repeat.** "Agree with architect's approach for the auth module" > restating the whole plan.

### Writing to the Log

After completing significant work, append your output to the conversation log:

```bash
echo '{"from": "<your-agent-name>", "message": "<summary of what you did>", "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'", "type": "agent"}' >> .pi/sessions/current/conversation.jsonl
```

This ensures the next agent in the workflow knows what you accomplished.

## Session Directory Structure

```
.pi/sessions/
├── current/                    # Symlink to active session
│   ├── conversation.jsonl      # Shared conversation log
│   └── artifacts/              # Session-specific outputs
└── <session-id>/               # Archived sessions
    ├── conversation.jsonl
    └── artifacts/
```
