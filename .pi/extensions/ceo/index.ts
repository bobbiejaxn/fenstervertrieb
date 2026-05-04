// .pi/extensions/ceo/index.ts

import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
import { execSync } from "node:child_process";
import { Type } from "@sinclair/typebox";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";
import { discoverAgents, type AgentConfig } from "../subagent/agents.js";

import type {
  CEOState,
  CEOPlan,
  CEOTask,
  PlanOutput,
  ReviewOutput,
  DecideOutput,
  VerificationOutput,
} from "./types.js";
import {
  DEFAULT_MAX_ITERATIONS,
  SOFT_WARNING_BUFFER,
  SESSIONS_DIR,
  VERIFICATION_CONFIDENCE_THRESHOLD,
} from "./constants.js";
import { StateManager } from "./state-manager.js";
import { ContextLoader } from "./context-loader.js";
import { MemoryWriter } from "./memory-writer.js";
import {
  buildPlanPrompt,
  buildReviewPrompt,
  buildDecidePrompt,
  buildVerifyPrompt,
  parseJSON,
  isPlanOutput,
  isReviewOutput,
  isDecideOutput,
  isVerificationOutput,
  spawnCEOReasoning,
} from "./reasoning.js";
import {
  assessProgress,
  mergePlanUpdate,
  getReadyTasks,
  canRetry,
  applyReviewDecision,
} from "./orchestrator.js";
import { delegateParallel } from "./worker-delegate.js";

const CEO_MAX_CONCURRENCY = 4;

interface ToolCallResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

type UpdateCallback = (partial: ToolCallResult) => void;

