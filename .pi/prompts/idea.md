---
description: Capture an idea to GitHub for later review. Pure capture — no planning, no analysis. Returns issue URL.
---

Capture this idea: $@

Delegate the user's idea to the idea-capture agent. Do not add context, do not plan, do not discuss. Just capture.

```json
{
  "agent": "idea-capture",
  "task": "Capture this idea:\n\n$@",
  "agentScope": "project",
  "confirmProjectAgents": false
}
```

After the agent returns, output:

```
💡 Captured: [title]
   [issue URL]
```

Then continue with whatever the user was doing before. Do not break flow.
