/**
 * Model Router Extension
 *
 * Queries Ollama Cloud for available models, matches them to agent roles
 * using a capability-based registry, and provides:
 *
 * 1. Dynamic model assignment — pick the best model per agent role
 * 2. New model notifications — alert on launch when new models appear
 * 3. Registry updates — suggest registry changes when new models are found
 *
 * Reads .pi/extensions/model-router/registry.yaml for capability scores.
 * Writes .pi/extensions/model-router/.seen-models.json to track what's been notified.
 * Outputs .pi/extensions/model-router/agent-model-map.json for other extensions to consume.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as http from "node:http";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { Text } from "@mariozechner/pi-tui";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Capabilities {
  coding: number;
  reasoning: number;
  structured: number;
  speed: number;
  agentic: number;
}

interface ModelEntry {
  ollama_id: string;
  provider: string;
  params: string;
  context: number;
  capabilities: Capabilities;
  role_fit: string[];
  tags: string[];
  notes: string;
}

interface AgentRole {
  requires: Record<string, number>;
  description: string;
}

interface Registry {
  models: Record<string, ModelEntry>;
  agent_roles: Record<string, AgentRole>;
}

interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    parent_model: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

interface ModelScore {
  modelKey: string;
  ollamaId: string;
  score: number;
  capabilities: Capabilities;
}

interface NewModelAlert {
  ollamaId: string;
  family: string;
  size: string;
  potentialRoles: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EXT_DIR = path.resolve(__dirname);
const REGISTRY_PATH = path.join(EXT_DIR, "registry.yaml");
const SEEN_PATH = path.join(EXT_DIR, ".seen-models.json");
const MODEL_MAP_PATH = path.join(EXT_DIR, "agent-model-map.json");
const CACHE_PATH = path.join(EXT_DIR, ".ollama-cache.json");
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Minimal YAML parser for the registry format.
 * Handles: mappings, scalars, numbers, nested keys, lists.
 * No external dependencies needed.
 */
function parseSimpleYaml(text: string): any {
  const lines = text.split("\n");
  const root: any = {};
  const stack: Array<{ obj: any; indent: number; key?: string; isArray: boolean }> = [
    { obj: root, indent: -1, isArray: false },
  ];

  for (const rawLine of lines) {
    const line = rawLine.replace(/#.*$/, ""); // strip comments
    if (line.trim() === "" || line.trim().startsWith("---")) continue;

    // Handle list items
    const listMatch = line.match(/^(\s*)-\s+(.*)/);
    if (listMatch) {
      const indent = listMatch[1].length;
      const val = listMatch[2].trim();
      const parent = stack[stack.length - 1];
      if (Array.isArray(parent.obj)) {
        parent.obj.push(parseValue(val));
      }
      continue;
    }

    // Handle key: value
    const kvMatch = line.match(/^(\s*)([\w._-]+):\s*(.*)/);
    if (!kvMatch) continue;

    const indent = kvMatch[1].length;
    const key = kvMatch[2];
    let value = kvMatch[3].trim();

    // Pop stack to find parent
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
    const parent = stack[stack.length - 1];

    if (value === "" || value === "|") {
      // Nested mapping or block scalar — create nested object
      const newObj: any = {};
      if (typeof parent.obj === "object" && !Array.isArray(parent.obj)) {
        parent.obj[key] = newObj;
      }
      stack.push({ obj: newObj, indent, key, isArray: false });
    } else {
      // Inline value
      if (typeof parent.obj === "object" && !Array.isArray(parent.obj)) {
        parent.obj[key] = parseValue(value);
      }
    }
  }

  return root;
}

function parseValue(val: string): any {
  if (val.startsWith("[") && val.endsWith("]")) {
    return val
      .slice(1, -1)
      .split(",")
      .map((s) => parseValue(s.trim()));
  }
  if (val.startsWith('"') && val.endsWith('"')) return val.slice(1, -1);
  if (val === "true") return true;
  if (val === "false") return false;
  if (val === "null" || val === "~") return null;
  const num = Number(val);
  if (!isNaN(num) && val !== "") return num;
  return val;
}

function loadRegistry(): Registry {
  const raw = fs.readFileSync(REGISTRY_PATH, "utf-8");
  return parseSimpleYaml(raw) as Registry;
}

function loadSeen(): string[] {
  try {
    return JSON.parse(fs.readFileSync(SEEN_PATH, "utf-8"));
  } catch {
    return [];
  }
}

function saveSeen(ids: string[]): void {
  fs.writeFileSync(SEEN_PATH, JSON.stringify(ids, null, 2));
}

function loadCache(): { timestamp: number; models: OllamaModel[] } | null {
  try {
    const data = JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8"));
    if (Date.now() - data.timestamp < CACHE_TTL_MS) {
      return data;
    }
  } catch { /* ignore */ }
  return null;
}

function saveCache(models: OllamaModel[]): void {
  fs.writeFileSync(CACHE_PATH, JSON.stringify({ timestamp: Date.now(), models }, null, 2));
}

/**
 * Fetch available models from Ollama API.
 * Tries localhost first, then falls back to checking cloud models.
 */
async function fetchOllamaModels(): Promise<OllamaModel[]> {
  // Try localhost Ollama first
  const localModels = await fetchFromApi("http://localhost:11434");
  if (localModels.length > 0) return localModels;

  // Try common alternatives
  const altModels = await fetchFromApi("http://127.0.0.1:11434");
  if (altModels.length > 0) return altModels;

  return [];
}

async function fetchFromApi(baseUrl: string): Promise<OllamaModel[]> {
  return new Promise((resolve) => {
    const url = `${baseUrl}/api/tags`;
    const timeout = 3000;

    const req = http.get(url, { timeout }, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const data = JSON.parse(body);
          resolve(data.models || []);
        } catch {
          resolve([]);
        }
      });
    });

    req.on("error", () => resolve([]));
    req.on("timeout", () => {
      req.destroy();
      resolve([]);
    });
  });
}

