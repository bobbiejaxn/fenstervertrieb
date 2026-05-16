/**
 * Bash Whitelist Extension (Level 4 — Explicit Allowlist)
 *
 * Only allows bash commands that are explicitly permitted. Blocks everything
 * else. This is the senior engineering approach: surface area is what the
 * agent *can* do, not the infinite space of what it *shouldn't*.
 *
 * Stack with damage-control (Level 3) for defense in depth.
 * Graduate to no-bash (Level 5) for maximum security.
 *
 * Environment variables:
 *   BASH_WHITELIST_MODE — "enforce" (default) or "log"
 *     enforce: block any command not in the whitelist
 *     log: allow all but log violations (for building your whitelist)
 *   BASH_WHITELIST — JSON array of allowed command prefixes
 *     Default: common dev commands (git, npm, node, npx, bun, astro, etc.)
 *     Set this per-project in .pi/config.sh or .env
 *   BASH_WHITELIST_STRICT — "true" (default) or "false"
 *     true: block inline script execution (python -c, node -e, bash -c)
 *     false: allow inline scripts (NOT recommended for production)
 *
 * Based on IndyDevDan's "5 Levels of Bash Security" framework.
 * See: https://youtu.be/yBcmIoA-vGs
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { isToolCallEventType } from "@mariozechner/pi-coding-agent";

// ── Default whitelist ────────────────────────────────────────────────
// Safe commands that are commonly needed in development.
// These are all reversible via git or don't mutate production state.
const DEFAULT_WHITELIST: string[] = [
  // ── Package management (read + install) ─────────────────────────
  "npm install",
  "npm ci",
  "npm run",
  "npm test",
  "npm ls",
  "npm view",
  "npm pack",
  "npm outdated",
  "npx ",
  "bun install",
  "bun run",
  "bun test",
  "bunx ",
  "pnpm install",
  "pnpm run",
  "pnpm test",
  "yarn install",
  "yarn run",
  "yarn test",

  // ── Build & dev (non-destructive) ────────────────────────────────
  "astro ",
  "vite ",
  "next ",
  "tsc ",
  "tsx ",
  "eslint ",
  "prettier ",
  "vitest ",
  "jest ",
  "playwright ",

  // ── Git (safe operations only — force push blocked by damage-control) ─
  "git status",
  "git log",
  "git diff",
  "git show",
  "git branch",
  "git add ",
  "git commit",
  "git push ",
  "git pull ",
  "git fetch",
  "git checkout ",
  "git switch ",
  "git merge ",
  "git rebase ",
  "git stash",
  "git tag ",
  "git remote",
  "git config",
  "git worktree",
  "git ls-files",
  "git ls-remote",

  // ── File inspection (read-only) ──────────────────────────────────
  "cat ",
  "head ",
  "tail ",
  "less ",
  "wc ",
  "sort ",
  "uniq ",
  "grep ",
  "rg ",
  "find ",
  "ls ",
  "tree ",
  "file ",
  "stat ",
  "du ",
  "df ",
  "which ",
  "whereis ",
  "type ",
  "echo ",

  // ── Process & system info ────────────────────────────────────────
  "ps ",
  "top ",
  "htop ",
  "free ",
  "uptime ",
  "whoami",
  "id ",
  "uname ",
  "env ",
  "printenv",
  "date ",

  // ── Network inspection (read-only) ──────────────────────────────
  "curl ",
  "wget ",
  "ping ",
  "dig ",
  "nslookup ",
  "host ",
  "nc ",
  "ss ",
  "ip addr",
  "ip route",
  "ifconfig",

  // ── Docker (safe operations — destructive ones blocked by damage-control) ──
  "docker ps",
  "docker logs",
  "docker inspect",
  "docker images",
  "docker compose up",
  "docker compose ps",
  "docker compose logs",
  "docker compose build",
  "docker compose pull",
  "docker build ",
  "docker pull ",
  "docker tag ",
  "docker exec ",

  // ── Caddy (safe reload) ──────────────────────────────────────────
  "caddy reload",
  "caddy validate",
  "caddy version",
  "caddy fmt ",

  // ── Misc dev tools ───────────────────────────────────────────────
  "gh ",
  "just ",
  "make ",
  "cargo ",
  "go ",
  "uv ",
  "pip install",
  "pip list",
  "pip show",
  "python ",
  "python3 ",
  "node ",
  "deno ",
  "nvm ",
  "fnm ",
  "jq ",
  "yq ",
  "sed ",       // sed without -i is read-only
  "awk ",
  "xargs ",
  "column ",
  "tee ",       // pipe to tee is safe (writes to project files, reversible)
  "tr ",
  "cut ",
  "paste ",
  "join ",
  "shuf ",
  "rev ",
  "base64 ",
  "md5sum ",
  "sha256sum ",
  "openssl ",
  "ssh ",
  "ssh-keygen ",
  "tar ",
  "unzip ",
  "mkdir ",
  "cp ",        // copy is safe (not destructive)
  "mv ",        // move within project is safe (git tracks it)
  "touch ",
  "chmod ",     // within project is safe
  "ln ",
  "realpath ",
];

// ── Inline script execution patterns ──────────────────────────────
// These bypass all whitelist checks by executing arbitrary code.
// Blocked by default in strict mode.
const INLINE_SCRIPT_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /\bpython[3]?\s+(-c|--command)\s+/,
    reason: "python -c: inline script execution blocked. Write a .py file instead.",
  },
  {
    pattern: /\bnode\s+(-e|--eval)\s+/,
    reason: "node -e: inline script execution blocked. Write a .js file instead.",
  },
  {
    pattern: /\bbun\s+(-e|--eval)\s+/,
    reason: "bun -e: inline script execution blocked. Write a .ts file instead.",
  },
  {
    pattern: /\bdeno\s+eval\s+/,
    reason: "deno eval: inline script execution blocked. Write a .ts file instead.",
  },
  {
    pattern: /\bruby\s+(-e|--eval)\s+/,
    reason: "ruby -e: inline script execution blocked. Write a .rb file instead.",
  },
  {
    pattern: /\bperl\s+(-e|--eval)\s+/,
    reason: "perl -e: inline script execution blocked. Write a .pl file instead.",
  },
  {
    pattern: /\bbash\s+-c\s+['"]/,
    reason: "bash -c: inline script execution blocked. Write a .sh file instead.",
  },
];

export default function bashWhitelist(pi: ExtensionAPI) {
  const mode = process.env.BASH_WHITELIST_MODE || "enforce";
  const strict = (process.env.BASH_WHITELIST_STRICT || "true") !== "false";
  const isEnforce = mode === "enforce";

  // ── Load custom whitelist from env ───────────────────────────────
  let whitelist: string[] = [...DEFAULT_WHITELIST];
  const customJson = process.env.BASH_WHITELIST;
  if (customJson) {
    try {
      const parsed = JSON.parse(customJson);
      if (Array.isArray(parsed)) {
        // If custom list is provided, replace (not merge) the defaults
        // This forces you to be explicit about what's allowed
        whitelist = parsed;
      }
    } catch (e) {
      console.error(`[bash-whitelist] Failed to parse BASH_WHITELIST: ${e}`);
    }
  }

  let blocked = 0;
  let allowed = 0;

  pi.on("tool_call", async (event, _ctx) => {
    if (!isToolCallEventType("bash", event)) return undefined;

    const command = (event.input?.command ?? "") as string;
    if (!command.trim()) return undefined;

    // ── Step 1: Check inline script execution (strict mode) ────────
    // These bypass ALL whitelist checks by executing arbitrary code.
    // GPT 5.5 used `npm test` to execute arbitrary code via a crafted
    // package.json — inline scripts are the #1 bypass vector.
    if (strict) {
      for (const { pattern, reason } of INLINE_SCRIPT_PATTERNS) {
        if (pattern.test(command)) {
          blocked++;
          console.error(
            `[bash-whitelist] BLOCKED inline script (#${blocked}): ${reason}\n  Command: ${command.slice(0, 120)}`
          );
          return {
            block: true,
            reason: `⛔ Bash Whitelist (strict): ${reason}\n\nInline scripts bypass the whitelist by executing arbitrary code.\nWrite a proper file and run it instead.`,
          };
        }
      }
    }

    // ── Step 2: Check whitelist ─────────────────────────────────────
    // A command is allowed if it STARTS WITH any whitelist entry.
    // This is prefix matching — "npm run build" matches "npm run ".
    const isAllowed = whitelist.some((prefix) => command.startsWith(prefix));

    if (isAllowed) {
      allowed++;
      return undefined; // Command is whitelisted
    }

    // ── Step 3: Block or warn ──────────────────────────────────────
    if (isEnforce) {
      blocked++;
      const suggestion = findClosestMatch(command, whitelist);
      const suggestMsg = suggestion
        ? `\n\nDid you mean: ${suggestion}?`
        : "";
      console.error(
        `[bash-whitelist] BLOCKED (#${blocked}): Command not in whitelist\n  Command: ${command.slice(0, 120)}`
      );
      return {
        block: true,
        reason: [
          `⛔ Bash Whitelist: Command not allowed.`,
          ``,
          `Command: ${command.slice(0, 120)}`,
          ``,
          `This command is not in the bash whitelist (Level 4 security).`,
          `Only explicitly permitted commands can run.`,
          suggestMsg,
          ``,
          `To add this command: set BASH_WHITELIST env var with additional entries.`,
          `To switch to log mode (for discovering what you need): set BASH_WHITELIST_MODE=log`,
        ].join("\n"),
      };
    } else {
      // Log mode: allow but log for building your whitelist
      console.error(
        `[bash-whitelist] LOG (not in whitelist): ${command.slice(0, 120)}`
      );
      return undefined; // Allow through in log mode
    }
  });
}

// ── Helper: Find closest whitelist match ────────────────────────────
function findClosestMatch(command: string, whitelist: string[]): string | null {
  const cmdPrefix = command.split(" ")[0]; // e.g., "docker"
  for (const entry of whitelist) {
    if (entry.trimStart().startsWith(cmdPrefix)) {
      return entry.trim();
    }
  }
  return null;
}