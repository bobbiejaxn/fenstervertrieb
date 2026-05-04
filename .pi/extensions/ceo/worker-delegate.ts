// .pi/extensions/ceo/worker-delegate.ts

import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { AgentConfig } from "../subagent/agents.js";

export interface WorkerResult {
  agent: string;
  exitCode: number;
  output: string;
  stderr: string;
}

function writePromptToTempFile(agentName: string, prompt: string): { dir: string; filePath: string } {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-ceo-worker-"));
  const safeName = agentName.replace(/[^\w.-]+/g, "_");
  const filePath = path.join(tmpDir, `prompt-${safeName}.md`);
  fs.writeFileSync(filePath, prompt, { encoding: "utf-8", mode: 0o600 });
  return { dir: tmpDir, filePath };
}

export async function delegateToWorker(
  cwd: string,
  agent: AgentConfig,
  taskPrompt: string,
  signal?: AbortSignal,
): Promise<WorkerResult> {
  const args: string[] = ["--mode", "json", "-p", "--no-session"];
  if (agent.model) args.push("--model", agent.model);
  if (agent.tools && agent.tools.length > 0) args.push("--tools", agent.tools.join(","));

  let tmpPromptDir: string | null = null;
  let tmpPromptPath: string | null = null;

  try {
    if (agent.systemPrompt.trim()) {
      const tmp = writePromptToTempFile(agent.name, agent.systemPrompt);
      tmpPromptDir = tmp.dir;
      tmpPromptPath = tmp.filePath;
      args.push("--append-system-prompt", tmpPromptPath);
    }

    args.push(`Task: ${taskPrompt}`);

    const { exitCode, stdout, stderr } = await new Promise<{ exitCode: number; stdout: string; stderr: string }>((resolve) => {
      const proc = spawn("pi", args, { cwd, shell: false, stdio: ["ignore", "pipe", "pipe"] });
      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data: Buffer) => { stdout += data.toString(); });
      proc.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });

      proc.on("close", (code) => resolve({ exitCode: code ?? 1, stdout, stderr }));
      proc.on("error", () => resolve({ exitCode: 1, stdout, stderr: stderr || "Process spawn failed" }));

      if (signal) {
        const killProc = () => {
          proc.kill("SIGTERM");
          setTimeout(() => { if (!proc.killed) proc.kill("SIGKILL"); }, 5000);
        };
        if (signal.aborted) killProc();
        else signal.addEventListener("abort", killProc, { once: true });
      }
    });

    // Extract final assistant output from JSON mode stdout
    const output = extractAssistantOutput(stdout);
    return { agent: agent.name, exitCode, output, stderr };
  } finally {
    if (tmpPromptPath) try { fs.unlinkSync(tmpPromptPath); } catch { /* ignore */ }
    if (tmpPromptDir) try { fs.rmdirSync(tmpPromptDir); } catch { /* ignore */ }
  }
}

export async function delegateParallel(
  cwd: string,
  agents: Map<string, AgentConfig>,
  taskPrompts: Array<{ taskId: string; agentName: string; prompt: string }>,
  signal?: AbortSignal,
  maxConcurrency = 4,
): Promise<Map<string, WorkerResult>> {
  const results = new Map<string, WorkerResult>();

  // Execute with concurrency limit
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(maxConcurrency, taskPrompts.length) }, async () => {
    while (true) {
      const current = nextIndex++;
      if (current >= taskPrompts.length) return;
      const { taskId, agentName, prompt } = taskPrompts[current];
      const agent = agents.get(agentName);
      if (!agent) {
        results.set(taskId, { agent: agentName, exitCode: 1, output: "", stderr: `Agent not found: ${agentName}` });
        continue;
      }
      const result = await delegateToWorker(cwd, agent, prompt, signal);
      results.set(taskId, result);
    }
  });

  await Promise.all(workers);
  return results;
}

function extractAssistantOutput(stdout: string): string {
  const lines = stdout.split("\n").filter(l => l.trim());
  const messages = lines.map(line => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);

  // Get last assistant message content
  const lastAssistant = messages
    .filter((m: Record<string, unknown>) => m.type === "message_end" && (m.message as Record<string, unknown>)?.role === "assistant")
    .pop();

  if (lastAssistant?.message?.content) {
    const content = lastAssistant.message.content as Array<{ type: string; text?: string }>;
    return content.filter(p => p.type === "text").map(p => p.text ?? "").join("\n");
  }

  return stdout;
}