/**
 * Extract base model family from Ollama model ID.
 * e.g. "deepseek-v4-flash:cloud" → "deepseek-v4-flash"
 * e.g. "qwen3-coder:480b-cloud" → "qwen3-coder"
 */
function modelFamily(modelId: string): string {
  const noTag = modelId.split(":")[0];
  // Strip size suffix like :480b, :27b, :70b
  return noTag.replace(/[-:]\d+b$/i, "");
}

/**
 * Score a model against an agent role's requirements.
 * Returns 0-100 weighted score.
 */
function scoreModel(caps: Capabilities, requires: Record<string, number>): number {
  let totalWeight = 0;
  let weightedSum = 0;

  const capMap: Record<string, number> = {
    coding: caps.coding,
    reasoning: caps.reasoning,
    structured: caps.structured,
    speed: caps.speed,
    agentic: caps.agentic,
  };

  for (const [dim, weight] of Object.entries(requires)) {
    const score = capMap[dim] ?? 50;
    weightedSum += score * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}

/**
 * Find the best model for each agent role from the registry.
 */
function buildModelMap(registry: Registry): Record<string, ModelScore> {
  const map: Record<string, ModelScore> = {};

  for (const [roleKey, role] of Object.entries(registry.agent_roles)) {
    let best: ModelScore = {
      modelKey: "",
      ollamaId: "",
      score: 0,
      capabilities: { coding: 0, reasoning: 0, structured: 0, speed: 0, agentic: 0 },
    };

    for (const [modelKey, model] of Object.entries(registry.models)) {
      const s = scoreModel(model.capabilities, role.requires);
      if (s > best.score) {
        best = {
          modelKey,
          ollamaId: model.ollama_id,
          score: s,
          capabilities: model.capabilities,
        };
      }
    }

    map[roleKey] = best;
  }

  return map;
}

/**
 * Detect new Ollama models not in registry or seen list.
 */
function detectNewModels(
  ollamaModels: OllamaModel[],
  registry: Registry,
  seen: string[],
): NewModelAlert[] {
  const knownIds = new Set([
    ...Object.values(registry.models).map((m) => m.ollama_id),
    ...seen,
  ]);

  const alerts: NewModelAlert[] = [];

  for (const m of ollamaModels) {
    if (knownIds.has(m.name)) continue;
    // Only flag cloud models or large local models
    if (!m.name.includes("cloud") && (m.details?.parameter_size || "").includes("b")) {
      // Check if it's a substantial model (not tiny embeddings etc)
      const sizeStr = m.details?.parameter_size || "";
      const sizeNum = parseInt(sizeStr);
      if (sizeNum > 0 && sizeNum < 3) continue; // Skip models under 3B params
    }

    const family = m.details?.family || modelFamily(m.name);
    const size = m.details?.parameter_size || "unknown";

    // Guess potential roles from family heuristics
    const potentialRoles = guessRoles(family, size);

    alerts.push({
      ollamaId: m.name,
      family,
      size,
      potentialRoles,
    });
  }

  return alerts;
}

/**
 * Heuristic role guessing for unknown models based on family name.
 */
function guessRoles(family: string, size: string): string[] {
  const f = family.toLowerCase();
  const roles: string[] = [];

  if (f.includes("coder") || f.includes("code")) {
    roles.push("implementer", "test-writer", "frontend-lead");
  }
  if (f.includes("deepseek") || f.includes("reason")) {
    roles.push("architect", "reviewer", "security-reviewer");
  }
  if (f.includes("glm") || f.includes("qwen3") || f.includes("kimi")) {
    roles.push("implementer", "debug-agent", "reviewer");
  }
  if (f.includes("minimax") || f.includes("gemma")) {
    roles.push("product-manager", "idea-capture", "sre");
  }
  if (roles.length === 0) {
    roles.push("general — needs benchmarking");
  }

  return roles;
}

/**
 * Format a notification banner for new models.
 */
function formatAlert(alerts: NewModelAlert[]): string {
  if (alerts.length === 0) return "";

  const lines = [
    "╔══════════════════════════════════════════════════════════════╗",
    "║  🆕 NEW MODELS DETECTED — consider adding to registry       ║",
    "╚══════════════════════════════════════════════════════════════╝",
    "",
  ];

  for (const a of alerts) {
    lines.push(`  ${a.ollamaId}`);
    lines.push(`    Family: ${a.family} | Size: ${a.size}`);
    lines.push(`    Potential roles: ${a.potentialRoles.join(", ")}`);
    lines.push("");
  }

  lines.push("  Run: pi model-router update-registry");
  lines.push("  Or edit: .pi/extensions/model-router/registry.yaml");

  return lines.join("\n");
}

/**
 * Format the model assignment summary for launch notification.
 */
function formatModelMapSummary(map: Record<string, ModelScore>, registry: Registry): string {
  const lines: string[] = [];

  // Group by model
  const byModel: Record<string, string[]> = {};
  for (const [role, score] of Object.entries(map)) {
    const key = score.ollamaId || score.modelKey;
    if (!byModel[key]) byModel[key] = [];
    byModel[key].push(`${role} (${score.score})`);
  }

  for (const [model, roles] of Object.entries(byModel).sort()) {
    lines.push(`  ${model}`);
    for (const r of roles) {
      lines.push(`    → ${r}`);
    }
  }

  return lines.join("\n");
}

// ─── Extension Entry Point ────────────────────────────────────────────────────

export default function modelRouter(pi: ExtensionAPI) {
  const registry = loadRegistry();
  const seen = loadSeen();

  // Build the optimal model map
  const modelMap = buildModelMap(registry);

  // Write model map for other extensions/scripts to consume
  fs.writeFileSync(MODEL_MAP_PATH, JSON.stringify(modelMap, null, 2));

  // ─── On-launch notification ──────────────────────────────────────────────

  // Check Ollama for new models (async, non-blocking)
  (async () => {
    let ollamaModels: OllamaModel[] = [];

    // Try cache first
    const cached = loadCache();
    if (cached) {
      ollamaModels = cached.models;
    } else {
      ollamaModels = await fetchOllamaModels();
      if (ollamaModels.length > 0) {
        saveCache(ollamaModels);
      }
    }

    // Detect new models
    const alerts = detectNewModels(ollamaModels, registry, seen);

    if (alerts.length > 0) {
      const msg = formatAlert(alerts);
      console.log(msg);

      // Update seen list so we don't re-notify
      const newSeen = [...seen, ...alerts.map((a) => a.ollamaId)];
      saveSeen(newSeen);
    }
  })();

  // ─── Register tools ──────────────────────────────────────────────────────

  pi.registerTool({
    name: "model-router",
    description:
      "Query and manage the Ollama Cloud model registry. Find the best model for an agent role, list available models, or detect new ones.",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: [
            "best-for-role",
            "list-models",
            "list-roles",
            "scan-new",
            "refresh",
            "update-agents",
          ],
          description:
            "Action: best-for-role (find best model), list-models (show registry), list-roles (show agent roles), scan-new (check Ollama for new models), refresh (re-fetch Ollama models), update-agents (write model: to agent .md files)",
        },
        role: {
          type: "string",
          description: "Agent role name (for best-for-role action)",
        },
        model: {
          type: "string",
          description: "Model key to get details for",
        },
      },
      required: ["action"],
    } as any,

    execute: async (params: Record<string, unknown>) => {
      const action = params.action as string;

      switch (action) {
        // ─── Best model for a role ──────────────────────────────────────
        case "best-for-role": {
          const role = params.role as string;
          if (!role) {
            return {
              output: "Error: provide 'role' parameter. Use list-roles to see available roles.",
            };
          }

          const roleDef = registry.agent_roles[role];
          if (!roleDef) {
            const available = Object.keys(registry.agent_roles).join(", ");
            return {
              output: `Unknown role "${role}". Available: ${available}`,
            };
          }

          // Score all models for this role
          const scored: Array<{ key: string; entry: ModelEntry; score: number }> = [];
          for (const [key, entry] of Object.entries(registry.models)) {
            scored.push({ key, entry, score: scoreModel(entry.capabilities, roleDef.requires) });
          }
          scored.sort((a, b) => b.score - a.score);

          const lines = [
            `## Best models for "${role}" — ${roleDef.description}`,
            "",
            "Weighted requirements:",
          ];
          for (const [dim, w] of Object.entries(roleDef.requires)) {
            lines.push(`  ${dim}: ${(w * 100).toFixed(0)}%`);
          }
          lines.push("");
          lines.push("| # | Model | Ollama ID | Score | Coding | Reason | Struct | Speed | Agentic |");
          lines.push("|---|-------|-----------|-------|--------|--------|--------|-------|---------|");

          scored.slice(0, 10).forEach((s, i) => {
            const c = s.entry.capabilities;
            lines.push(
              `| ${i + 1} | ${s.key} | \`${s.entry.ollama_id}\` | **${s.score}** | ${c.coding} | ${c.reasoning} | ${c.structured} | ${c.speed} | ${c.agentic} |`,
            );
          });

          lines.push("");
          lines.push(`**Recommended:** \`${scored[0].entry.ollama_id}\` (${scored[0].key}, score ${scored[0].score})`);
          lines.push("");
          lines.push(`_Notes: ${scored[0].entry.notes}_`);

          return { output: lines.join("\n") };
        }

        // ─── List all models in registry ───────────────────────────────
        case "list-models": {
          const lines = [
            "## Model Registry",
            "",
            "| Model | Ollama ID | Params | Context | Coding | Reason | Struct | Speed | Agentic | Tags |",
            "|-------|-----------|--------|---------|--------|--------|--------|-------|---------|------|",
          ];

          for (const [key, m] of Object.entries(registry.models)) {
            const ctx = m.context >= 1000000 ? `${m.context / 1000000}M` : `${m.context / 1000}k`;
            lines.push(
              `| ${key} | \`${m.ollama_id}\` | ${m.params} | ${ctx} | ${m.capabilities.coding} | ${m.capabilities.reasoning} | ${m.capabilities.structured} | ${m.capabilities.speed} | ${m.capabilities.agentic} | ${m.tags.join(", ")} |`,
            );
          }

          return { output: lines.join("\n") };
        }

        // ─── List all agent roles ──────────────────────────────────────
        case "list-roles": {
          const lines = ["## Agent Roles", ""];

          // Group by current assignment
          for (const [role, def] of Object.entries(registry.agent_roles)) {
            const current = modelMap[role];
            const reqs = Object.entries(def.requires)
              .map(([k, v]) => `${k}:${(v * 100).toFixed(0)}%`)
              .join(" ");
            lines.push(
              `**${role}** → ${current?.ollamaId || "unassigned"} (score ${current?.score || 0})`,
            );
            lines.push(`  ${def.description}`);
            lines.push(`  Requirements: ${reqs}`);
            lines.push("");
          }

          return { output: lines.join("\n") };
        }

        // ─── Scan for new models ───────────────────────────────────────
        case "scan-new": {
          const ollamaModels = await fetchOllamaModels();
          if (ollamaModels.length === 0) {
            return {
              output:
                "No Ollama instance detected. Is Ollama running? (localhost:11434)\n" +
                "Cloud models are only visible when Ollama is connected.",
            };
          }

          const alerts = detectNewModels(ollamaModels, registry, []);

          if (alerts.length === 0) {
            return {
              output: `✅ All ${ollamaModels.length} detected models are in the registry. No new models found.`,
            };
          }

          const lines = [
            `## 🆕 ${alerts.length} New Model${alerts.length > 1 ? "s" : ""} Found`,
            "",
          ];

          for (const a of alerts) {
            lines.push(`### ${a.ollamaId}`);
            lines.push(`- Family: ${a.family}`);
            lines.push(`- Size: ${a.size}`);
            lines.push(`- Potential roles: ${a.potentialRoles.join(", ")}`);
            lines.push("");
          }

          lines.push("To add these, edit: `.pi/extensions/model-router/registry.yaml`");

          return { output: lines.join("\n") };
        }

        // ─── Refresh Ollama cache ──────────────────────────────────────
        case "refresh": {
          const ollamaModels = await fetchOllamaModels();
          if (ollamaModels.length === 0) {
            return { output: "❌ Could not connect to Ollama (localhost:11434)" };
          }

          saveCache(ollamaModels);

          const lines = [`✅ Refreshed. ${ollamaModels.length} models detected:`, ""];
          for (const m of ollamaModels) {
            const family = m.details?.family || "?";
            const size = m.details?.parameter_size || "?";
            lines.push(`  ${m.name} (${family}, ${size})`);
          }

          // Check for new models
          const alerts = detectNewModels(ollamaModels, registry, loadSeen());
          if (alerts.length > 0) {
            lines.push("");
            lines.push(`🆕 ${alerts.length} new model(s) not in registry!`);
            for (const a of alerts) {
              lines.push(`  → ${a.ollamaId} (${a.family}, ${a.size})`);
            }
          }

          return { output: lines.join("\n") };
        }

        // ─── Update agent .md files with best models ──────────────────
        case "update-agents": {
          const agentsDir = path.resolve(EXT_DIR, "../../agents");
          const lines = ["## Updating agent model assignments...\n"];

          if (!fs.existsSync(agentsDir)) {
            return { output: `❌ Agents directory not found: ${agentsDir}` };
          }

          let updated = 0;
          const files = fs.readdirSync(agentsDir).filter((f) => f.endsWith(".md"));

          for (const file of files) {
            const filePath = path.join(agentsDir, file);
            const content = fs.readFileSync(filePath, "utf-8");

            // Extract current model from frontmatter
            const modelMatch = content.match(/^model:\s*(.+)$/m);
            if (!modelMatch) continue;

            const agentName = file.replace(".md", "");
            const roleKey = agentName;

            // Check if we have a role for this agent
            if (!modelMap[roleKey]) continue;

            const bestModel = modelMap[roleKey];
            const newModelLine = `model: ${bestModel.ollamaId}`;
            const oldModelLine = modelMatch[0];

            if (oldModelLine !== newModelLine) {
              const updatedContent = content.replace(oldModelLine, newModelLine);
              fs.writeFileSync(filePath, updatedContent);
              lines.push(`  ✏️ ${file}: ${modelMatch[1]} → ${bestModel.ollamaId} (score ${bestModel.score})`);
              updated++;
            } else {
              lines.push(`  ✓ ${file}: already optimal (${bestModel.ollamaId})`);
            }
          }

          lines.push("");
          lines.push(`Updated ${updated} agent(s).`);

          return { output: lines.join("\n") };
        }

        default:
          return {
            output: `Unknown action "${action}". Use: best-for-role, list-models, list-roles, scan-new, refresh, update-agents`,
          };
      }
    },
  });

  // ─── Launch banner ─────────────────────────────────────────────────────

  pi.on("session.start", () => {
    const lines = [
      "─── Model Router ───",
      `Registry: ${Object.keys(registry.models).length} models, ${Object.keys(registry.agent_roles).length} roles`,
    ];

    // Show current top assignments compactly
    const topModels = new Map<string, number>();
    for (const score of Object.values(modelMap)) {
      const key = score.ollamaId;
      topModels.set(key, (topModels.get(key) || 0) + 1);
    }

    const summary = Array.from(topModels.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([model, count]) => `${model} (${count} roles)`)
      .join(", ");

    lines.push(`Assignments: ${summary}`);

    console.log(lines.join("\n"));
  });
}