const CEOParams = Type.Object({
  goal: Type.Optional(Type.String({ description: "High-level goal for the CEO to achieve" })),
  requirements: Type.Optional(Type.String({ description: "Additional requirements or constraints" })),
  resume: Type.Optional(Type.Boolean({ description: "Resume the latest CEO session" })),
  maxIterations: Type.Optional(Type.Number({ description: "Maximum iterations (default: 20)" })),
});

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "ceo",
    label: "CEO Agent",
    description: [
      "Autonomous goal-driven orchestration agent.",
      "Receives a high-level goal, plans tasks, delegates to worker agents,",
      "reviews outputs, and iterates until the goal is achieved.",
      "Uses: goal (new session) or resume: true (continue latest session).",
    ].join(" "),
    parameters: CEOParams,

    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      const sessionsDir = path.join(ctx.cwd, SESSIONS_DIR);
      const stateMgr = new StateManager(sessionsDir);
      const contextLoader = new ContextLoader(ctx.cwd);
      const agentPromptPath = path.join(ctx.cwd, ".pi", "agents", "ceo.md");

      // Discover available agents (synchronous, returns { agents, projectAgentsDir })
      const discovery = discoverAgents(ctx.cwd, "both");
      const agentMap = new Map<string, AgentConfig>(discovery.agents.map(a => [a.name, a]));

      // Load learnings for injection
      const learnings = loadLearnings(ctx.cwd);

      let state: CEOState;

      // --- INIT or RESUME ---
      if (params.resume) {
        const latest = stateMgr.loadLatest();
        if (!latest) {
          return {
            content: [{ type: "text", text: "No CEO session to resume. Start a new one with a goal." }],
            isError: true,
          };
        }
        state = latest;
        emitUpdate(onUpdate, `Resuming session ${state.sessionId} (iteration ${state.iteration}, state: ${state.state})`);
      } else if (params.goal) {
        if (stateMgr.hasActiveSession()) {
          emitUpdate(onUpdate, "Warning: An active CEO session exists. Starting a new one.");
        }
        state = stateMgr.createSession(
          params.goal,
          params.requirements ?? "",
          params.maxIterations ?? DEFAULT_MAX_ITERATIONS,
        );
        emitUpdate(onUpdate, `CEO session ${state.sessionId} started. Goal: ${state.goal}`);
      } else {
        return {
          content: [{ type: "text", text: "Provide a goal or use resume: true." }],
          isError: true,
        };
      }

      // --- MAIN LOOP ---
      while (state.state !== "COMPLETE" && state.state !== "ESCALATE") {
        if (signal?.aborted) {
          emitUpdate(onUpdate, "CEO session interrupted by user.");
          break;
        }

        if (state.iteration >= state.maxIterations) {
          emitUpdate(onUpdate, `Max iterations (${state.maxIterations}) reached. Completing with current progress.`);
          state = stateMgr.transition(state, "COMPLETE");
          break;
        }

        const warningThreshold = state.maxIterations - SOFT_WARNING_BUFFER;
        if (state.iteration === warningThreshold) {
          emitUpdate(onUpdate, `Warning: ${SOFT_WARNING_BUFFER} iterations remaining.`);
        }

        // Increment iteration immutably
        state = stateMgr.saveState({ ...state, iteration: state.iteration + 1 });

        // --- PLAN ---
        state = stateMgr.transition(state, "PLAN");
        emitUpdate(onUpdate, `[Iteration ${state.iteration}] PLAN phase...`);

        const ceoContext = contextLoader.buildCEOContext(state);
        const planPrompt = buildPlanPrompt({
          goal: state.goal,
          requirements: state.requirements,
          currentState: ceoContext,
          completedTasks: formatTaskList(state.plan.tasks, "completed"),
          failedTasks: formatTaskList(state.plan.tasks, "failed"),
          learnings,
        });

        let planOutput: PlanOutput;
        try {
          const planResponse = await spawnCEOReasoning(ctx.cwd, agentPromptPath, planPrompt, signal);
          const parsed = parseJSON(planResponse);
          if (!parsed || !isPlanOutput(parsed)) {
            emitUpdate(onUpdate, "PLAN phase returned invalid JSON. Escalating.");
            state = stateMgr.transition(state, "ESCALATE");
            break;
          }
          planOutput = parsed;
        } catch (err) {
          emitUpdate(onUpdate, `PLAN reasoning failed: ${(err as Error).message}`);
          state = stateMgr.transition(state, "ESCALATE");
          break;
        }

        const mergedPlan = mergePlanUpdate(state.plan, planOutput);
        state = stateMgr.saveState({ ...state, plan: mergedPlan });
        state = stateMgr.appendDecision(state, {
          iteration: state.iteration,
          phase: "PLAN",
          decision: `Generated ${planOutput.tasks.length} new tasks`,
          rationale: planOutput.rationale,
          timestamp: new Date().toISOString(),
        });

        // --- DELEGATE ---
        state = stateMgr.transition(state, "DELEGATE");
        const readyTasks = getReadyTasks(state.plan);
        if (readyTasks.length === 0) {
          emitUpdate(onUpdate, "No ready tasks to delegate. Checking progress...");
          state = stateMgr.transition(state, "DECIDE");

          const progress = assessProgress(state);
          if (progress.isStuck) {
            emitUpdate(onUpdate, `Stuck: ${progress.stuckReason}. Escalating.`);
            state = await handleEscalation(state, stateMgr, ctx.cwd, agentMap, signal, onUpdate);
            break;
          }
          continue;
        }

        emitUpdate(onUpdate, `Delegating ${readyTasks.length} tasks to workers in parallel...`);

        // Mark tasks as in_progress immutably
        const updatedTasks = state.plan.tasks.map(t => {
          const isReady = readyTasks.some(rt => rt.id === t.id);
          return isReady ? { ...t, status: "in_progress" as const, attempts: t.attempts + 1 } : t;
        });
        state = stateMgr.saveState({ ...state, plan: { ...state.plan, tasks: updatedTasks } });

        // Build delegation prompts for parallel dispatch
        const taskPrompts = readyTasks.map(task => {
          const workerContext = contextLoader.buildWorkerContext(state, task);
          const prompt = `${workerContext}\n\nTask: ${task.description}\nExpected output: ${task.expectedOutput}`;
          return { taskId: task.id, agentName: task.agent, prompt };
        });

        // Delegate via spawn("pi", args) — parallel with concurrency limit
        const workerResults = await delegateParallel(
          ctx.cwd, agentMap, taskPrompts, signal, CEO_MAX_CONCURRENCY,
        );

        // Apply worker results immutably
        const postDelegationTasks = state.plan.tasks.map(t => {
          const result = workerResults.get(t.id);
          if (!result) return t;

          if (result.exitCode === 0 && result.output) {
            const sanitizedOutput = MemoryWriter.sanitizeOutput(result.output);
            return { ...t, status: "completed" as const, output: sanitizedOutput };
          }
          return { ...t, status: "failed" as const, output: `Error (exit ${result.exitCode}): ${result.stderr || result.output}` };
        });
        state = stateMgr.saveState({ ...state, plan: { ...state.plan, tasks: postDelegationTasks } });

        // --- REVIEW ---
        state = stateMgr.transition(state, "REVIEW");
        emitUpdate(onUpdate, "REVIEW phase...");

        const completedInBatch = state.plan.tasks.filter(
          t => readyTasks.some(rt => rt.id === t.id) && t.status === "completed",
        );

        for (const task of completedInBatch) {
          const reviewPrompt = buildReviewPrompt({
            goal: state.goal,
            taskDescription: task.description,
            agentName: task.agent,
            workerOutput: task.output ?? "(none)",
            expectedOutput: task.expectedOutput,
            attemptNumber: task.attempts,
          });

          try {
            const reviewResponse = await spawnCEOReasoning(ctx.cwd, agentPromptPath, reviewPrompt, signal);
            const parsed = parseJSON(reviewResponse);

            if (parsed && isReviewOutput(parsed)) {
              const reviewedTasks = state.plan.tasks.map(t => {
                const decision = parsed.decisions.find(d => d.taskId === t.id);
                if (!decision) return t;
                if (decision.verdict !== "ACCEPT" && !canRetry(t)) {
                  return applyReviewDecision(t, "ESCALATE", "Max attempts reached");
                }
                return applyReviewDecision(t, decision.verdict, decision.feedback, decision.newAgent);
              });
              state = stateMgr.saveState({ ...state, plan: { ...state.plan, tasks: reviewedTasks } });
            }
          } catch {
            // If review fails, accept the output as-is
          }
        }

        state = stateMgr.appendDecision(state, {
          iteration: state.iteration,
          phase: "REVIEW",
          decision: `Reviewed ${completedInBatch.length} tasks`,
          rationale: "Worker output review",
          timestamp: new Date().toISOString(),
        });

        // --- Memory dual-write after REVIEW ---
        await writeMemoryIfNeeded(state, ctx.cwd, agentMap, signal);

        // --- DECIDE ---
        state = stateMgr.transition(state, "DECIDE");
        emitUpdate(onUpdate, "DECIDE phase...");

        const progress = assessProgress(state);

        if (progress.isStuck) {
          emitUpdate(onUpdate, `Stuck: ${progress.stuckReason}. Escalating.`);
          state = await handleEscalation(state, stateMgr, ctx.cwd, agentMap, signal, onUpdate);
          break;
        }

        const decidePrompt = buildDecidePrompt({
          goal: state.goal,
          iteration: state.iteration,
          maxIterations: state.maxIterations,
          completedTasks: formatTaskList(state.plan.tasks, "completed"),
          pendingTasks: formatTaskList(state.plan.tasks, "pending"),
          recentDecisions: state.decisions.slice(-3).map(d => `[${d.phase}] ${d.decision}`).join("\n"),
          progressSummary: `${progress.percentComplete}% complete (${progress.completedCount}/${progress.totalCount} tasks)`,
        });

        try {
          const decideResponse = await spawnCEOReasoning(ctx.cwd, agentPromptPath, decidePrompt, signal);
          const parsed = parseJSON(decideResponse);

          if (parsed && isDecideOutput(parsed)) {
            state = stateMgr.appendDecision(state, {
              iteration: state.iteration,
              phase: "DECIDE",
              decision: parsed.action,
              rationale: parsed.rationale,
              timestamp: new Date().toISOString(),
            });

            if (parsed.action === "VERIFY") {
              // --- VERIFY phase ---
              state = stateMgr.transition(state, "VERIFY");
              emitUpdate(onUpdate, "VERIFY phase — running automated checks...");

              // Run VERIFY_COMMANDS from .pi/config.sh
              const verifyResults = runVerifyCommands(ctx.cwd);
              emitUpdate(onUpdate, `Automated checks: ${verifyResults.passed ? "PASSED" : "FAILED"}`);

              // Get changed files list
              const changedFiles = getChangedFiles(ctx.cwd);

              const verifyPrompt = buildVerifyPrompt({
                goal: state.goal,
                requirements: state.requirements,
                completedTasksSummary: state.plan.tasks
                  .filter(t => t.status === "completed")
                  .map(t => `${t.id}: ${t.description}\n${t.output}`)
                  .join("\n\n"),
                verifyCommandResults: verifyResults.output,
                changedFilesList: changedFiles,
              });

              const verifyResponse = await spawnCEOReasoning(ctx.cwd, agentPromptPath, verifyPrompt, signal);
              const parsedVerification = parseJSON(verifyResponse);
              const verification = parsedVerification && isVerificationOutput(parsedVerification) ? parsedVerification : null;

              state = stateMgr.appendDecision(state, {
                iteration: state.iteration,
                phase: "VERIFY",
                decision: verification?.goalMet ? "Goal met" : "Goal not met",
                rationale: `Confidence: ${verification?.confidence ?? 0}%. Gaps: ${verification?.gaps?.join(", ") ?? "unknown"}`,
                timestamp: new Date().toISOString(),
              });

              if (verification?.goalMet && verification.confidence >= VERIFICATION_CONFIDENCE_THRESHOLD) {
                emitUpdate(onUpdate, `Goal verified! Confidence: ${verification.confidence}%`);
                state = stateMgr.transition(state, "COMPLETE");
              } else if (verification) {
                emitUpdate(onUpdate, `Goal not yet met (confidence: ${verification.confidence}%). Gaps: ${verification.gaps.join(", ")}`);
                // Continue loop (back to PLAN)
              } else {
                emitUpdate(onUpdate, "Verification returned invalid response. Continuing...");
              }
            } else if (parsed.action === "ESCALATE") {
              state = await handleEscalation(state, stateMgr, ctx.cwd, agentMap, signal, onUpdate);
            }
            // else: PLAN — loop continues
          }
        } catch {
          // If decide fails, continue to next iteration
        }
      }

      // --- Memory dual-write on completion ---
      await writeFinalMemory(state, ctx.cwd, agentMap, signal);

      // --- Build final output ---
      const finalProgress = assessProgress(state);
      const summary = [
        `## CEO Session ${state.state === "COMPLETE" ? "Complete" : "Escalated"}`,
        `**Goal**: ${state.goal}`,
        `**Iterations**: ${state.iteration}`,
        `**Tasks**: ${finalProgress.completedCount}/${finalProgress.totalCount} completed`,
        `**State**: ${state.state}`,
      ];

      if (state.state === "ESCALATE" && finalProgress.stuckReason) {
        summary.push(`**Stuck Reason**: ${finalProgress.stuckReason}`);
      }

      return {
        content: [{ type: "text", text: summary.join("\n") }],
      };
    },

    renderCall(args: Record<string, unknown>, theme) {
      const goal = (args.goal as string) || (args.resume ? "(resuming)" : "...");
      const preview = typeof goal === "string" && goal.length > 60 ? `${goal.slice(0, 60)}...` : goal;
      return new Text(
        theme.fg("toolTitle", theme.bold("ceo ")) + theme.fg("accent", String(preview)),
        0,
        0,
      );
    },

    renderResult(result, _opts, theme) {
      const text = result.content[0];
      return new Text(text?.type === "text" ? text.text : "(no output)", 0, 0);
    },
  });
}

