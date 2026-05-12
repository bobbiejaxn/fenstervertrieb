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

import { existsSync, mkdirSync, appendFileSync, writeFileSync, readFileSync, unlinkSync, statSync } from "node:fs";
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
  cache_read: number;
  cache_written: number;
  cost_usd: number;
  // Read deduplication metrics (Proposal 023)
  files_read: number;
  rereads: number;
}

/**
 * Infer workflow phase from the pi command-line arguments.
 *
 * When TRACE_PHASE isn't explicitly set, we look at the prompt template
 * name (passed as `--prompt <name>`) to label the phase. This replaces
 * the "unknown" default for 97% of runs.
 */
function inferPhaseFromArgs(): string {
  const args = process.argv || [];
  const promptIdx = args.indexOf("--prompt");
  if (promptIdx !== -1 && promptIdx + 1 < args.length) {
    const promptName = args[promptIdx + 1];
    const map: Record<string, string> = {
      ship: "ship",
      "ship-fast": "ship",
      fix: "fix",
      "fix-bug": "fix",
      "fix-gh-issue": "fix",
      review: "review",
      plan: "plan",
      tdd: "tdd",
      prime: "session",
      verify: "verify",
      evolve: "evolve",
      deliberate: "deliberate",
      idea: "idea",
      research: "research",
      "deep-research": "research",
      status: "session",
    };
    return map[promptName] || promptName;
  }
  return "";
}

