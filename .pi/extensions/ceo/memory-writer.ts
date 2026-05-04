// .pi/extensions/ceo/memory-writer.ts

import type { CEODecision } from "./types.js";
import { SECRET_PATTERNS } from "./constants.js";

interface LearningEntryParams {
  feature: string;
  pattern: string;
  area: string;
  patternKey: string;
}

interface ObsidianNoteParams {
  goal: string;
  decisions: CEODecision[];
  outcome: string;
  projectName: string;
}

export class MemoryWriter {
  static sanitizeOutput(text: string): string {
    let result = text;
    for (const pattern of SECRET_PATTERNS) {
      result = result.replace(new RegExp(pattern.source, pattern.flags), "[REDACTED]");
    }
    return result;
  }

  static buildLearningEntry(params: LearningEntryParams): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const id = `LRN-${dateStr}-${Math.floor(Math.random() * 900) + 100}`;
    const timestamp = now.toISOString();

    return `## [${id}]

Logged: ${timestamp}
Feature: ${params.feature}
Status: pending
Priority: medium

### What happened
CEO agent observed a pattern during orchestration.

### Patterns observed
- ${params.pattern}

### Metadata
- Source: ceo-agent
- Area: ${params.area}
- Tags: ceo, orchestration, ${params.area}
- Pattern-Key: ${params.patternKey}
- Recurrence-Count: 1
- First-Seen: ${timestamp.slice(0, 10)}
- Last-Seen: ${timestamp.slice(0, 10)}
`;
  }

  static buildObsidianNote(params: ObsidianNoteParams): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);

    const decisionEntries = params.decisions
      .map(d => `### Iteration ${d.iteration} (${d.phase})\n- **Decision**: ${d.decision}\n- **Rationale**: ${d.rationale}`)
      .join("\n\n");

    return `---
type: reference
para_type: resource
domain: ai-agents
status: active
tags: [pi-ceo, agent-decisions, ${params.projectName}]
created: ${dateStr}
---

# CEO Session: ${params.goal}

**Date**: ${dateStr}
**Project**: ${params.projectName}
**Outcome**: ${params.outcome}

## Goal
${params.goal}

## Decisions

${decisionEntries}

## Outcome
${params.outcome}

---
#pi-ceo #agent-decisions #${params.projectName}
`;
  }
}
