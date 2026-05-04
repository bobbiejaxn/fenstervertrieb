/**
 * Domain Enforcer Extension
 *
 * Enforces file-level read/write/delete permissions for agents.
 * Reads AGENT_DOMAIN_RULES and AGENT_EXPERTISE from environment
 * variables and blocks tool calls that violate permissions.
 *
 * Adapted from disler/lead-agents for pi_launchpad.
 *
 * Environment variables:
 *   AGENT_DOMAIN_RULES  — JSON array of {path, read, upsert, delete}
 *   AGENT_EXPERTISE     — JSON array of {absPath, updatable, maxLines}
 *   AGENT_ALLOWED_TOOLS — JSON array of allowed tool names (empty = all)
 *   AGENT_PROJECT_ROOT  — project root path
 *
 * Evaluation order (first match wins):
 *   1. Expertise file paths — exact file match overrides domain
 *   2. Domain rules — directory-level access control
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

interface DomainRule {
  path: string;
  read: boolean;
  upsert: boolean;
  delete: boolean;
}

interface ExpertiseEntry {
  absPath: string;
  updatable: boolean;
  maxLines?: number;
}

export default function (pi: ExtensionAPI) {
  const rulesJson = process.env.AGENT_DOMAIN_RULES;
  if (!rulesJson) return; // No rules = no enforcement

  let rules: DomainRule[];
  try {
    rules = JSON.parse(rulesJson);
  } catch {
    return;
  }
  if (!rules || !Array.isArray(rules) || rules.length === 0) return;

  const projectRoot = process.env.AGENT_PROJECT_ROOT || process.cwd();

  // Parse expertise entries
  let expertise: ExpertiseEntry[] = [];
  const expJson = process.env.AGENT_EXPERTISE;
  if (expJson) {
    try {
      expertise = JSON.parse(expJson);
    } catch {}
  }

  // Parse allowed tools (empty = all allowed for backward compat)
  let allowedTools: string[] = [];
  const toolsJson = process.env.AGENT_ALLOWED_TOOLS;
  if (toolsJson) {
    try {
      allowedTools = JSON.parse(toolsJson);
    } catch {}
  }

  // ── Helpers ──────────────────────────────────────────────────

  function normalize(filePath: string): string {
    let rel = filePath;
    if (rel.startsWith(projectRoot)) {
      rel = rel.slice(projectRoot.length).replace(/^\//, "");
    }
    if (rel.startsWith("./")) rel = rel.slice(2);
    return rel || ".";
  }

  /**
   * Check expertise first — exact file path match overrides domain.
   * Returns true (allow), false (deny), or null (no match, fall through).
   */
  function checkExpertise(
    filePath: string,
    operation: "read" | "upsert"
  ): boolean | null {
    if (expertise.length === 0) return null;
    const abs = filePath.startsWith("/")
      ? filePath
      : projectRoot + "/" + normalize(filePath);
    for (const exp of expertise) {
      if (abs === exp.absPath) {
        if (operation === "read") return true;
        if (operation === "upsert") return exp.updatable;
      }
    }
    return null;
  }

  function isAllowed(
    filePath: string,
    operation: "read" | "upsert" | "delete"
  ): boolean {
    // 1. Check expertise override (read/upsert only)
    if (operation !== "delete") {
      const expResult = checkExpertise(filePath, operation);
      if (expResult !== null) return expResult;
    }

    // 2. Fall through to domain rules
    const rel = normalize(filePath);
    for (const rule of rules) {
      if (rule.path === ".") return rule[operation] === true;
      const rulePath = rule.path.replace(/\/$/, "");
      if (
        rel === rulePath ||
        rel.startsWith(rulePath + "/") ||
        rel.startsWith(rule.path)
      ) {
        return rule[operation] === true;
      }
    }
    return false; // No matching rule = deny
  }

  // Pre-compute aggregate permissions for bash heuristics
  const anyUpsert =
    rules.some((r) => r.upsert) || expertise.some((e) => e.updatable);
  const anyDelete = rules.some((r) => r.delete);

  // Bash write/delete detection patterns
  const bashWritePatterns = [
    />(?!&)/, // Output redirect but not 2>&1
    /\btee\b/,
    /\bmv\b/,
    /\bcp\b/,
    /\bmkdir\b/,
    /\btouch\b/,
    /\bchmod\b/,
    /\bchown\b/,
    /\bnpm\s+install/,
    /\bbun\s+(install|add)/,
    /\bgit\s+(commit|push|merge|rebase|reset|checkout\s+-)/,
    /\bsed\s+-i/,
    /\bpatch\b/,
  ];
  const bashDeletePatterns = [
    /\brm\s/,
    /\brmdir\b/,
    /\bunlink\b/,
    /\bgit\s+clean/,
  ];

  // ── Hook ────────────────────────────────────────────────────

  pi.on("tool_call", async (event) => {
    const toolName = event.toolName;
    const input = event.input as Record<string, any>;

    // Tool allowlist — if specified, block anything not listed
    if (allowedTools.length > 0 && !allowedTools.includes(toolName)) {
      return {
        block: true,
        reason: `Tool not allowed: '${toolName}'. Permitted: ${allowedTools.join(", ")}`,
      };
    }

    // Read-only tools
    if (
      toolName === "read" ||
      toolName === "grep" ||
      toolName === "find" ||
      toolName === "ls" ||
      toolName === "glob"
    ) {
      const path = input.path || input.file_path || ".";
      if (!isAllowed(path, "read")) {
        return {
          block: true,
          reason: `Domain: read denied for '${normalize(path)}'`,
        };
      }
      return undefined;
    }

    // Write tools
    if (toolName === "write" || toolName === "edit") {
      const path = input.path || input.file_path || "";
      if (!path) return undefined;
      if (!isAllowed(path, "upsert")) {
        return {
          block: true,
          reason: `Domain: write denied for '${normalize(path)}'`,
        };
      }
      return undefined;
    }

    // Bash — heuristic analysis
    if (toolName === "bash") {
      const command = (input.command || "") as string;

      if (!anyDelete && bashDeletePatterns.some((p) => p.test(command))) {
        return {
          block: true,
          reason: `Domain: delete operations not permitted — ${command.slice(0, 80)}`,
        };
      }

      if (!anyUpsert && bashWritePatterns.some((p) => p.test(command))) {
        return {
          block: true,
          reason: `Domain: write operations not permitted — ${command.slice(0, 80)}`,
        };
      }

      return undefined;
    }

    return undefined;
  });

  // ── Line Limit Enforcement (post-write on expertise files) ──

  pi.on("tool_result", async (event) => {
    const toolName = event.toolName;
    if (toolName !== "write" && toolName !== "edit") return undefined;

    const input = event.input as Record<string, any>;
    const path = input.path || input.file_path || "";
    if (!path) return undefined;

    // Check if this is an expertise file with a line limit
    const abs = path.startsWith("/")
      ? path
      : projectRoot + "/" + normalize(path);
    const match = expertise.find((e) => e.absPath === abs);
    if (!match || !match.maxLines) return undefined;

    // Count lines in the written file
    try {
      const { readFileSync } = require("node:fs");
      const content = readFileSync(abs, "utf-8");
      const lineCount = content.split("\n").length;
      if (lineCount > match.maxLines) {
        const warning = `\n\n⚠️ EXPERTISE LINE LIMIT EXCEEDED: ${lineCount}/${match.maxLines} lines. You MUST trim this file immediately before continuing.`;
        const currentResult =
          typeof event.result === "string"
            ? event.result
            : JSON.stringify(event.result);
        return { result: currentResult + warning };
      }
    } catch {}

    return undefined;
  });
}
