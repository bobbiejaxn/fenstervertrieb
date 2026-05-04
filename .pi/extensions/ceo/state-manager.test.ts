// .pi/extensions/ceo/state-manager.test.ts

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { StateManager } from "./state-manager.js";
import type { CEOState } from "./types.js";

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ceo-test-"));
}

function makeState(overrides: Partial<CEOState> = {}): CEOState {
  return {
    sessionId: "test-session-1",
    goal: "Build auth system",
    requirements: "JWT, PostgreSQL",
    state: "INIT",
    iteration: 0,
    maxIterations: 20,
    plan: { tasks: [], dependencies: {} },
    decisions: [],
    startedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("StateManager", () => {
  let tmpDir: string;
  let mgr: StateManager;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    mgr = new StateManager(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("createSession", () => {
    it("creates a new state file and latest pointer", () => {
      const state = mgr.createSession("Build auth", "JWT");
      expect(state.goal).toBe("Build auth");
      expect(state.requirements).toBe("JWT");
      expect(state.state).toBe("INIT");
      expect(state.iteration).toBe(0);

      const latestPath = path.join(tmpDir, "latest.json");
      expect(fs.existsSync(latestPath)).toBe(true);

      const latest = JSON.parse(fs.readFileSync(latestPath, "utf-8"));
      expect(latest.sessionId).toBe(state.sessionId);
    });
  });

  describe("saveState", () => {
    it("persists state to disk and returns updated state", () => {
      const state = makeState();
      const saved = mgr.saveState(state);

      const filePath = path.join(tmpDir, `ceo-state-${saved.sessionId}.json`);
      expect(fs.existsSync(filePath)).toBe(true);

      const loaded = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      expect(loaded.goal).toBe(state.goal);
    });

    it("updates lastUpdatedAt without mutating original", () => {
      const state = makeState({ lastUpdatedAt: "old" });
      const saved = mgr.saveState(state);

      expect(state.lastUpdatedAt).toBe("old");
      expect(saved.lastUpdatedAt).not.toBe("old");
    });
  });

  describe("loadLatest", () => {
    it("returns null when no sessions exist", () => {
      expect(mgr.loadLatest()).toBeNull();
    });

    it("loads the latest session", () => {
      const state = mgr.createSession("Test goal", "");
      const loaded = mgr.loadLatest();
      expect(loaded).not.toBeNull();
      expect(loaded!.sessionId).toBe(state.sessionId);
    });
  });

  describe("hasActiveSession", () => {
    it("returns false when no sessions exist", () => {
      expect(mgr.hasActiveSession()).toBe(false);
    });

    it("returns true for non-terminal states", () => {
      const state = mgr.createSession("Goal", "");
      mgr.saveState({ ...state, state: "DELEGATE" });
      expect(mgr.hasActiveSession()).toBe(true);
    });

    it("returns false for COMPLETE state", () => {
      const state = mgr.createSession("Goal", "");
      mgr.saveState({ ...state, state: "COMPLETE" });
      expect(mgr.hasActiveSession()).toBe(false);
    });
  });

  describe("appendDecision", () => {
    it("adds decision to state and saves", () => {
      const state = mgr.createSession("Goal", "");
      const updated = mgr.appendDecision(state, {
        iteration: 1,
        phase: "PLAN",
        decision: "Start with schema",
        rationale: "Need clarity first",
        timestamp: new Date().toISOString(),
      });
      expect(updated.decisions).toHaveLength(1);
      expect(updated.decisions[0].decision).toBe("Start with schema");
    });
  });
});
