/**
 * Damage Control Extension (Level 3 — Bash Blacklist)
 *
 * Global baseline security: blocks destructive bash commands that can cause
 * irreversible damage to production systems.
 *
 * This is NOT sufficient for production (agents can bypass blacklists via
 * inline scripting). It IS the minimum every project should have enabled.
 *
 * Stack with Level 4 (bash-whitelist) or Level 5 (no-bash) for defense
 * in depth. Level 2 (system prompt) + Level 3 (this) saves tokens by
 * catching known-bad patterns early so the model doesn't waste calls.
 *
 * Environment variables:
 *   DAMAGE_CONTROL_MODE — "block" (default) or "warn"
 *     block: return { block: true } — the command never executes
 *     warn: log but allow (for testing your blacklist before enforcing)
 *   DAMAGE_CONTROL_EXTRA — JSON array of additional regex patterns to block
 *     e.g. ["gcloud\\s+.*\\bdelete\\b","az\\s+.*\\bdelete\\b"]
 *
 * Based on IndyDevDan's "5 Levels of Bash Security" framework.
 * See: https://youtu.be/yBcmIoA-vGs
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { isToolCallEventType } from "@mariozechner/pi-coding-agent";

export default function damageControl(pi: ExtensionAPI) {
  const mode = process.env.DAMAGE_CONTROL_MODE || "block";
  const isBlock = mode !== "warn";

  // ── Destructive command patterns ────────────────────────────────
  // These are patterns that cause IRREVERSIBLE damage to production systems.
  // They are a blacklist — Level 3 security. Agents CAN bypass these via
  // inline scripting (python -c, node -e, etc.) unless you also run
  // bash-whitelist (Level 4) or no-bash (Level 5).

  const destructivePatterns: Array<{ pattern: RegExp; reason: string }> = [
    // ── Filesystem destruction ──────────────────────────────────
    {
      pattern: /\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f[a-zA-Z]*\s+|-rf\s+|--recursive\s+.*--force\s+)/,
      reason: "rm -rf: recursive forced deletion is blocked by damage control",
    },
    {
      pattern: /\brm\s+.*--no-preserve-root/,
      reason: "rm --no-preserve-root: blocked by damage control",
    },
    {
      pattern: /\brm\s+(-\w*\s+)*\/\s*$/,
      reason: "rm /: root filesystem deletion blocked by damage control",
    },
    {
      pattern: /\brmdir\b/,
      reason: "rmdir: directory deletion blocked by damage control",
    },
    {
      pattern: /\btruncate\b/,
      reason: "truncate: file zeroing blocked by damage control",
    },
    {
      pattern: /\bdd\s+.*of=\/dev\//,
      reason: "dd to /dev: device-level write blocked by damage control",
    },
    {
      pattern: /\bmkfs\b/,
      reason: "mkfs: filesystem formatting blocked by damage control",
    },
    {
      pattern: /\bshred\b/,
      reason: "shred: secure deletion blocked by damage control",
    },

    // ── Docker destruction ────────────────────────────────────────
    {
      pattern: /\bdocker\s+(system\s+prune|rmi\s+|rm\s+|volume\s+rm\s+|network\s+rm\s+)/,
      reason: "docker system prune/rmi/rm: container/image/volume deletion blocked by damage control",
    },
    {
      pattern: /\bdocker\s+compose\s+down\s+.*(--rmi\s+all|--volumes|-v)\b/,
      reason: "docker compose down --rmi/--volumes: destructive compose down blocked by damage control",
    },
    {
      pattern: /\bdocker\s+(stop|kill)\s+.*(--force|-f)/,
      reason: "docker stop/kill --force: forced container stop blocked by damage control",
    },

    // ── Cloud CLI destruction ─────────────────────────────────────
    {
      pattern: /\b(gcloud|gc)\s+.*\b(delete|purge|remove)\b/,
      reason: "gcloud delete/purge: cloud resource deletion blocked by damage control",
    },
    {
      pattern: /\baws\s+.*\b(delete|terminate|deregister|teardown)\b/,
      reason: "aws delete/terminate: cloud resource deletion blocked by damage control",
    },
    {
      pattern: /\baz\s+.*\b(delete)\b/,
      reason: "az delete: cloud resource deletion blocked by damage control",
    },
    {
      pattern: /\bkubectl\s+delete\s+/,
      reason: "kubectl delete: Kubernetes resource deletion blocked by damage control",
    },
    {
      pattern: /\bhelm\s+(uninstall|delete)\b/,
      reason: "helm uninstall/delete: Helm release deletion blocked by damage control",
    },
    {
      pattern: /\bvercel\s+.*\b(remove|delete)\b/,
      reason: "vercel remove/delete: Vercel project deletion blocked by damage control",
    },

    // ── Database destruction ──────────────────────────────────────
    {
      pattern: /\b(drop|DROP)\s+(DATABASE|TABLE|SCHEMA|INDEX|VIEW)\b/i,
      reason: "DROP DATABASE/TABLE/SCHEMA: SQL data destruction blocked by damage control",
    },
    {
      pattern: /\bpsql\s+.*-c\s+.*\b(DROP|TRUNCATE|DELETE\s+FROM)\b/i,
      reason: "psql destructive SQL: database mutation blocked by damage control",
    },
    {
      pattern: /\bmysql\s+.*-e\s+.*\b(DROP|TRUNCATE|DELETE\s+FROM)\b/i,
      reason: "mysql destructive SQL: database mutation blocked by damage control",
    },
    {
      pattern: /\bsqlite3?\s+.*\b(DROP|TRUNCATE)\b/i,
      reason: "sqlite3 destructive SQL: database destruction blocked by damage control",
    },

    // ── Git destructive operations ───────────────────────────────
    {
      pattern: /\bgit\s+(push\s+.*--force|push\s+.*-f\s|reset\s+--hard\s+HEAD~\d|clean\s+-fd)/,
      reason: "git force push / hard reset / clean: destructive git operations blocked by damage control",
    },
    {
      pattern: /\bgit\s+push\s+.*:refs\/heads\//,
      reason: "git push :refs/heads (branch deletion): blocked by damage control",
    },

    // ── System destruction ────────────────────────────────────────
    {
      pattern: /\b(systemctl|service)\s+(stop|disable|restart)\s+(sshd|nginx|postgres|mysql|docker|caddy|traefik)\b/,
      reason: "systemctl stop/disable core service: blocked by damage control",
    },
    {
      pattern: /\biptables\b/,
      reason: "iptables: firewall modification blocked by damage control",
    },
    {
      pattern: /\bcrontab\s+-r\b/,
      reason: "crontab -r: cron deletion blocked by damage control",
    },

    // ── Package manager destruction ───────────────────────────────
    {
      pattern: /\bapt(-get)?\s+(autoremove|autoclean|purge)\b/,
      reason: "apt autoremove/purge: package removal blocked by damage control",
    },
    {
      pattern: /\byum\s+(remove|erase)\b/,
      reason: "yum remove/erase: package removal blocked by damage control",
    },
    {
      pattern: /\bpip\s+uninstall\s+/,
      reason: "pip uninstall: Python package removal blocked by damage control",
    },
    {
      pattern: /\bnpm\s+(cache\s+clean|cache\s+verify\s+--force)\b/,
      reason: "npm cache clean: blocked by damage control",
    },

    // ── Inline script execution (bypass vector) ──────────────────
    // These are the primary bypass vectors for blacklists.
    // A determined agent will use these to circumvent all other rules.
    // Block them UNLESS you also have bash-whitelist (Level 4) or
    // no-bash (Level 5) active, in which case this extension is redundant.
    {
      pattern: /\bpython[3]?\s+(-c|--command)\s+/,
      reason: "python -c: inline script execution blocked by damage control (use a .py file instead)",
    },
    {
      pattern: /\bnode\s+(-e|--eval)\s+/,
      reason: "node -e: inline script execution blocked by damage control (use a .js file instead)",
    },
    {
      pattern: /\bbun\s+(-e|--eval)\s+/,
      reason: "bun -e: inline script execution blocked by damage control (use a .ts file instead)",
    },
    {
      pattern: /\bdeno\s+eval\s+/,
      reason: "deno eval: inline script execution blocked by damage control (use a .ts file instead)",
    },
    {
      pattern: /\bruby\s+(-e|--eval)\s+/,
      reason: "ruby -e: inline script execution blocked by damage control",
    },
    {
      pattern: /\bperl\s+(-e|--eval)\s+/,
      reason: "perl -e: inline script execution blocked by damage control",
    },
    {
      pattern: /\bbash\s+-c\s+['"]/,
      reason: "bash -c: inline script execution blocked by damage control",
    },
  ];

  // ── Load extra patterns from env ────────────────────────────────
  let extraPatterns: Array<{ pattern: RegExp; reason: string }> = [];
  const extraJson = process.env.DAMAGE_CONTROL_EXTRA;
  if (extraJson) {
    try {
      const parsed = JSON.parse(extraJson);
      if (Array.isArray(parsed)) {
        extraPatterns = parsed.map((p: string) => ({
          pattern: new RegExp(p),
          reason: `Custom rule: ${p}`,
        }));
      }
    } catch (e) {
      console.error(`[damage-control] Failed to parse DAMAGE_CONTROL_EXTRA: ${e}`);
    }
  }

  const allPatterns = [...destructivePatterns, ...extraPatterns];

  // ── Track statistics ────────────────────────────────────────────
  let blocked = 0;
  let warned = 0;

  pi.on("tool_call", async (event, _ctx) => {
    if (!isToolCallEventType("bash", event)) return undefined;

    const command = (event.input?.command ?? "") as string;
    if (!command.trim()) return undefined;

    for (const { pattern, reason } of allPatterns) {
      if (pattern.test(command)) {
        if (isBlock) {
          blocked++;
          console.error(
            `[damage-control] BLOCKED (#${blocked}): ${reason}\n  Command: ${command.slice(0, 120)}`
          );
          return {
            block: true,
            reason: `⛔ Damage Control: ${reason}\n\nThis command is blocked by the damage-control extension (Level 3 bash blacklist).\nIf this is a false positive, set DAMAGE_CONTROL_MODE=warn to log instead of block.\nTo add exceptions, set DAMAGE_CONTROL_EXTRA with additional patterns.`,
          };
        } else {
          warned++;
          console.error(
            `[damage-control] WARN (#${warned}): ${reason}\n  Command: ${command.slice(0, 120)}`
          );
          // In warn mode, add a warning to the result but don't block
          // We can't mutate the result pre-execution in warn mode,
          // so we log the warning for trace analysis.
          return undefined; // Allow the command through in warn mode
        }
      }
    }

    return undefined; // Command allowed
  });
}