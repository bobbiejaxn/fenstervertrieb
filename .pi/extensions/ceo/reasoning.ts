// .pi/extensions/ceo/reasoning.ts

import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { CEO_MODEL } from "./constants.js";
import type { PlanOutput, ReviewOutput, DecideOutput, VerificationOutput } from "./types.js";

interface PlanPromptParams {
  goal: string;
  requirements: string;
  currentState: string;
  completedTasks: string;
  failedTasks: string;
  learnings: string;
}

interface ReviewPromptParams {
  goal: string;
  taskDescription: string;
  agentName: string;
  workerOutput: string;
  expectedOutput: string;
  attemptNumber: number;
}

interface DecidePromptParams {
  goal: string;
  iteration: number;
  maxIterations: number;
  completedTasks: string;
  pendingTasks: string;
  recentDecisions: string;
  progressSummary: string;
}

interface VerifyPromptParams {
  goal: string;
  requirements: string;
  completedTasksSummary: string;
  verifyCommandResults: string;
  changedFilesList: string;
}

export function buildPlanPrompt(params: PlanPromptParams): string {
  return `You are in the PLAN phase. Analyze the goal and current state, then produce a task graph.

## Goal
${params.goal}

## Requirements
${params.requirements}

## Current State
${params.currentState}

## Completed Tasks
${params.completedTasks || "(none)"}

## Failed Tasks
${params.failedTasks || "(none)"}

## Learnings
${params.learnings || "(none)"}

## Instructions
Produce a JSON object with this exact schema:
{
  "tasks": [
    {
      "id": "t1",
      "description": "What to do",
      "agent": "agent-name",
      "blockedBy": [],
      "expectedOutput": "What you expect back"
    }
  ],
  "rationale": "Why this plan"
}

Available agents: architect, software-architect, implementer, fixer, test-writer, unit-test-writer, reviewer, security-reviewer, web-researcher, researcher, deep-researcher, debug-agent.

Team lead agents (use when tasks span 2+ domains or touch 3+ files):
- frontend-lead — use when tasks touch UI components, routes, styles, or client-side logic
- backend-lead — use when tasks touch API routes, database schema, server logic
- validation-lead — use when tasks need coordinated review (code + security + readiness)

Complexity routing rules:
1. If a task touches ONLY frontend files → agent: "implementer" (flat)
2. If a task touches ONLY backend/schema files → agent: "implementer" (flat)
3. If tasks span BOTH frontend AND backend → split into sub-tasks OR assign to the relevant team lead
4. If 3+ files across 2+ domains → prefer team leads (frontend-lead, backend-lead)
5. Final validation always goes to validation-lead for multi-domain features
6. Simple single-domain tasks stay flat (implementer, reviewer, etc.)

Respond with ONLY the JSON object.`;
}

export function buildReviewPrompt(params: ReviewPromptParams): string {
  return `You are in the REVIEW phase. Evaluate the completed worker output.

## Goal
${params.goal}

## Task
${params.taskDescription}

## Worker
${params.agentName}

## Worker Output
${params.workerOutput}

## Expected Output
${params.expectedOutput}

## Attempt: ${params.attemptNumber} of 2

## Instructions
For this task, decide: ACCEPT, RETRY, REDELEGATE, or ESCALATE.

Produce a JSON object with this exact schema:
{
  "decisions": [
    {
      "taskId": "t1",
      "verdict": "ACCEPT",
      "feedback": "Reason for decision",
      "newAgent": null
    }
  ]
}

- ACCEPT: Output meets quality bar
- RETRY: Fixable issues, provide feedback for next attempt
- REDELEGATE: Wrong approach, optionally suggest newAgent
- ESCALATE: Blocked, needs human input

Respond with ONLY the JSON object.`;
}

