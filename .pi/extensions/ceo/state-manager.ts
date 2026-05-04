// .pi/extensions/ceo/state-manager.ts

import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import type { CEOState, CEODecision } from "./types.js";
import { DEFAULT_MAX_ITERATIONS, LATEST_SESSION_FILE } from "./constants.js";

export class StateManager {
  private readonly sessionsDir: string;

  constructor(sessionsDir: string) {
    this.sessionsDir = sessionsDir;
    fs.mkdirSync(sessionsDir, { recursive: true });
  }

  createSession(goal: string, requirements: string, maxIterations?: number): CEOState {
    const sessionId = crypto.randomUUID();
    const now = new Date().toISOString();

    const state: CEOState = {
      sessionId,
      goal,
      requirements,
      state: "INIT",
      iteration: 0,
      maxIterations: maxIterations ?? DEFAULT_MAX_ITERATIONS,
      plan: { tasks: [], dependencies: {} },
      decisions: [],
      startedAt: now,
      lastUpdatedAt: now,
    };

    this.saveState(state);
    this.writeLatest(sessionId);
    return state;
  }

  saveState(state: CEOState): CEOState {
    const updated: CEOState = {
      ...state,
      lastUpdatedAt: new Date().toISOString(),
    };
    const filePath = this.stateFilePath(updated.sessionId);
    const tmpPath = `${filePath}.tmp`;

    fs.writeFileSync(tmpPath, JSON.stringify(updated, null, 2), "utf-8");
    fs.renameSync(tmpPath, filePath);
    return updated;
  }

  loadSession(sessionId: string): CEOState | null {
    const filePath = this.stateFilePath(sessionId);
    if (!fs.existsSync(filePath)) return null;

    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content) as CEOState;
  }

  loadLatest(): CEOState | null {
    const latestPath = path.join(this.sessionsDir, LATEST_SESSION_FILE);
    if (!fs.existsSync(latestPath)) return null;

    const latest = JSON.parse(fs.readFileSync(latestPath, "utf-8"));
    return this.loadSession(latest.sessionId);
  }

  hasActiveSession(): boolean {
    const state = this.loadLatest();
    if (!state) return false;
    return state.state !== "COMPLETE" && state.state !== "ESCALATE";
  }

  appendDecision(state: CEOState, decision: CEODecision): CEOState {
    const withDecision: CEOState = {
      ...state,
      decisions: [...state.decisions, decision],
    };
    return this.saveState(withDecision);
  }

  transition(state: CEOState, newPhase: CEOState["state"]): CEOState {
    const withPhase: CEOState = { ...state, state: newPhase };
    return this.saveState(withPhase);
  }

  private stateFilePath(sessionId: string): string {
    return path.join(this.sessionsDir, `ceo-state-${sessionId}.json`);
  }

  private writeLatest(sessionId: string): void {
    const latestPath = path.join(this.sessionsDir, LATEST_SESSION_FILE);
    fs.writeFileSync(latestPath, JSON.stringify({ sessionId }), "utf-8");
  }
}
