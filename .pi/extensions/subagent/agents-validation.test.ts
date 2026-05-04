// .pi/extensions/subagent/agents-validation.test.ts
//
// Validates all agent .md files in the project conform to harness conventions.
// These tests catch: old model names, PascalCase tools, invalid tools, missing fields,
// and naming inconsistencies. Run this after any agent roster change.

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const AGENTS_DIR = path.resolve(__dirname, "../../agents");
const BOARD_DIR = path.join(AGENTS_DIR, "board");

const BUILTIN_TOOLS = new Set(["read", "bash", "edit", "write", "grep", "find", "ls"]);
const VALID_MODEL_PREFIXES = ["zai/", "glm-", "straico/", "deepseek/", "MiniMax", "minimax/"];
const INVALID_TOOLS = ["WebFetch", "Read", "Write", "Edit", "Bash", "Grep", "Glob", "Find", "Ls"];
const UNSAFE_CODE_PATTERNS = [
	/eval\s*\(/,
	/shell\s*=\s*True/,
	/verify\s*=\s*False/,
	/dangerouslySetInnerHTML/,
];
const REQUIRED_FIELDS = ["name", "description"];

interface ParsedAgent {
	fileName: string;
	filePath: string;
	name: string;
	description: string;
	tools: string[];
	model: string;
	rawFrontmatter: string;
}

function parseAgentFile(filePath: string): ParsedAgent | null {
	const content = fs.readFileSync(filePath, "utf-8");
	const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
	if (!fmMatch) return null;

	const fm = fmMatch[1];
	const get = (field: string) =>
		fm.match(new RegExp(`^${field}:\\s*(.+)$`, "m"))?.[1]?.trim() ?? "";

	const toolsRaw = get("tools");
	const tools = toolsRaw ? toolsRaw.split(",").map((s) => s.trim()).filter(Boolean) : [];

	return {
		fileName: path.basename(filePath),
		filePath,
		name: get("name"),
		description: get("description"),
		tools,
		model: get("model"),
		rawFrontmatter: fm,
	};
}

function loadAllAgents(): ParsedAgent[] {
	const agents: ParsedAgent[] = [];
	if (!fs.existsSync(AGENTS_DIR)) return agents;

	for (const entry of fs.readdirSync(AGENTS_DIR, { withFileTypes: true })) {
		if (!entry.name.endsWith(".md")) continue;
		if (entry.isDirectory()) continue;
		const parsed = parseAgentFile(path.join(AGENTS_DIR, entry.name));
		if (parsed) agents.push(parsed);
	}
	return agents;
}

function loadBoardAgents(): ParsedAgent[] {
	const agents: ParsedAgent[] = [];
	if (!fs.existsSync(BOARD_DIR)) return agents;

	for (const entry of fs.readdirSync(BOARD_DIR, { withFileTypes: true })) {
		if (!entry.name.endsWith(".md")) continue;
		if (entry.isDirectory()) continue;
		const parsed = parseAgentFile(path.join(BOARD_DIR, entry.name));
		if (parsed) agents.push(parsed);
	}
	return agents;
}

// ─── Main agent tests ────────────────────────────────────────────────────────

describe("Agent Roster: all .pi/agents/*.md files", () => {
	const agents = loadAllAgents();

	it("discovers at least 20 agents", () => {
		expect(agents.length).toBeGreaterThanOrEqual(20);
	});

	it("every agent has required frontmatter fields", () => {
		const violations: string[] = [];
		for (const agent of agents) {
			for (const field of REQUIRED_FIELDS) {
				if (!(agent as any)[field]) {
					violations.push(`${agent.fileName}: missing '${field}'`);
				}
			}
		}
		expect(violations).toEqual([]);
	});

	it("every agent name is kebab-case (no spaces, no PascalCase)", () => {
		const violations: string[] = [];
		for (const agent of agents) {
			if (agent.name && /[\sA-Z]/.test(agent.name)) {
				violations.push(`${agent.fileName}: name="${agent.name}" (should be kebab-case)`);
			}
		}
		expect(violations).toEqual([]);
	});

	it("no agent uses PascalCase tools", () => {
		const violations: string[] = [];
		for (const agent of agents) {
			for (const tool of agent.tools) {
				if (/^[A-Z]/.test(tool)) {
					violations.push(`${agent.fileName}: tool="${tool}" is PascalCase`);
				}
			}
		}
		expect(violations).toEqual([]);
	});

	it("no agent lists WebFetch as a tool", () => {
		const violations: string[] = [];
		for (const agent of agents) {
			if (agent.tools.includes("WebFetch")) {
				violations.push(`${agent.fileName}: WebFetch is not a valid pi tool`);
			}
		}
		expect(violations).toEqual([]);
	});

	it("no agent references old Anthropic model names", () => {
		const oldModels = ["sonnet", "opus", "haiku", "claude-"];
		const violations: string[] = [];
		for (const agent of agents) {
			const modelLower = agent.model.toLowerCase();
			for (const old of oldModels) {
				if (modelLower.includes(old) && !modelLower.includes("zai/") && !modelLower.includes("glm")) {
					violations.push(`${agent.fileName}: model="${agent.model}" contains old Anthropic reference "${old}"`);
				}
			}
		}
		expect(violations).toEqual([]);
	});

	it("every agent has a model field", () => {
		const violations: string[] = [];
		for (const agent of agents) {
			if (!agent.model) {
				violations.push(`${agent.fileName}: missing 'model' field`);
			}
		}
		expect(violations).toEqual([]);
	});

	it("extension tools in tool lists are valid (subagent is allowed)", () => {
		const KNOWN_EXTENSION_TOOLS = new Set(["subagent", "glob"]);
		const violations: string[] = [];

		for (const agent of agents) {
			for (const tool of agent.tools) {
				const isBuiltin = BUILTIN_TOOLS.has(tool);
				const isKnownExtension = KNOWN_EXTENSION_TOOLS.has(tool);
				if (!isBuiltin && !isKnownExtension && /^[a-z]/.test(tool)) {
					// Unknown lowercase tool — might be valid, just flag it
					violations.push(`${agent.fileName}: unknown tool "${tool}" (not built-in, not known extension)`);
				}
			}
		}
		// This is informational — not a hard failure
		// We just want to see if anything unexpected shows up
		if (violations.length > 0) {
			console.log("Unknown tools (informational):", violations);
		}
	});

	it("no duplicate agent names", () => {
		const names = agents.map((a) => a.name);
		const dupes = names.filter((n, i) => names.indexOf(n) !== i);
		expect(dupes).toEqual([]);
	});

	it("no agent system prompt contains unsafe code as examples to follow", () => {
		const violations: string[] = [];
		for (const agent of agents) {
			const content = fs.readFileSync(agent.filePath, "utf-8");
			for (const pattern of UNSAFE_CODE_PATTERNS) {
				// Skip if the mention is in a "don't do this" or rule context
				const matches = content.match(new RegExp(pattern.source, "g")) || [];
				for (const match of matches) {
					const lineNum = content.substring(0, content.indexOf(match)).split("\n").length;
					const line = content.split("\n")[lineNum - 1];
					// Allow mentions in rules/warnings ("no ", "never ", "ban ", "don't ")
					const isRuleContext = /(?:no |never |ban |don't |unsafe |avoid |prevent )/i.test(line);
					if (!isRuleContext) {
						violations.push(`${agent.fileName}:${lineNum}: unsafe code not in rule context: ${line.trim().slice(0, 80)}`);
					}
				}
			}
		}
		expect(violations).toEqual([]);
	});
});

describe("Board Agents: all .pi/agents/board/*.md files", () => {
	const agents = loadBoardAgents();

	it("discovers all 8 board members", () => {
		expect(agents.length).toBe(8);
	});

	it("every board member has a model field", () => {
		const violations: string[] = [];
		for (const agent of agents) {
			if (!agent.model) {
				violations.push(`${agent.fileName}: missing 'model' field`);
			}
		}
		expect(violations).toEqual([]);
	});

	it("no board member uses PascalCase tools", () => {
		const violations: string[] = [];
		for (const agent of agents) {
			for (const tool of agent.tools) {
				if (/^[A-Z]/.test(tool)) {
					violations.push(`${agent.fileName}: tool="${tool}" is PascalCase`);
				}
			}
		}
		expect(violations).toEqual([]);
	});
});
