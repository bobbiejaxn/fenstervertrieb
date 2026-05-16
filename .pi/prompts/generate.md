---
description: Generate brand-consistent UI components using the multi-team UI agents. Orchestrates brand analysis, component generation, and validation. Usage: /generate <brand> <product> <tree> <N> "<prompt>"

⚠ CRITICAL RULES:
1. You are the ORCHESTRATOR. Delegate to specialist agents — never write code yourself.
2. Use agentScope: "both" to discover agents from both .pi/agents/ and .pi/multi-team/agents/.
---

Generate UI: $@

## Parse arguments

Parse the input as: `<brand> <product> <tree> <N> "<description>"`

- **brand** — brand name / brand.yaml path
- **product** — product name within the brand
- **tree** — target component tree path (e.g., `apps/infinite-ui/src/components/`)
- **N** — number of variants to generate
- **description** — what to generate (e.g., "landing page hero section")

## Phase 1 — Brand Analysis

Delegate to brand-lead to produce a brand brief:

```json
{
  "agent": "brand-lead",
  "task": "Produce a brand brief for generation.\n\nBrand: ${BRAND}\nProduct: ${PRODUCT}\nTarget tree: ${TREE}\n\nRead any brand.yaml files in the target tree. Extract palette, typography, spacing, motion, tone, audience.\n\nOutput a concise brief with specific CSS custom property names.",
  "agentScope": "both"
}
```

Save the brief as `BRAND_BRIEF`.

## Phase 2 — Component Generation (parallel variants)

Delegate to ui-generation-lead for each of N variants in parallel:

```json
{
  "tasks": [
    {
      "agent": "ui-generation-lead",
      "task": "Generate UI variant ${VARIANT_N} of ${N}.\n\nBrand brief:\n${BRAND_BRIEF}\n\nDescription: ${DESCRIPTION}\nTarget tree: ${TREE}\nVariant: ${VARIANT_N}\n\nVariant differentiation:\n- Layout: different grid structure and visual weight\n- Tone: [assign distinct tone per variant]\n- Content density: [assign distinct density per variant]\n- Interaction model: [assign distinct interaction per variant]\n\nEach variant must be meaningfully different — not just color swaps.\n\nDelegate to vue-generator for SFC structure and animation-specialist for motion.\nWrite output to ${TREE}/branch-${VARIANT_N}/",
      "agentScope": "both"
    }
  ],
  "agentScope": "both"
}
```

For N variants, run them in parallel. Assign each a distinct visual direction:
- Variant 1: Bold, image-heavy, asymmetric layout
- Variant 2: Minimal, text-first, centered symmetry
- Variant 3: Energetic, scroll-triggered, grid-based
- (and so on, cycling through differentiation axes)

## Phase 3 — Validation (parallel)

After all variants generated, validate each in parallel:

```json
{
  "agent": "validation-lead",
  "task": "Validate ${N} generated UI variants.\n\nBrand brief:\n${BRAND_BRIEF}\n\nTarget tree: ${TREE}\nVariants: ${N}\n\nCoordinate your team:\n1. Check each variant for brand compliance (palette, typography, spacing)\n2. Check responsive design\n3. Check accessibility (aria labels, semantic HTML)\n4. Check no inline styles or hardcoded colors\n\nReturn APPROVED/NEEDS_REWORK/REJECTED per variant with specific evidence.",
  "agentScope": "both"
}
```

If NEEDS_REWORK: delegate fixes back to ui-generation-lead for the specific variant (max 1 round).
If REJECTED: report to user with reasons.

## Phase 4 — Report

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GENERATED: ${N} variants for "${DESCRIPTION}"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Brand: ${BRAND}
Product: ${PRODUCT}
Tree: ${TREE}

Variants
────────
✓ Variant 1 — [tone] [layout type] — APPROVED
✓ Variant 2 — [tone] [layout type] — APPROVED
✗ Variant 3 — [tone] [layout type] — NEEDS_REWORK

Files created
─────────────
${TREE}/branch-1/index.vue
${TREE}/branch-2/index.vue
...

Next steps
──────────
- Preview each variant in the browser
- Run /verify-loop ui to double-check compliance
- Choose preferred variant, delete others
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
