// .pi/extensions/ceo/reasoning.test.ts

import { describe, it, expect } from "vitest";
import { buildPlanPrompt, buildReviewPrompt, buildDecidePrompt, buildVerifyPrompt, parseJSON, isPlanOutput, isDecideOutput, isVerificationOutput } from "./reasoning.js";

describe("reasoning prompts", () => {
  describe("buildPlanPrompt", () => {
    it("includes goal and requirements", () => {
      const prompt = buildPlanPrompt({
        goal: "Build auth",
        requirements: "JWT",
        currentState: "No tasks yet",
        completedTasks: "",
        failedTasks: "",
        learnings: "",
      });
      expect(prompt).toContain("Build auth");
      expect(prompt).toContain("JWT");
      expect(prompt).toContain("PLAN phase");
    });
  });

  describe("buildReviewPrompt", () => {
    it("includes worker output and attempt number", () => {
      const prompt = buildReviewPrompt({
        goal: "Build auth",
        taskDescription: "Design schema",
        agentName: "architect",
        workerOutput: "Schema: users table with id, email, password_hash",
        expectedOutput: "Database schema",
        attemptNumber: 1,
      });
      expect(prompt).toContain("Design schema");
      expect(prompt).toContain("architect");
      expect(prompt).toContain("Attempt: 1 of 2");
    });
  });

  describe("buildDecidePrompt", () => {
    it("includes iteration count and progress", () => {
      const prompt = buildDecidePrompt({
        goal: "Build auth",
        iteration: 3,
        maxIterations: 20,
        completedTasks: "t1: schema designed",
        pendingTasks: "t2: implement endpoints",
        recentDecisions: "Started with schema",
        progressSummary: "Schema done, implementation pending",
      });
      expect(prompt).toContain("Iteration: 3 of 20");
      expect(prompt).toContain("DECIDE phase");
    });
  });

  describe("buildVerifyPrompt", () => {
    it("includes verification context", () => {
      const prompt = buildVerifyPrompt({
        goal: "Build auth",
        requirements: "JWT",
        completedTasksSummary: "All tasks done",
        verifyCommandResults: "All checks passed",
        changedFilesList: "src/auth.ts, tests/auth.test.ts",
      });
      expect(prompt).toContain("verifying");
      expect(prompt).toContain("All checks passed");
    });
  });

  describe("parseJSON", () => {
    it("parses valid JSON from text", () => {
      const text = 'Some text before {"action":"PLAN","rationale":"test","progressPercent":50} after';
      const result = parseJSON(text);
      expect(result).toEqual({ action: "PLAN", rationale: "test", progressPercent: 50 });
    });

    it("returns null for invalid JSON", () => {
      expect(parseJSON("no json here")).toBeNull();
    });

    it("handles JSON wrapped in code blocks", () => {
      const text = '```json\n{"goalMet":true,"confidence":90,"gaps":[],"recommendation":"COMPLETE"}\n```';
      const result = parseJSON(text);
      expect(result).toEqual({ goalMet: true, confidence: 90, gaps: [], recommendation: "COMPLETE" });
    });
  });

  describe("type guards", () => {
    it("isPlanOutput validates correct structure", () => {
      expect(isPlanOutput({ tasks: [], rationale: "test" })).toBe(true);
      expect(isPlanOutput({ tasks: "not-array", rationale: "test" })).toBe(false);
      expect(isPlanOutput({ tasks: [] })).toBe(false);
    });

    it("isDecideOutput validates correct structure", () => {
      expect(isDecideOutput({ action: "PLAN", rationale: "test", progressPercent: 50 })).toBe(true);
      expect(isDecideOutput({ action: 123, rationale: "test" })).toBe(false);
    });

    it("isVerificationOutput validates correct structure", () => {
      expect(isVerificationOutput({ goalMet: true, confidence: 90, gaps: [], recommendation: "COMPLETE" })).toBe(true);
      expect(isVerificationOutput({ goalMet: "yes", confidence: 90 })).toBe(false);
    });
  });
});