export function buildDecidePrompt(params: DecidePromptParams): string {
  return `You are in the DECIDE phase. Determine the next action.

## Goal
${params.goal}

## Iteration: ${params.iteration} of ${params.maxIterations}

## Completed Tasks
${params.completedTasks || "(none)"}

## Pending Tasks
${params.pendingTasks || "(none)"}

## Recent Decisions
${params.recentDecisions || "(none)"}

## Progress Assessment
${params.progressSummary}

## Instructions
Decide: PLAN (more work needed), VERIFY (check goal completion), or ESCALATE (stuck).

Produce a JSON object with this exact schema:
{
  "action": "PLAN",
  "rationale": "Why this decision",
  "progressPercent": 50
}

Respond with ONLY the JSON object.`;
}

export function buildVerifyPrompt(params: VerifyPromptParams): string {
  return `You are verifying whether the goal has been achieved.

## Goal
${params.goal}

## Requirements
${params.requirements}

## Completed Work Summary
${params.completedTasksSummary}

## Automated Check Results
${params.verifyCommandResults}

## Files Changed
${params.changedFilesList}

## Instructions
Assess whether the goal is met. Produce a JSON object:
{
  "goalMet": true,
  "confidence": 90,
  "gaps": [],
  "recommendation": "COMPLETE"
}

- recommendation: COMPLETE (goal met), ITERATE (more work), or ESCALATE (stuck)
- confidence: 0-100

Respond with ONLY the JSON object.`;
}

export function parseJSON(text: string): Record<string, unknown> | null {
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch { /* fall through */ }
  }

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch { /* fall through */ }
  }

  return null;
}

// Type guards for parsed reasoning output

export function isPlanOutput(obj: Record<string, unknown>): obj is PlanOutput {
  return Array.isArray(obj.tasks) && typeof obj.rationale === "string";
}

export function isReviewOutput(obj: Record<string, unknown>): obj is ReviewOutput {
  return Array.isArray(obj.decisions);
}

export function isDecideOutput(obj: Record<string, unknown>): obj is DecideOutput {
  return typeof obj.action === "string" && typeof obj.rationale === "string";
}

export function isVerificationOutput(obj: Record<string, unknown>): obj is VerificationOutput {
  return typeof obj.goalMet === "boolean" && typeof obj.confidence === "number";
}

export async function spawnCEOReasoning(
  cwd: string,
  agentPromptPath: string,
  userPrompt: string,
  signal?: AbortSignal,
): Promise<string> {
  const args = [
    "--mode", "json",
    "-p",
    "--no-session",
    "--model", CEO_MODEL,
  ];

  if (agentPromptPath && fs.existsSync(agentPromptPath)) {
    args.push("--append-system-prompt", agentPromptPath);
  }

  args.push(userPrompt);

  return new Promise<string>((resolve, reject) => {
    const proc = spawn("pi", args, {
      cwd,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => { stdout += data.toString(); });
    proc.stderr.on("data", (data) => { stderr += data.toString(); });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`CEO reasoning failed (exit ${code}): ${stderr}`));
        return;
      }

      const messages: Array<Record<string, unknown>> = stdout
        .split("\n")
        .filter(line => line.trim())
        .map(line => {
          try { return JSON.parse(line) as Record<string, unknown>; } catch { return null; }
        })
        .filter((m): m is Record<string, unknown> => m !== null);

      const lastAssistant = messages
        .filter(m => m.type === "message_end" && (m.message as Record<string, unknown>)?.role === "assistant")
        .pop();

      const msgContent = (lastAssistant?.message as Record<string, unknown>)?.content;
      if (Array.isArray(msgContent)) {
        const textParts = (msgContent as Array<{ type: string; text?: string }>)
          .filter(p => p.type === "text")
          .map(p => p.text ?? "");
        resolve(textParts.join("\n"));
      } else {
        resolve(stdout);
      }
    });

    proc.on("error", (err) => reject(err));

    if (signal) {
      const kill = () => {
        proc.kill("SIGTERM");
        setTimeout(() => { if (!proc.killed) proc.kill("SIGKILL"); }, 5000);
      };
      if (signal.aborted) kill();
      else signal.addEventListener("abort", kill, { once: true });
    }
  });
}
