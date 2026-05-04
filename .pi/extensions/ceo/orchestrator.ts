// .pi/extensions/ceo/orchestrator.ts
// Inlined from ../../lib/orchestrator/ (goal-tracker, adaptive-planner, output-reviewer)
// These modules are only used by the CEO extension. Keeping them here avoids
// requiring setup.sh / update.sh to sync .pi/lib/ to target projects.

import type { CEOPlan, CEOTask, CEOState, PlanOutput } from "./types.js";
import { MAX_CONSECUTIVE_NO_PROGRESS, MAX_TASK_ATTEMPTS } from "./constants.js";

// ─── goal-tracker ───────────────────────────────────────────────

export interface ProgressReport {
  completedCount: number;
  totalCount: number;
  failedCount: number;
  pendingCount: number;
  percentComplete: number;
  isStuck: boolean;
  stuckReason?: string;
}

export function assessProgress(state: CEOState): ProgressReport {
  const tasks = state.plan.tasks;
  const completed = tasks.filter(t => t.status === "completed").length;
  const failed = tasks.filter(t => t.status === "failed").length;
  const pending = tasks.filter(t => t.status === "pending").length;
  const total = tasks.length;

  const percentComplete = total > 0 ? Math.round((completed / total) * 100) : 0;

  const stuck = detectStuck(state);

  return {
    completedCount: completed,
    totalCount: total,
    failedCount: failed,
    pendingCount: pending,
    percentComplete,
    isStuck: stuck.stuck,
    stuckReason: stuck.reason,
  };
}

function detectStuck(state: CEOState): { stuck: boolean; reason?: string } {
  const recentDecisions = state.decisions.slice(-MAX_CONSECUTIVE_NO_PROGRESS);

  if (recentDecisions.length >= MAX_CONSECUTIVE_NO_PROGRESS) {
    const allPlan = recentDecisions.every(d => d.phase === "PLAN");
    if (allPlan) {
      return { stuck: true, reason: `Last ${MAX_CONSECUTIVE_NO_PROGRESS} iterations all produced new plans without progress` };
    }
  }

  const tasksWithMaxAttempts = state.plan.tasks.filter(t => t.attempts >= 2 && t.status === "failed");
  if (tasksWithMaxAttempts.length >= 3) {
    return { stuck: true, reason: `${tasksWithMaxAttempts.length} tasks failed after max attempts` };
  }

  return { stuck: false };
}

// ─── adaptive-planner ───────────────────────────────────────────

export function mergePlanUpdate(currentPlan: CEOPlan, planOutput: PlanOutput): CEOPlan {
  const existingIds = new Set(currentPlan.tasks.map(t => t.id));
  const newTasks: CEOTask[] = [];

  for (const planTask of planOutput.tasks) {
    if (existingIds.has(planTask.id)) continue;

    newTasks.push({
      id: planTask.id,
      description: planTask.description,
      agent: planTask.agent,
      status: "pending",
      attempts: 0,
      blockedBy: planTask.blockedBy,
      expectedOutput: planTask.expectedOutput,
    });
  }

  const updatedDeps = { ...currentPlan.dependencies };
  for (const task of newTasks) {
    if (task.blockedBy.length > 0) {
      updatedDeps[task.id] = task.blockedBy;
    }
  }

  return {
    tasks: [...currentPlan.tasks, ...newTasks],
    dependencies: updatedDeps,
  };
}

export function getReadyTasks(plan: CEOPlan): CEOTask[] {
  const completedIds = new Set(
    plan.tasks.filter(t => t.status === "completed").map(t => t.id),
  );

  return plan.tasks.filter(task => {
    if (task.status !== "pending") return false;
    const deps = plan.dependencies[task.id] ?? task.blockedBy;
    return deps.every(depId => completedIds.has(depId));
  });
}

// ─── output-reviewer ────────────────────────────────────────────

export function canRetry(task: CEOTask): boolean {
  return task.attempts < MAX_TASK_ATTEMPTS;
}

export function formatReviewBatch(tasks: CEOTask[]): string {
  return tasks
    .filter(t => t.status === "completed" && t.output)
    .map(t => `[${t.id}] ${t.agent}: ${t.description}\nOutput: ${t.output}`)
    .join("\n\n---\n\n");
}

export function applyReviewDecision(
  task: CEOTask,
  verdict: "ACCEPT" | "RETRY" | "REDELEGATE" | "ESCALATE",
  feedback: string,
  newAgent?: string,
): CEOTask {
  switch (verdict) {
    case "ACCEPT":
      return { ...task, status: "completed" };
    case "RETRY":
      return {
        ...task,
        status: "pending",
        feedback,
        output: undefined,
      };
    case "REDELEGATE":
      return {
        ...task,
        status: "pending",
        agent: newAgent ?? task.agent,
        feedback,
        output: undefined,
        attempts: 0,
      };
    case "ESCALATE":
      return { ...task, status: "failed", feedback };
    default:
      return task;
  }
}
