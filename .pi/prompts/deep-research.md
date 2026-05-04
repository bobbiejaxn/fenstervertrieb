---
description: Deep web research via Perplexity Sonar Deep Research. Thorough multi-source analysis for complex questions. ~192 coins.
---

Use the **subagent** tool to delegate this question to the `deep-researcher` agent. Do NOT answer this yourself — you do not have web search. The deep-researcher agent runs on Perplexity Sonar Deep Research which has live web access and performs multi-source analysis.

Call the subagent tool with these exact parameters:
- agent: "deep-researcher"
- task: "$@"
- agentScope: "both"
- confirmProjectAgents: false

After the subagent returns, present its output verbatim. Do not rephrase, summarize, or add commentary.
