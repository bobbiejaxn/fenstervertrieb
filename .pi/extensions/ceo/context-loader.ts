// .pi/extensions/ceo/context-loader.ts

import * as fs from "node:fs";
import * as path from "node:path";
import type { CEOState, CEOTask } from "./types.js";
import { CEO_CONTEXT_TOKEN_BUDGET, WORKER_CONTEXT_TOKEN_BUDGET, DECISIONS_SUMMARY_THRESHOLD } from "./constants.js";

export class ContextLoader {
  private readonly projectDir: string;

  constructor(projectDir: string) {
    this.projectDir = projectDir;
  }

  buildCEOContext(state: CEOState): string {
    const sections: string[] = [];

    sections.push(`# CEO Context\n\n## Goal\n${state.goal}`);

    if (state.requirements) {
      sections.push(`## Requirements\n${state.requirements}`);
    }

    sections.push(`## Iteration\n${state.iteration} of ${state.maxIterations}`);

    const completedTasks = state.plan.tasks.filter(t => t.status === "completed");
    if (completedTasks.length > 0) {
      const taskSummaries = completedTasks
        .slice(-5)
        .map(t => `- [${t.id}] ${t.agent}: ${t.description}\n  Output: ${this.truncate(t.output ?? "(none)", 500)}`)
        .join("\n");
      sections.push(`## Completed Tasks (${completedTasks.length})\n${taskSummaries}`);
    }

    const pendingTasks = state.plan.tasks.filter(t => t.status === "pending");
    if (pendingTasks.length > 0) {
      const taskList = pendingTasks
        .map(t => `- [${t.id}] ${t.agent}: ${t.description}`)
        .join("\n");
      sections.push(`## Pending Tasks (${pendingTasks.length})\n${taskList}`);
    }

    const failedTasks = state.plan.tasks.filter(t => t.status === "failed");
    if (failedTasks.length > 0) {
      const taskList = failedTasks
        .map(t => `- [${t.id}] ${t.agent}: ${t.description} (attempts: ${t.attempts})`)
        .join("\n");
      sections.push(`## Failed Tasks (${failedTasks.length})\n${taskList}`);
    }

    if (state.decisions.length > 0) {
      const recentDecisions = state.decisions.length > DECISIONS_SUMMARY_THRESHOLD
        ? state.decisions.slice(-DECISIONS_SUMMARY_THRESHOLD)
        : state.decisions;
      const decisionList = recentDecisions
        .map(d => `- [Iter ${d.iteration}, ${d.phase}] ${d.decision} — ${d.rationale}`)
        .join("\n");
      sections.push(`## Recent Decisions\n${decisionList}`);
    }

    const projectSummary = this.getProjectSummary();
    if (projectSummary) {
      sections.push(`## Project Summary\n${projectSummary}`);
    }

    return this.fitToBudget(sections.join("\n\n"), CEO_CONTEXT_TOKEN_BUDGET);
  }

  buildWorkerContext(state: CEOState, task: CEOTask): string {
    const sections: string[] = [];

    sections.push(`# Worker Task\n\n## Goal\n${state.goal}`);
    sections.push(`## Task\n${task.description}`);
    sections.push(`## Expected Output\n${task.expectedOutput}`);

    if (task.feedback) {
      sections.push(`## Feedback from Previous Attempt\n${task.feedback}`);
    }

    const depOutputs = this.getDependencyOutputs(state, task);
    if (depOutputs) {
      sections.push(`## Previous Work\n${depOutputs}`);
    }

    const relevantFiles = this.getRelevantFiles(task.description);
    if (relevantFiles) {
      sections.push(`## Relevant Code\n${relevantFiles}`);
    }

    return this.fitToBudget(sections.join("\n\n"), WORKER_CONTEXT_TOKEN_BUDGET);
  }

  getProjectSummary(): string {
    const parts: string[] = [];

    const tree = this.getFileTree(this.projectDir, 2);
    if (tree.length > 0) {
      parts.push(`### File Tree\n${tree.join("\n")}`);
    }

    const keyFiles = ["README.md", "package.json", "AGENTS.md"];
    for (const file of keyFiles) {
      const filePath = path.join(this.projectDir, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        parts.push(`### ${file}\n${this.truncate(content, 500)}`);
      }
    }

    return parts.join("\n\n");
  }

  private getDependencyOutputs(state: CEOState, task: CEOTask): string | null {
    if (task.blockedBy.length === 0) return null;

    const outputs = task.blockedBy
      .map(depId => state.plan.tasks.find(t => t.id === depId))
      .filter((t): t is CEOTask => t !== undefined && t.status === "completed" && !!t.output)
      .map(t => `### ${t.id} (${t.agent}): ${t.description}\n${this.truncate(t.output!, 1000)}`)
      .join("\n\n");

    return outputs || null;
  }

  private getRelevantFiles(taskDescription: string): string | null {
    const keywords = taskDescription.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const relevantExtensions = [".ts", ".tsx", ".js", ".jsx", ".py", ".md", ".json"];
    const ignoreDirs = new Set(["node_modules", ".git", "__pycache__", "dist", "build", ".next"]);
    const matches: string[] = [];

    const scan = (dir: string, depth: number): void => {
      if (depth > 3 || matches.length >= 5) return;
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (ignoreDirs.has(entry.name)) continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scan(fullPath, depth + 1);
        } else if (relevantExtensions.some(ext => entry.name.endsWith(ext))) {
          const nameLower = entry.name.toLowerCase();
          if (keywords.some(kw => nameLower.includes(kw))) {
            try {
              const content = fs.readFileSync(fullPath, "utf-8");
              const relativePath = path.relative(this.projectDir, fullPath);
              matches.push(`### ${relativePath}\n\`\`\`\n${this.truncate(content, 2000)}\n\`\`\``);
            } catch { /* skip unreadable */ }
          }
        }
      }
    };

    scan(this.projectDir, 0);
    return matches.length > 0 ? matches.join("\n\n") : null;
  }

  private getFileTree(dir: string, maxDepth: number, depth = 0, prefix = ""): string[] {
    if (depth > maxDepth) return [];
    const ignoreDirs = new Set(["node_modules", ".git", "__pycache__", "dist", "build", ".next"]);
    const lines: string[] = [];

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return lines;
    }

    const filtered = entries.filter(e => !ignoreDirs.has(e.name) && !e.name.startsWith("."));
    for (let i = 0; i < filtered.length; i++) {
      const entry = filtered[i];
      const isLast = i === filtered.length - 1;
      const connector = isLast ? "└── " : "├── ";
      const childPrefix = isLast ? "    " : "│   ";

      lines.push(`${prefix}${connector}${entry.name}${entry.isDirectory() ? "/" : ""}`);

      if (entry.isDirectory()) {
        const childLines = this.getFileTree(
          path.join(dir, entry.name),
          maxDepth,
          depth + 1,
          prefix + childPrefix,
        );
        lines.push(...childLines);
      }
    }

    return lines;
  }

  private truncate(text: string, maxChars: number): string {
    if (text.length <= maxChars) return text;
    return text.slice(0, maxChars) + "\n... [truncated]";
  }

  private fitToBudget(text: string, tokenBudget: number): string {
    const estimatedTokens = Math.ceil(text.length / 4);
    if (estimatedTokens <= tokenBudget) return text;

    const charBudget = tokenBudget * 4;
    return text.slice(0, charBudget) + "\n\n... [context truncated to fit token budget]";
  }
}
