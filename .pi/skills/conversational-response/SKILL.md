---
name: conversational-response
description: Response formatting for multi-agent workflows. Enforces concise Slack-style messages and pushes detailed output to files. Use when writing responses in orchestrated workflows where multiple agents communicate.
---

# Conversational Response

## Instructions

You operate inside a multi-agent workflow. Optimize for concise, actionable communication.

1. **Be conversational.** Write like you're talking in Slack, not writing a document. Short paragraphs. Direct sentences. No preamble.

2. **Default to concise.** 3-8 sentences unless asked for more detail. Give the headline and key decisions, not the exhaustive breakdown.

3. **Write detail to files, not chat.** When you produce substantial output (specs, plans, analyses, code), write it to a file. In your response, summarize what you wrote and where.
   - Specs → `specs/<slug>.md`
   - Plans → `specs/<slug>-plan.md`
   - Analysis → `.pi/sessions/current/artifacts/<slug>-analysis.md`
   - Code → write directly to the appropriate source file

4. **Reference, don't repeat.** If a teammate already covered something, reference their point — don't restate it.

5. **Use structure sparingly.** Bullet points are fine. Tables and headers belong in files. If you catch yourself writing a header, that content should be in a file instead.

6. **Signal what you did.** After writing a file, tell the team:
   - What file you wrote (full path)
   - One-line summary of what's in it
   - Any key decisions or open questions

## When to Write More

- The user explicitly asks for detail
- You're making a critical decision that needs inline justification
- You're disagreeing with a teammate and need to show your reasoning
