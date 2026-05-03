# LLM Output Truncation Research

Source: [taste-skill/research/laziness](https://github.com/Leonxlnx/taste-skill/tree/main/research/laziness)

Research on why LLMs produce incomplete outputs and how to prevent it. Applicable to all agent prompts and skills.

---

## Root Causes

### 1. RLHF and Compute Economics
- Every token costs ~$0.0001 in GPU compute. At scale, brevity saves millions.
- RLHF rewards short, confident summaries over exhaustive analysis.
- **Stopping pressure** is calibrated aggressively — models halt mid-task with "let me know if you want me to continue."
- Providers dynamically throttle during peak demand, producing even shorter outputs.

### 2. Training Data Bias
- Stack Overflow, GitHub, and tutorials routinely use `// implement here`, `pass`, and `...` as legitimate patterns.
- The model treats placeholder insertion as correct professional behavior.
- Tutorial-style abbreviated responses appear far more in training data than complete implementations.
- Without explicit prohibition, the truncation pattern wins over completeness.

### 3. Cognitive Shortcuts (LazyBench)
- Frontier models actively select shortcuts when tasks seem straightforward or context is long.
- This is deliberate — the model retains the information but chooses not to process it at full depth.
- **Seasonal effect:** Models produce shorter outputs in December because training data contains fewer detailed work outputs during holidays. Stating "It is May" measurably increases output length.
- **Error avoidance:** Shorter outputs = less surface area for mistakes, creating an additional truncation incentive.

### 4. Output Limits
- Input context: up to 2M tokens. Output cap: typically 8K tokens.
- When the model estimates its response will exceed the budget, it preemptively compresses.
- Consumer interfaces (web apps) add additional truncation via middleware — history capping (~32K), context pruning, retrieval-based recall.
- Direct API access bypasses all consumer truncation.

## Remediation Techniques

### Prompt Engineering
| Technique | Effect |
|---|---|
| Financial framing ("$200 tip") | +45% output quality and length |
| Step-by-step ("take a deep breath") | Accuracy: 34% → 80% on logic tasks |
| Stakes framing ("critical to my career") | +10% average performance |
| Combined stimuli | Up to +115% overall |

These work because they're correlated with high-effort content in training data (academic papers, enterprise codebases).

### Structural Techniques
- **Explicit syntax binding** — Ban truncation patterns by name (`// ...`, `// TODO`, etc.)
- **XML-structured prompts** — Separate system instructions, context, data, and tasks into tagged blocks
- **Verification loops** — Chain of Verification, Reverse Prompting, Self-Grading loops
- **Chunked execution** — Break complex tasks into sequential steps instead of requesting everything at once

### Parameter Tuning
- **Low temperature (0.0-0.5)** — Forces deterministic, highest-confidence completions. Best for code.
- **Low Top-p (0.0-0.6)** — Narrows token selection, reducing creative refusals and summarization.
- **Gemini thinking_level** — Set to `medium` or `high` for quality >92-95% vs baseline.

### Architectural Patterns
- **Lazy-loaded skills** — Load full instructions only when relevant (35% context reduction)
- **MCP integration** — Real-time data access eliminates the incentive to hallucinate or truncate
- **Skill description quality matters** — Vague descriptions: ~68% discovery. Specific descriptions: ~90%.

## Key Empirical Findings (2025)

1. **Truncation is behavioral, not a capability failure.** Models retain context but choose not to use it.
2. **Context degradation is NOT the cause.** Models maintained instructions across 200-turn conversations.
3. **No model fully satisfies complex multi-part prompts natively.** Explicit enforcement is always required.
4. **Decoding is not suboptimal** — the model's greedy truncated output aligns with its highest-confidence solution. Truncation is a deliberate choice.

## Practical Implications for Agent Design

1. **All agent prompts should explicitly ban truncation patterns** — Don't rely on "be thorough"
2. **Use structured output formats** — XML tags, numbered deliverables, explicit section counts
3. **Include verification steps** — "Before responding, verify all N items are present"
4. **Chunk complex tasks** — Request architecture first, then each component individually
5. **Use the output-enforcement skill** for any task requiring complete code generation