export default function traceRecorder(pi: ExtensionAPI) {
  // Guard: disabled or missing config
  if (process.env.TRACE_DISABLED === "true") return;

  const runId = process.env.TRACE_RUN_ID || "";
  const projectRoot = process.env.AGENT_PROJECT_ROOT || process.cwd();

  // ── Agent name: env var > --model CLI arg > default ───────────
  // Detecting --model lets us distinguish main-glm-5.1 vs main-opus in traces.
  let agentName = process.env.TRACE_AGENT_NAME || "";
  if (!agentName) {
    const argv = process.argv || [];
    const modelIdx = argv.indexOf("--model");
    if (modelIdx !== -1 && modelIdx + 1 < argv.length) {
      agentName = `main-${argv[modelIdx + 1]}`;
    } else {
      agentName = "orchestrator";
    }
  }

  // Infer phase from TRACE_PHASE env var, or from the prompt command that started this session.
  // Default to "interactive" (most common case) instead of "unknown".
  const phase = process.env.TRACE_PHASE || inferPhaseFromArgs() || "interactive";

  // ── Run ID with stale-file protection ─────────────────────────
  // If a previous session crashed without cleaning up current-run-id,
  // a new session could inherit a stale ID and write mixed traces.
  // Guard: ignore inherited IDs older than 24 hours.
  const runIdFile = join(projectRoot, ".pi", "traces", "current-run-id");
  let inheritedRunId = "";
  try {
    if (!runId && existsSync(runIdFile)) {
      const stat = statSync(runIdFile);
      const ageMs = Date.now() - stat.mtimeMs;
      if (ageMs < 24 * 3600 * 1000) {
        inheritedRunId = readFileSync(runIdFile, "utf-8").trim();
      } else {
        unlinkSync(runIdFile); // Clean up stale file
      }
    }
  } catch {
    // Ignore — will generate fresh ID below
  }

  const effectiveRunId = runId || inheritedRunId || `run-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}`;

  // ── Productivity tracking ────────────────────────────────────
  // Only write trace files for sessions that actually produce work.
  // 97% of sessions are empty (user opens pi, does nothing, exits).
  // Deferring filesystem writes until first real work avoids
  // bloating the index with zero-content runs.
  let isProductive = false;
  let dirCreated = false;

  function ensureDir() {
    if (dirCreated) return;
    mkdirSync(tracesDir, { recursive: true });
    dirCreated = true;
  }

  // ── Run ID propagation ───────────────────────────────────────
  // Write current run ID to a file so subagents can inherit it.
  // This ensures all agents in a /ceo or /ship run land in the
  // same trace directory. File is cleared on session end.
  // Write current run ID for subagent inheritance (dir already ensured above)
  try {
    mkdirSync(join(projectRoot, ".pi", "traces"), { recursive: true });
    writeFileSync(runIdFile, effectiveRunId);
  } catch {
    // Silent — subagents will generate their own IDs
  }

  // Trace directory — created lazily on first productive event
  const tracesDir = join(projectRoot, ".pi", "traces", "runs", effectiveRunId);

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
    cache_read: 0,
    cache_written: 0,
    cost_usd: 0,
    files_read: 0,
    rereads: 0,
  };

  function writeTrace(entry: Omit<TraceEntry, "timestamp" | "agent" | "phase" | "run_id">) {
    // Skip writing for unproductive sessions
    if (!isProductive) return;
    const full: TraceEntry = {
      timestamp: new Date().toISOString(),
      agent: agentName,
      phase,
      run_id: effectiveRunId,
      ...entry,
    };
    try {
      ensureDir();
      appendFileSync(traceFile, JSON.stringify(full) + "\n");
    } catch {
      // Silent failure — never break the agent
    }
  }

  function saveManifest() {
    // Skip for unproductive sessions
    if (!isProductive) return;
    try {
      ensureDir();
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
    // Don't write yet — wait until session proves productive
  });

  // ── Tool calls ───────────────────────────────────────────────

  // Track file reads for deduplication metrics (Proposal 023)
  const readPaths = new Set<string>();

  pi.on("tool_call", async (event) => {
    // Mark as productive on first tool call
    if (!isProductive) {
      isProductive = true;
      ensureDir();
    }
    manifest.tool_calls++;

    // Track read deduplication
    if (event.toolName === "read" && event.input?.path) {
      const p = event.input.path as string;
      if (readPaths.has(p)) {
        manifest.rereads++;
      } else {
        readPaths.add(p);
        manifest.files_read++;
      }
    }

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

  // Periodic flush: save manifest + update index for productive sessions.
  // Ensures interrupted sessions still have partial data in the index.
  const flushInterval = setInterval(() => {
    if (isProductive && manifest.tool_calls > 0) {
      saveManifest();
      updateIndex(projectRoot, effectiveRunId, manifest);
    }
  }, 30_000); // flush every 30 seconds

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

  // ── Usage tracking (via message_end) ────────────────────────
  // The pi framework emits "message_end" after each assistant response
  // with the full AgentMessage including usage data.
  // The old "usage" event never existed — it was a dead handler.

  pi.on("message_end", async (event: any) => {
    const msg = event.message;
    if (!msg || msg.role !== "assistant") return;

    // Mark as productive if we get an assistant message with tokens
    const usage = msg.usage;
    if (!isProductive && usage && (usage.input > 0 || usage.output > 0)) {
      isProductive = true;
      ensureDir();
    }
    if (usage) {
      if (usage.input) manifest.tokens_in += usage.input;
      if (usage.output) manifest.tokens_out += usage.output;
      // Cache reads/writes tracked separately — NOT added to tokens_in.
      // They represent re-sent context, not new tokens. Including them
      // overcounts by 37-1200x on long sessions (Proposal 021).
      if (usage.cacheRead) manifest.cache_read += usage.cacheRead;
      if (usage.cacheWrite) manifest.cache_written += usage.cacheWrite;
      if (usage.cost?.total) manifest.cost_usd += usage.cost.total;
    }

    // Track model name from the message
    if (msg.model) manifest.model = msg.model;

    writeTrace({
      type: "message",
      data: {
        role: msg.role,
        tokensIn: usage?.input ?? 0,
        tokensOut: usage?.output ?? 0,
        cacheRead: usage?.cacheRead ?? 0,
        cacheWrite: usage?.cacheWrite ?? 0,
        cost: usage?.cost?.total ?? 0,
        model: msg.model ?? "",
      },
    });
  });

  // ── Session end ──────────────────────────────────────────────

  pi.on("session_end", async () => {
    clearInterval(flushInterval);

    // Always clean up the run ID file
    try {
      if (existsSync(runIdFile)) unlinkSync(runIdFile);
    } catch {
      // Silent
    }

    // Skip trace writes for unproductive sessions
    if (!isProductive) return;

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
        cache_read: manifest.cache_read,
        cache_written: manifest.cache_written,
        cost_usd: manifest.cost_usd,
        files_read: manifest.files_read,
        rereads: manifest.rereads,
      },
    });

    saveManifest();

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
