// .pi/extensions/ceo/context-loader.test.ts

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { ContextLoader } from "./context-loader.js";
import type { CEOState } from "./types.js";

function makeTmpProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ceo-ctx-"));
  fs.writeFileSync(path.join(dir, "README.md"), "# Test Project\nA test project.");
  fs.writeFileSync(path.join(dir, "package.json"), '{"name":"test","version":"1.0.0"}');
  fs.mkdirSync(path.join(dir, "src"), { recursive: true });
  fs.writeFileSync(path.join(dir, "src", "index.ts"), 'export function main() { return "hello"; }');
  return dir;
}

function makeState(): CEOState {
  return {
    sessionId: "test-1",
    goal: "Build auth system",
    requirements: "JWT, PostgreSQL",
    state: "PLAN",
    iteration: 1,
    maxIterations: 20,
    plan: {
      tasks: [
        { id: "t1", description: "Design schema", agent: "architect", status: "completed", output: "Schema designed.", attempts: 1, blockedBy: [], expectedOutput: "Schema" },
      ],
      dependencies: {},
    },
    decisions: [
      { iteration: 1, phase: "PLAN", decision: "Start with schema", rationale: "Need clarity", timestamp: new Date().toISOString() },
    ],
    startedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
  };
}

describe("ContextLoader", () => {
  let tmpDir: string;
  let loader: ContextLoader;

  beforeEach(() => {
    tmpDir = makeTmpProject();
    loader = new ContextLoader(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("buildCEOContext", () => {
    it("returns string with goal and requirements", () => {
      const state = makeState();
      const context = loader.buildCEOContext(state);
      expect(context).toContain("Build auth system");
      expect(context).toContain("JWT, PostgreSQL");
    });

    it("includes completed task outputs", () => {
      const state = makeState();
      const context = loader.buildCEOContext(state);
      expect(context).toContain("Schema designed.");
    });

    it("includes recent decisions", () => {
      const state = makeState();
      const context = loader.buildCEOContext(state);
      expect(context).toContain("Start with schema");
    });
  });

  describe("buildWorkerContext", () => {
    it("returns context scoped for worker task", () => {
      const state = makeState();
      const task = state.plan.tasks[0];
      const context = loader.buildWorkerContext(state, task);
      expect(context).toContain("Build auth system");
      expect(context).toContain("Design schema");
    });
  });

  describe("getProjectSummary", () => {
    it("includes file tree information", () => {
      const summary = loader.getProjectSummary();
      expect(summary).toContain("README.md");
      expect(summary).toContain("package.json");
    });
  });
});
