---
description: Quick web research via Perplexity Sonar. Ask any question — get a concise answer with sources. ~1 coin.
---

Use the **subagent** tool to delegate this question to the `researcher` agent. Do NOT answer this yourself — you do not have web search. The researcher agent runs on Perplexity Sonar which has live web access.

Call the subagent tool with these exact parameters:
- agent: "researcher"
- task: "$@"
- agentScope: "both"
- confirmProjectAgents: false

After the subagent returns, present its output verbatim. Do not rephrase, summarize, or add commentary.

If the answer is insufficient, ask: "Want me to run deep research on this? (~192 coins via /deep-research)"
