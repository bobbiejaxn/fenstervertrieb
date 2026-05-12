/**
 * No-Bash Extension (Level 5 — Remove Bash Tool Entirely)
 *
 * The highest level of bash security: remove the bash tool completely.
 * The agent can ONLY do what you explicitly permit via scoped tools
 * (MCP servers, Pi extensions).
 *
 * "The best bash tool is no bash tool at all."
 * "Just like the best code is no code at all."
 *
 * Use this for:
 * - Production CEO agents running autonomously
 * - Cron job agents that shouldn't need shell access
 * - Any agent that has access to production systems
 *
 * If an agent NEEDS bash, use bash-whitelist (Level 4) instead
 * with a carefully curated allowlist.
 *
 * Environment variables:
 *   NO_BASH_MODE — "block" (default) or "log"
 *     block: return { block: true } for ALL bash calls
 *     log: allow bash but log every call (migration/testing mode)
 *
 *   NO_BASH_ALLOWED_TOOLS — JSON array of alternative tool names the
 *     agent should use instead of bash. Listed in the block message
 *     so the agent knows what to use.
 *     Default: ["read", "write", "edit", "grep", "find", "ls", "glob", "mcp__*"]
 *
 * Based on IndyDevDan's "5 Levels of Bash Security" framework.
 * See: https://youtu.be/yBcmIoA-vGs
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { isToolCallEventType } from "@mariozechner/pi-coding-agent";

// Default alternative tools — the agent should use these instead of bash
const DEFAULT_ALLOWED_TOOLS: string[] = [
  "read",          // Read files
  "write",         // Write files (non-destructive — git makes it reversible)
  "edit",          // Edit files (non-destructive — git makes it reversible)
  "grep",          // Search file contents
  "find",          // Find files
  "ls",            // List directories
  "glob",          // Pattern-based file search
  "mcp__*",        // MCP server tools (explicitly scoped)
];

export default function noBash(pi: ExtensionAPI) {
  const mode = process.env.NO_BASH_MODE || "block";
  const isBlock = mode === "block";

  // Load custom allowed tools list from env
  let allowedTools: string[] = [...DEFAULT_ALLOWED_TOOLS];
  const toolsJson = process.env.NO_BASH_ALLOWED_TOOLS;
  if (toolsJson) {
    try {
      const parsed = JSON.parse(toolsJson);
      if (Array.isArray(parsed)) {
        allowedTools = parsed;
      }
    } catch (e) {
      console.error(`[no-bash] Failed to parse NO_BASH_ALLOWED_TOOLS: ${e}`);
    }
  }

  let blocked = 0;
  let logged = 0;

  pi.on("tool_call", async (event, _ctx) => {
    if (!isToolCallEventType("bash", event)) return undefined;

    const command = (event.input?.command ?? "") as string;

    if (isBlock) {
      blocked++;
      const toolList = allowedTools.join(", ");
      console.error(
        `[no-bash] BLOCKED (#${blocked}): Bash tool is disabled (Level 5 security)\n  Attempted: ${command.slice(0, 120)}`
      );
      return {
        block: true,
        reason: [
          "⛔ No-Bash (Level 5): The bash tool is disabled on this agent.",
          "",
          "This is the highest level of bash security. The agent cannot",
          "execute arbitrary shell commands. Use scoped tools instead:",
          "",
          `Available tools: ${toolList}`,
          "",
          "The write/edit tools are non-destructive because git makes them reversible.",
          "Any file changes can be rolled back with git checkout.",
          "",
          "If you truly need shell access for this task, ask the user to",
          "switch to bash-whitelist (Level 4) or damage-control (Level 3).",
          "",
          "Attempted command: " + command.slice(0, 120),
        ].join("\n"),
      };
    } else {
      // Log mode: allow but track every bash call
      logged++;
      console.error(
        `[no-bash] LOG (#${logged}): Bash call in log mode\n  Command: ${command.slice(0, 120)}`
      );
      // Return undefined to allow the command through
      // This mode is for migration: discover what bash calls an agent
      // actually needs before switching to block mode
      return undefined;
    }
  });
}