import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { isToolCallEventType } from "@mariozechner/pi-coding-agent";

/**
 * Command Hygiene Extension
 * 
 * Strips wasteful prefixes from bash commands and logs read deduplication warnings.
 * 
 * Bash sanitization:
 * - Strips leading `cd <dir> && ` (working directory is always project root)
 * - Strips leading `# ...` comment lines
 * - Logs violations to stderr for trace analysis
 * 
 * Read deduplication:
 * - Warns when re-reading a file that hasn't been modified
 * - Does NOT block (agent decides whether to proceed)
 */

export default function commandHygiene(pi: ExtensionAPI) {
  // Track files read this session for dedup warnings
  const readPaths = new Map<string, number>(); // path -> timestamp of last read

  pi.on("tool_call", async (event, _ctx) => {
    // ── Bash sanitization ──────────────────────────────────────────

    if (isToolCallEventType("bash", event)) {
      const original = event.input.command;
      let cleaned = original;

      // Strip leading `cd <dir> && ` patterns
      // Matches: "cd foo && ...", "cd /foo/bar && ...", "cd 'foo bar' && ..."
      // Uses lazy match (.+?) to stop at first &&
      cleaned = cleaned.replace(/^cd\s+.+?&&\s*/i, "");

      // Strip leading `# ...` comment lines (single or multi-line)
      cleaned = cleaned.replace(/^#\s*[^\n]*\n?/, "");

      // Strip leading newlines after stripping
      cleaned = cleaned.replace(/^\n+/, "");

      if (cleaned !== original) {
        // Log the sanitization for trace analysis
        const removed: string[] = [];
        if (original !== original.replace(/^cd\s+\S+ &&\s*/i, "")) {
          removed.push("cd-prefix");
        }
        if (original !== original.replace(/^#\s*[^\n]*\n?/, "")) {
          removed.push("comment-prefix");
        }
        console.error(`[command-hygiene] Stripped ${removed.join("+")} from bash command`);

        // Mutate the input — pi will execute the cleaned command
        event.input.command = cleaned;
      }
    }

    // ── Read deduplication warning ─────────────────────────────────

    if (isToolCallEventType("read", event)) {
      const path = event.input.path;
      const now = Date.now();
      const lastRead = readPaths.get(path);

      if (lastRead) {
        const elapsed = ((now - lastRead) / 1000).toFixed(0);
        console.error(`[command-hygiene] Re-reading ${path} (last read ${elapsed}s ago). Consider using cached knowledge.`);
        // Don't block — just warn. The agent decides.
      }

      readPaths.set(path, now);
    }

    return undefined; // Never block
  });
}
