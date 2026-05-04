/**
 * Trace Recorder Extension
 *
 * Silently captures every agent interaction — tool calls, results,
 * assistant messages, costs — and writes structured JSONL traces
 * to .pi/traces/runs/<run-id>/<agent>.jsonl
 *
 * This is the observability layer that powers the Harness Evolver.
 * It adds zero overhead to the agent's context window.
 *
 * Environment variables:
 *   TRACE_RUN_ID      — unique run identifier (e.g. "20260324-ship-auth")
 *   TRACE_AGENT_NAME  — which agent this is (e.g. "implementer")
 *   TRACE_PHASE       — workflow phase (e.g. "ship.implement")
 *   TRACE_DISABLED    — set to "true" to disable recording
 *   AGENT_PROJECT_ROOT — project root path
 */

import { existsSync, mkdirSync, appendFileSync, writeFileSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

interface TraceEntry {
  timestamp: string;
  type: "tool_call" | "tool_result" | "message" | "error" | "session_start" | "session_end";
  agent: string;
  phase: string;
  run_id: string;
  data: Record<string, unknown>;
}

interface RunManifest {
  run_id: string;
  agent: string;
  phase: string;
  model: string;
  started: string;
  ended?: string;
  duration_ms?: number;
  tool_calls: number;
  errors: number;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
}

export default function traceRecorder(pi: ExtensionAPI) {
  // Guard: disabled or missing config
  if (process.env.TRACE_DISABLED === "true") return;

  const runId = process.env.TRACE_RUN_ID || "";
  const agentName = process.env.TRACE_AGENT_NAME || "unknown";
  const phase = process.env.TRACE_PHASE || "unknown";
  const projectRoot = process.env.AGENT_PROJECT_ROOT || process.cwd();

  // If no run ID, generate one from timestamp
  const effectiveRunId = runId || `run-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}`;

  // ── Run ID propagation ───────────────────────────────────────
  // Write current run ID to a file so subagents can inherit it.
  // This ensures all agents in a /ceo or /ship run land in the
  // same trace directory. File is cleared on session end.
  const runIdFile = join(projectRoot, ".pi", "traces", "current-run-id");
  try {
    mkdirSync(join(projectRoot, ".pi", "traces"), { recursive: true });
    writeFileSync(runIdFile, effectiveRunId);
  } catch {
    // Silent — subagents will generate their own IDs
  }

  // Ensure trace directory exists
  const tracesDir = join(projectRoot, ".pi", "traces", "runs", effectiveRunId);
  mkdirSync(tracesDir, { recursive: true });

  const traceFile = join(tracesDir, `${agentName}.jsonl`);
  const manifestFile = join(tracesDir, "manifest.json");

  // Manifest tracking
  const manifest: RunManifest = {
    run_id: effectiveRunId,
    agent: agentName,
    phase,
    model: "",
    started: new Date().toISOString(),
    tool_calls: 0,
    errors: 0,
    tokens_in: 0,
    tokens_out: 0,
    cost_usd: 0,
  };

  function writeTrace(entry: Omit<TraceEntry, "timestamp" | "agent" | "phase" | "run_id">) {
    const full: TraceEntry = {
      timestamp: new Date().toISOString(),
      agent: agentName,
      phase,
      run_id: effectiveRunId,
      ...entry,
    };
    try {
      appendFileSync(traceFile, JSON.stringify(full) + "\n");
    } catch {
      // Silent failure — never break the agent
    }
  }

  function saveManifest() {
    try {
      // Read existing manifest or create new
      let manifests: RunManifest[] = [];
      if (existsSync(manifestFile)) {
        try {
          manifests = JSON.parse(readFileSync(manifestFile, "utf-8"));
        } catch {
          manifests = [];
        }
      }
      // Update or append this agent's manifest
      const idx = manifests.findIndex((m) => m.agent === agentName);
      if (idx >= 0) {
        manifests[idx] = manifest;
      } else {
        manifests.push(manifest);
      }
      writeFileSync(manifestFile, JSON.stringify(manifests, null, 2));
    } catch {
      // Silent
    }
  }

  // ── Session start ────────────────────────────────────────────

  pi.on("session_start", async (_event, ctx) => {
    writeTrace({
      type: "session_start",
      data: {
        cwd: ctx.cwd,
        run_id: effectiveRunId,
        agent: agentName,
        phase,
      },
    });
    saveManifest();
  });

  // ── Tool calls ───────────────────────────────────────────────

  pi.on("tool_call", async (event) => {
    manifest.tool_calls++;
    writeTrace({
      type: "tool_call",
      data: {
        tool: event.toolName,
        input: event.input,
        call_id: (event as any).toolCallId || "",
      },
    });
    return undefined; // Never block
  });

  // ── Tool results ─────────────────────────────────────────────

  pi.on("tool_result", async (event) => {
    const isError = event.result && typeof event.result === "string" && (
      event.result.includes("Error:") ||
      event.result.includes("ENOENT") ||
      event.result.includes("exit code")
    );

    if (isError) manifest.errors++;

    writeTrace({
      type: "tool_result",
      data: {
        tool: event.toolName,
        call_id: (event as any).toolCallId || "",
        // Truncate large results to keep traces manageable
        result: typeof event.result === "string" && event.result.length > 2000
          ? event.result.slice(0, 2000) + `\n... [truncated, ${event.result.length} chars total]`
          : event.result,
        is_error: isError,
      },
    });
    return undefined;
  });

  // ── Usage tracking ───────────────────────────────────────────

  pi.on("usage", async (event: any) => {
    if (event.tokensIn) manifest.tokens_in += event.tokensIn;
    if (event.tokensOut) manifest.tokens_out += event.tokensOut;
    if (event.cost) manifest.cost_usd += event.cost;
    if (event.model) manifest.model = event.model;
  });

  // ── Session end ──────────────────────────────────────────────

  pi.on("session_end", async () => {
    manifest.ended = new Date().toISOString();
    manifest.duration_ms = new Date(manifest.ended).getTime() - new Date(manifest.started).getTime();

    writeTrace({
      type: "session_end",
      data: {
        duration_ms: manifest.duration_ms,
        tool_calls: manifest.tool_calls,
        errors: manifest.errors,
        tokens_in: manifest.tokens_in,
        tokens_out: manifest.tokens_out,
        cost_usd: manifest.cost_usd,
      },
    });

    saveManifest();

    // Clear the current-run-id file so the next unrelated run
    // doesn't inherit this run's ID
    try {
      if (existsSync(runIdFile)) unlinkSync(runIdFile);
    } catch {
      // Silent
    }

    // Update the global index
    updateIndex(projectRoot, effectiveRunId, manifest);
  });
}

/**
 * Append/update this run in the global traces index.
 */
function updateIndex(projectRoot: string, runId: string, manifest: RunManifest) {
  const indexFile = join(projectRoot, ".pi", "traces", "index.json");
  const indexDir = join(projectRoot, ".pi", "traces");

  try {
    mkdirSync(indexDir, { recursive: true });

    let index: Record<string, unknown>[] = [];
    if (existsSync(indexFile)) {
      try {
        index = JSON.parse(readFileSync(indexFile, "utf-8"));
      } catch {
        index = [];
      }
    }

    // Find or create run entry
    let runEntry = index.find((r: any) => r.run_id === runId) as any;
    if (!runEntry) {
      runEntry = {
        run_id: runId,
        started: manifest.started,
        agents: [],
        total_cost_usd: 0,
        total_tokens_in: 0,
        total_tokens_out: 0,
        total_tool_calls: 0,
        total_errors: 0,
      };
      index.push(runEntry);
    }

    // Update agent entry within run
    if (!runEntry.agents.includes(manifest.agent)) {
      runEntry.agents.push(manifest.agent);
    }
    runEntry.total_cost_usd += manifest.cost_usd;
    runEntry.total_tokens_in += manifest.tokens_in;
    runEntry.total_tokens_out += manifest.tokens_out;
    runEntry.total_tool_calls += manifest.tool_calls;
    runEntry.total_errors += manifest.errors;
    runEntry.ended = manifest.ended;
    runEntry.duration_ms = manifest.duration_ms;

    writeFileSync(indexFile, JSON.stringify(index, null, 2));
  } catch {
    // Silent — never break the agent
  }
}
