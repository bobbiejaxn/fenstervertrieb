// .pi/extensions/ceo/integration.test.ts

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { StateManager } from "./state-manager.js";
import { ContextLoader } from "./context-loader.js";
import { MemoryWriter } from "./memory-writer.js";
import { assessProgress, mergePlanUpdate, getReadyTasks, applyReviewDecision, canRetry } from "./orchestrator.js";
import { parseJSON } from "./reasoning.js";
import type { CEOState, PlanOutput } from "./types.js";

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ceo-int-"));
}

describe("CEO Integration", () => {
  let sessionsDir: string;
  let projectDir: string;

  beforeEach(() => {
    sessionsDir = makeTmpDir();
    projectDir = makeTmpDir();
    fs.writeFileSync(path.join(projectDir, "README.md"), "# Test");
  });

  afterEach(() => {
    fs.rmSync(sessionsDir, { recursive: true, force: true });
    fs.rmSync(projectDir, { recursive: true, force: true });
  });

  it("full lifecycle: create, plan, delegate, review, complete — immutable state flow", () => {
    const stateMgr = new StateManager(sessionsDir);
    const contextLoader = new ContextLoader(projectDir);

    // 1. Create session
    const initial = stateMgr.createSession("Add health check endpoint", "GET /health returns 200");
    expect(initial.state).toBe("INIT");

    // 2. PLAN — simulate Opus response
    let state = stateMgr.transition(initial, "PLAN");
    state = stateMgr.saveState({ ...state, iteration: 1 });

    const planOutput: PlanOutput = {
      tasks: [
        { id: "t1", description: "Implement health endpoint", agent: "implementer", blockedBy: [], expectedOutput: "GET /health returns 200" },
        { id: "t2", description: "Write health endpoint test", agent: "test-writer", blockedBy: ["t1"], expectedOutput: "Test for GET /health" },
      ],
      rationale: "Simple endpoint, implement then test",
    };

    const mergedPlan = mergePlanUpdate(state.plan, planOutput);
    state = stateMgr.saveState({ ...state, plan: mergedPlan });
    expect(state.plan.tasks).toHaveLength(2);

    // Verify original wasn't mutated
    expect(initial.plan.tasks).toHaveLength(0);

    // 3. DELEGATE — get ready tasks
    state = stateMgr.transition(state, "DELEGATE");
    const ready = getReadyTasks(state.plan);
    expect(ready).toHaveLength(1);
    expect(ready[0].id).toBe("t1");

    // Simulate worker completion (immutable update)
    const postWorkerTasks = state.plan.tasks.map(t =>
      t.id === "t1" ? { ...t, status: "completed" as const, output: "Created GET /health endpoint returning { status: 'ok' }", attempts: 1 } : t,
    );
    state = stateMgr.saveState({ ...state, plan: { ...state.plan, tasks: postWorkerTasks } });

    // 4. REVIEW — accept t1
    state = stateMgr.transition(state, "REVIEW");
    const t1 = state.plan.tasks.find(t => t.id === "t1")!;
    const reviewedT1 = applyReviewDecision(t1, "ACCEPT", "Looks good");
    const reviewedTasks = state.plan.tasks.map(t => t.id === "t1" ? reviewedT1 : t);
    state = stateMgr.saveState({ ...state, plan: { ...state.plan, tasks: reviewedTasks } });
    expect(state.plan.tasks.find(t => t.id === "t1")!.status).toBe("completed");

    // t2 should now be ready
    const ready2 = getReadyTasks(state.plan);
    expect(ready2).toHaveLength(1);
    expect(ready2[0].id).toBe("t2");

    // Simulate t2 completion
    const postT2Tasks = state.plan.tasks.map(t =>
      t.id === "t2" ? { ...t, status: "completed" as const, output: "Test passes: GET /health returns 200", attempts: 1 } : t,
    );
    state = stateMgr.saveState({ ...state, plan: { ...state.plan, tasks: postT2Tasks } });

    // 5. DECIDE — check progress
    const progress = assessProgress(state);
    expect(progress.completedCount).toBe(2);
    expect(progress.percentComplete).toBe(100);
    expect(progress.isStuck).toBe(false);

    // 6. COMPLETE
    state = stateMgr.transition(state, "COMPLETE");
    expect(state.state).toBe("COMPLETE");

    // 7. Verify resume works
    const loaded = stateMgr.loadLatest();
    expect(loaded).not.toBeNull();
    expect(loaded!.state).toBe("COMPLETE");
  });

  it("detects stuck state after repeated failures", () => {
    const stateMgr = new StateManager(sessionsDir);
    const initial = stateMgr.createSession("Complex feature", "Many requirements");

    const failedTasks = [
      { id: "t1", description: "Task 1", agent: "implementer", status: "failed" as const, attempts: 2, blockedBy: [], expectedOutput: "Result", feedback: "Failed" },
      { id: "t2", description: "Task 2", agent: "implementer", status: "failed" as const, attempts: 2, blockedBy: [], expectedOutput: "Result", feedback: "Failed" },
      { id: "t3", description: "Task 3", agent: "implementer", status: "failed" as const, attempts: 2, blockedBy: [], expectedOutput: "Result", feedback: "Failed" },
    ];
    const state = stateMgr.saveState({ ...initial, plan: { tasks: failedTasks, dependencies: {} } });

    const progress = assessProgress(state);
    expect(progress.isStuck).toBe(true);
  });

  it("sanitizes secrets in worker output before storing", () => {
    const output = "Connected with key sk-abc123def456ghijklmnopqrst to database";
    const sanitized = MemoryWriter.sanitizeOutput(output);
    expect(sanitized).not.toContain("sk-abc123");
    expect(sanitized).toContain("[REDACTED]");
  });

  it("appendDecision does not mutate original state", () => {
    const stateMgr = new StateManager(sessionsDir);
    const initial = stateMgr.createSession("Goal", "Req");
    const decisionCount = initial.decisions.length;

    const updated = stateMgr.appendDecision(initial, {
      iteration: 1,
      phase: "PLAN",
      decision: "Test",
      rationale: "Test",
      timestamp: new Date().toISOString(),
    });

    expect(initial.decisions).toHaveLength(decisionCount);
    expect(updated.decisions).toHaveLength(decisionCount + 1);
  });

  it("builds Obsidian note with all required fields", () => {
    const note = MemoryWriter.buildObsidianNote({
      goal: "Build auth",
      decisions: [
        { iteration: 1, phase: "PLAN" as const, decision: "Start with schema", rationale: "Need clarity", timestamp: "2026-03-23T10:00:00Z" },
      ],
      outcome: "Completed successfully",
      projectName: "test-project",
    });
    expect(note).toContain("#pi-ceo");
    expect(note).toContain("Build auth");
    expect(note).toContain("Completed successfully");
    expect(note).toContain("test-project");
  });
});