// --- Helper functions ---

function emitUpdate(onUpdate: UpdateCallback | undefined, message: string): void {
  if (onUpdate) {
    onUpdate({ content: [{ type: "text", text: message }] });
  }
}

function formatTaskList(tasks: CEOTask[], status: CEOTask["status"]): string {
  return tasks
    .filter(t => t.status === status)
    .map(t => `${t.id}: ${t.description}${status === "failed" ? ` (${t.attempts} attempts)` : ""}`)
    .join("\n");
}

function loadLearnings(cwd: string): string {
  const learningsPath = path.join(cwd, ".learnings", "LEARNINGS.md");
  if (!fs.existsSync(learningsPath)) return "";

  try {
    const content = fs.readFileSync(learningsPath, "utf-8");
    // Extract promoted patterns (Status: promoted)
    const promoted = content.split("## [LRN-")
      .filter(section => section.includes("Status: promoted"))
      .map(section => {
        const patternMatch = section.match(/### Patterns observed\n([\s\S]*?)(?=\n###|\n## |\z)/);
        return patternMatch ? patternMatch[1].trim() : null;
      })
      .filter(Boolean);

    return promoted.length > 0
      ? `## Promoted Learnings\n${promoted.join("\n")}`
      : "";
  } catch { return ""; }
}

/** Run VERIFY_COMMANDS from .pi/config.sh */
function runVerifyCommands(cwd: string): { passed: boolean; output: string } {
  const configPath = path.join(cwd, ".pi", "config.sh");
  if (!fs.existsSync(configPath)) {
    return { passed: true, output: "No .pi/config.sh found. Skipping automated checks." };
  }

  try {
    const configContent = fs.readFileSync(configPath, "utf-8");
    const verifyMatch = configContent.match(/VERIFY_COMMANDS\s*=\s*\(([\s\S]*?)\)/);
    if (!verifyMatch) {
      return { passed: true, output: "No VERIFY_COMMANDS defined in config.sh" };
    }

    const commands = verifyMatch[1]
      .split("\n")
      .map(line => line.trim().replace(/^["']|["']$/g, ""))
      .filter(line => line && !line.startsWith("#"));

    const results: string[] = [];
    let allPassed = true;

    for (const cmd of commands) {
      try {
        const output = execSync(cmd, { cwd, encoding: "utf-8", timeout: 60000 });
        results.push(`PASS: ${cmd}\n${output.slice(0, 500)}`);
      } catch (err) {
        allPassed = false;
        const stderr = (err as { stderr?: string }).stderr ?? (err as Error).message;
        results.push(`FAIL: ${cmd}\n${String(stderr).slice(0, 500)}`);
      }
    }

    return { passed: allPassed, output: results.join("\n\n") };
  } catch (err) {
    return { passed: false, output: `Error reading config.sh: ${(err as Error).message}` };
  }
}

/** Get list of changed files since HEAD (or since worktree branch) */
function getChangedFiles(cwd: string): string {
  try {
    const diffOutput = execSync("git diff --name-only HEAD", { cwd, encoding: "utf-8", timeout: 10000 });
    const stagedOutput = execSync("git diff --name-only --cached", { cwd, encoding: "utf-8", timeout: 10000 });
    const allFiles = [...new Set([...diffOutput.split("\n"), ...stagedOutput.split("\n")])].filter(Boolean);
    return allFiles.length > 0 ? allFiles.join("\n") : "(no files changed)";
  } catch {
    return "(unable to determine changed files)";
  }
}

/** Handle ESCALATE: create GitHub issue and transition state */
async function handleEscalation(
  state: CEOState,
  stateMgr: StateManager,
  cwd: string,
  agentMap: Map<string, AgentConfig>,
  signal: AbortSignal | undefined,
  onUpdate: UpdateCallback | undefined,
): Promise<CEOState> {
  emitUpdate(onUpdate, "Creating GitHub issue for escalation...");

  // Try to delegate to issue-creator agent if available
  const issueCreator = agentMap.get("issue-creator");
  if (issueCreator) {
    const { delegateToWorker } = await import("./worker-delegate.js");
    const failedTasks = state.plan.tasks.filter(t => t.status === "failed");
    const issueBody = [
      `## CEO Agent Escalation`,
      `**Goal**: ${state.goal}`,
      `**Session**: ${state.sessionId}`,
      `**Iteration**: ${state.iteration}`,
      `**Failed tasks**:`,
      ...failedTasks.map(t => `- ${t.id}: ${t.description} (${t.attempts} attempts) — ${t.feedback ?? t.output ?? "no details"}`),
    ].join("\n");

    try {
      await delegateToWorker(cwd, issueCreator, `Create a GitHub issue:\n\nTitle: [CEO Escalation] ${state.goal}\n\n${issueBody}`, signal);
    } catch {
      emitUpdate(onUpdate, "Failed to create GitHub issue. Manual intervention needed.");
    }
  } else {
    emitUpdate(onUpdate, "No issue-creator agent available. Manual escalation needed.");
  }

  return stateMgr.transition(state, "ESCALATE");
}

/** Write learnings to .learnings/ via learning-agent after REVIEW phase */
async function writeMemoryIfNeeded(
  state: CEOState,
  cwd: string,
  agentMap: Map<string, AgentConfig>,
  signal: AbortSignal | undefined,
): Promise<void> {
  // Only write after meaningful review decisions
  const reviewDecisions = state.decisions.filter(d => d.phase === "REVIEW" && d.iteration === state.iteration);
  if (reviewDecisions.length === 0) return;

  const learningAgent = agentMap.get("learning-agent");
  if (!learningAgent) return;

  // Look for patterns worth recording
  const retryTasks = state.plan.tasks.filter(t => t.feedback && t.attempts > 1);
  if (retryTasks.length === 0) return;

  const patterns = retryTasks
    .map(t => `Agent "${t.agent}" needed retry on "${t.description}": ${t.feedback}`)
    .join("\n");

  try {
    const { delegateToWorker } = await import("./worker-delegate.js");
    await delegateToWorker(cwd, learningAgent, `Record these patterns from CEO orchestration:\n${patterns}`, signal);
  } catch { /* best effort */ }
}

/** Write final session record to Obsidian and learnings on completion */
async function writeFinalMemory(
  state: CEOState,
  cwd: string,
  agentMap: Map<string, AgentConfig>,
  signal: AbortSignal | undefined,
): Promise<void> {
  if (state.state !== "COMPLETE" && state.state !== "ESCALATE") return;

  // Write Obsidian note
  const projectName = path.basename(cwd);
  const note = MemoryWriter.buildObsidianNote({
    goal: state.goal,
    decisions: state.decisions,
    outcome: state.state === "COMPLETE" ? "Completed successfully" : "Escalated — needs human input",
    projectName,
  });

  const obsidianDir = path.join(
    process.env.HOME ?? os.homedir(),
    "Projects", "PKM", "2-Areas", projectName, "ceo-decisions",
  );

  try {
    fs.mkdirSync(obsidianDir, { recursive: true });
    const slug = state.goal.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50);
    const dateStr = new Date().toISOString().slice(0, 10);
    fs.writeFileSync(path.join(obsidianDir, `${dateStr}-${slug}.md`), note, "utf-8");
  } catch { /* best effort — Obsidian vault may not exist */ }

  // Write learnings via learning-agent
  await writeMemoryIfNeeded(state, cwd, agentMap, signal);
}
