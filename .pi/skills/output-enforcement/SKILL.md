---
name: output-enforcement
description: Overrides default LLM truncation behavior. Enforces complete code generation, bans placeholder patterns, and handles token-limit splits cleanly. Apply to any task requiring exhaustive, unabridged output. Load when generating full files, multi-file implementations, long analyses, or when the agent produces truncated results.
---

# Full-Output Enforcement

## Baseline

Treat every task as production-critical. A partial output is a broken output. Do not optimize for brevity — optimize for completeness. If the user asks for a full file, deliver the full file. If the user asks for 5 components, deliver 5 components. No exceptions.

## Banned Output Patterns

The following patterns are hard failures. Never produce them:

**In code blocks:**
- `// ...`
- `// rest of code`
- `// implement here`
- `// TODO`
- `/* ... */`
- `// similar to above`
- `// continue pattern`
- `// add more as needed`
- Bare `...` standing in for omitted code
- `# ... rest of implementation`
- `pass  # implement later`

**In prose:**
- "Let me know if you want me to continue"
- "I can provide more details if needed"
- "for brevity"
- "the rest follows the same pattern"
- "similarly for the remaining"
- "and so on" (when replacing actual content)
- "I'll leave that as an exercise"
- "you can extend this to..."

**Structural shortcuts:**
- Outputting a skeleton when the request was for a full implementation
- Showing the first and last section while skipping the middle
- Replacing repeated logic with one example and a description
- Describing what code should do instead of writing it

## Execution Process

1. **Scope** — Read the full request. Count how many distinct deliverables are expected (files, functions, sections, answers). Lock that number.
2. **Build** — Generate every deliverable completely. No partial drafts, no "you can extend this later."
3. **Cross-check** — Before output, re-read the original request. Compare your deliverable count against the scope count. If anything is missing, add it before responding.

## Handling Long Outputs

When a response approaches the token limit:

- Do not compress remaining sections to squeeze them in.
- Do not skip ahead to a conclusion.
- Write at full quality up to a clean breakpoint (end of a function, end of a file, end of a section).
- End with:

```
[PAUSED — X of Y complete. Send "continue" to resume from: next section name]
```

On "continue", pick up exactly where you stopped. No recap, no repetition.

## Why This Matters (Research-Backed)

LLM truncation is not a capability limitation — it's a behavioral artifact from:

1. **RLHF brevity bias** — Models are rewarded during training for shorter, confident outputs to save compute
2. **Training data placeholders** — Code tutorials, Stack Overflow, and docs use `// TODO` and `// ...` as legitimate patterns, so models reproduce them
3. **Stopping pressure** — Aggressive calibration to prevent infinite generation causes premature halting
4. **Error avoidance** — Shorter outputs have less surface area for mistakes, creating an incentive to truncate

Explicit banning of these patterns overrides the default behavior because the prohibition activates high-effort data distributions in the model's latent space.

## Quick Check

Before finalizing any response, verify:
- [ ] No banned patterns from the list above appear anywhere in the output
- [ ] Every item the user requested is present and finished
- [ ] Code blocks contain actual runnable code, not descriptions of what code would do
- [ ] Nothing was shortened to save space
- [ ] Multi-file outputs include every file completely with full paths
