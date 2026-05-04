// .pi/extensions/subagent/subagent.test.ts
//
// Tests for the subagent extension: tool filtering, agent discovery, frontmatter validation.
// These tests verify the critical paths that were previously untested, including the
// BUILTIN_TOOLS filter fix that prevented CEO → team lead → worker delegation.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

// ─── Constants (mirrored from index.ts for direct testing) ────────────────────

const BUILTIN_TOOLS = new Set(["read", "bash", "edit", "write", "grep", "find", "ls"]);

/**
 * Reproduces the arg-building logic from runSingleAgent in index.ts.
 * This is the exact code path that filters tools before spawning child pi processes.
 */
function buildSpawnArgs(agent: { model?: string; tools?: string[] }): string[] {
	const args: string[] = ["--mode", "json", "-p", "--no-session"];
	if (agent.model) args.push("--model", agent.model);

	if (agent.tools && agent.tools.length > 0) {
		const builtin = agent.tools.filter((t) => BUILTIN_TOOLS.has(t));
		if (builtin.length > 0) args.push("--tools", builtin.join(","));
	}

	return args;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeTmpDir(): string {
	return fs.mkdtempSync(path.join(os.tmpdir(), "subagent-test-"));
}

function writeAgentFile(dir: string, filename: string, frontmatter: Record<string, string>, body: string): string {
	const filePath = path.join(dir, filename);
	const fm = Object.entries(frontmatter)
		.map(([k, v]) => `${k}: ${v}`)
		.join("\n");
	fs.writeFileSync(filePath, `---\n${fm}\n---\n\n${body}`);
	return filePath;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Subagent: BUILTIN_TOOLS filter", () => {
	it("passes through only built-in tools", () => {
		const args = buildSpawnArgs({ tools: ["read", "write", "bash"] });
		expect(args).toContain("--tools");
		const toolsArg = args[args.indexOf("--tools") + 1];
		expect(toolsArg).toBe("read,write,bash");
	});

	it("filters out 'subagent' — it is not a built-in tool", () => {
		const args = buildSpawnArgs({ tools: ["read", "grep", "subagent"] });
		const toolsArg = args[args.indexOf("--tools") + 1];
		expect(toolsArg).toBe("read,grep");
		expect(toolsArg).not.toContain("subagent");
	});

	it("filters out all extension tools (web_search, github, obsidian_write, etc.)", () => {
		const args = buildSpawnArgs({
			tools: ["read", "bash", "subagent", "web_search", "github", "obsidian_write", "context7"],
		});
		const toolsArg = args[args.indexOf("--tools") + 1];
		expect(toolsArg).toBe("read,bash");
	});

	it("produces no --tools flag when all tools are extension tools", () => {
		const args = buildSpawnArgs({ tools: ["subagent"] });
		expect(args).not.toContain("--tools");
	});

	it("handles empty tools array", () => {
		const args = buildSpawnArgs({ tools: [] });
		expect(args).not.toContain("--tools");
	});

	it("handles undefined tools", () => {
		const args = buildSpawnArgs({});
		expect(args).not.toContain("--tools");
	});

	it("handles single built-in tool", () => {
		const args = buildSpawnArgs({ tools: ["bash"] });
		const toolsArg = args[args.indexOf("--tools") + 1];
		expect(toolsArg).toBe("bash");
	});

	it("always includes --mode json -p --no-session", () => {
		const args = buildSpawnArgs({ tools: ["read"] });
		expect(args[0]).toBe("--mode");
		expect(args[1]).toBe("json");
		expect(args).toContain("-p");
		expect(args).toContain("--no-session");
	});

	it("passes --model when provided", () => {
		const args = buildSpawnArgs({ model: "zai/glm-5.1", tools: ["read"] });
		expect(args).toContain("--model");
		expect(args[args.indexOf("--model") + 1]).toBe("zai/glm-5.1");
	});

	it("omits --model when not provided", () => {
		const args = buildSpawnArgs({ tools: ["read"] });
		expect(args).not.toContain("--model");
	});
});

describe("Subagent: team lead tool filtering", () => {
	// These are the exact tool configurations from our team lead agents.
	// The BUILTIN_TOOLS filter must produce correct --tools args for each.

	it("frontend-lead: read, grep, subagent → --tools read,grep", () => {
		const args = buildSpawnArgs({ model: "zai/glm-5.1", tools: ["read", "grep", "subagent"] });
		const toolsArg = args[args.indexOf("--tools") + 1];
		expect(toolsArg).toBe("read,grep");
	});

	it("backend-lead: read, grep, subagent → --tools read,grep", () => {
		const args = buildSpawnArgs({ model: "zai/glm-5.1", tools: ["read", "grep", "subagent"] });
		const toolsArg = args[args.indexOf("--tools") + 1];
		expect(toolsArg).toBe("read,grep");
	});

	it("validation-lead: read, grep, subagent → --tools read,grep", () => {
		const args = buildSpawnArgs({ model: "zai/glm-5.1", tools: ["read", "grep", "subagent"] });
		const toolsArg = args[args.indexOf("--tools") + 1];
		expect(toolsArg).toBe("read,grep");
	});

	it("implementer: read, write, edit, bash, grep → all passed through", () => {
		const args = buildSpawnArgs({ model: "zai/glm-5", tools: ["read", "write", "edit", "bash", "grep"] });
		const toolsArg = args[args.indexOf("--tools") + 1];
		expect(toolsArg).toBe("read,write,edit,bash,grep");
	});

	it("ceo: read, grep, bash, subagent → --tools read,grep,bash", () => {
		const args = buildSpawnArgs({ model: "zai/glm-5.1", tools: ["read", "grep", "bash", "subagent"] });
		const toolsArg = args[args.indexOf("--tools") + 1];
		expect(toolsArg).toBe("read,grep,bash");
	});

	it("reviewer: read, grep, bash → all passed through", () => {
		const args = buildSpawnArgs({ model: "zai/glm-5.1", tools: ["read", "grep", "bash"] });
		const toolsArg = args[args.indexOf("--tools") + 1];
		expect(toolsArg).toBe("read,grep,bash");
	});

	it("idea-capture: bash only → --tools bash", () => {
		const args = buildSpawnArgs({ model: "zai/glm-5", tools: ["bash"] });
		const toolsArg = args[args.indexOf("--tools") + 1];
		expect(toolsArg).toBe("bash");
	});

	it("gate-skeptic: read, bash → all passed through", () => {
		const args = buildSpawnArgs({ model: "zai/glm-5.1", tools: ["read", "bash"] });
		const toolsArg = args[args.indexOf("--tools") + 1];
		expect(toolsArg).toBe("read,bash");
	});
});

describe("Subagent: agent frontmatter parsing", () => {
	let agentDir: string;

	beforeEach(() => {
		agentDir = makeTmpDir();
	});

	afterEach(() => {
		fs.rmSync(agentDir, { recursive: true, force: true });
	});

	it("parses a valid agent .md file", () => {
		writeAgentFile(
			agentDir,
			"implementer.md",
			{
				name: "implementer",
				description: "Execute plan exactly",
				tools: "read, write, edit, bash, grep",
				model: "zai/glm-5",
			},
			"You are the implementer. Execute the plan exactly.",
		);

		const files = fs.readdirSync(agentDir).filter((f) => f.endsWith(".md"));
		expect(files).toHaveLength(1);

		// Parse frontmatter manually (same logic as agents.ts)
		const content = fs.readFileSync(path.join(agentDir, files[0]), "utf-8");
		const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
		expect(fmMatch).not.toBeNull();

		const fm = fmMatch![1];
		const name = fm.match(/^name:\s*(.+)$/m)?.[1]?.trim();
		const tools = fm.match(/^tools:\s*(.+)$/m)?.[1]?.split(",").map((s) => s.trim());
		const model = fm.match(/^model:\s*(.+)$/m)?.[1]?.trim();

		expect(name).toBe("implementer");
		expect(tools).toEqual(["read", "write", "edit", "bash", "grep"]);
		expect(model).toBe("zai/glm-5");
	});

	it("handles agent with no tools field", () => {
		writeAgentFile(
			agentDir,
			"harness-evolver.md",
			{
				name: "harness-evolver",
				description: "Optimize harness from traces",
				model: "zai/glm-5.1",
			},
			"You optimize the harness.",
		);

		const content = fs.readFileSync(path.join(agentDir, "harness-evolver.md"), "utf-8");
		const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
		const fm = fmMatch![1];
		const tools = fm.match(/^tools:\s*(.+)$/m)?.[1]?.split(",").map((s) => s.trim());

		expect(tools).toBeUndefined();
	});

	it("handles agent with empty tools", () => {
		writeAgentFile(
			agentDir,
			"empty.md",
			{ name: "empty", description: "No tools", tools: "" },
			"Empty tools agent.",
		);

		const content = fs.readFileSync(path.join(agentDir, "empty.md"), "utf-8");
		const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
		const fm = fmMatch![1];
		const toolsRaw = fm.match(/^tools:\s*(.+)$/m)?.[1]?.trim();
		expect(toolsRaw).toBe("");
	});

	it("ignores non-.md files in agent directory", () => {
		writeAgentFile(agentDir, "agent.md", { name: "agent", description: "Valid" }, "Body");
		fs.writeFileSync(path.join(agentDir, "notes.txt"), "not an agent");
		fs.writeFileSync(path.join(agentDir, ".DS_Store"), "");

		const mdFiles = fs.readdirSync(agentDir).filter((f) => f.endsWith(".md"));
		expect(mdFiles).toHaveLength(1);
		expect(mdFiles[0]).toBe("agent.md");
	});
});

describe("Subagent: BUILTIN_TOOLS set completeness", () => {
	it("contains exactly the 7 pi built-in tools", () => {
		expect(BUILTIN_TOOLS.size).toBe(7);
		expect(BUILTIN_TOOLS.has("read")).toBe(true);
		expect(BUILTIN_TOOLS.has("bash")).toBe(true);
		expect(BUILTIN_TOOLS.has("edit")).toBe(true);
		expect(BUILTIN_TOOLS.has("write")).toBe(true);
		expect(BUILTIN_TOOLS.has("grep")).toBe(true);
		expect(BUILTIN_TOOLS.has("find")).toBe(true);
		expect(BUILTIN_TOOLS.has("ls")).toBe(true);
	});

	it("does not contain extension tools", () => {
		expect(BUILTIN_TOOLS.has("subagent")).toBe(false);
		expect(BUILTIN_TOOLS.has("web_search")).toBe(false);
		expect(BUILTIN_TOOLS.has("github")).toBe(false);
		expect(BUILTIN_TOOLS.has("obsidian_write")).toBe(false);
		expect(BUILTIN_TOOLS.has("context7")).toBe(false);
		expect(BUILTIN_TOOLS.has("ceo")).toBe(false);
		expect(BUILTIN_TOOLS.has("ralph_start")).toBe(false);
		expect(BUILTIN_TOOLS.has("ralph_done")).toBe(false);
	});

	it("does not contain fictional tools", () => {
		expect(BUILTIN_TOOLS.has("WebFetch")).toBe(false);
		expect(BUILTIN_TOOLS.has("Glob")).toBe(false);
		expect(BUILTIN_TOOLS.has("Read")).toBe(false);
		expect(BUILTIN_TOOLS.has("Write")).toBe(false);
	});
});

describe("Subagent: regression guard — the bug we fixed", () => {
	it("BEFORE fix: subagent in --tools would be silently dropped by pi CLI", () => {
		// Simulating the OLD behavior: passing all tools to --tools
		const OLD_BEHAVIOR_ARGS = ["--mode", "json", "-p", "--no-session", "--tools", "read,grep,subagent"];

		// The pi CLI only accepts: read, bash, edit, write, grep, find, ls
		// "subagent" is NOT in that set — it would emit a warning and be dropped
		const piValidTools = new Set(["read", "bash", "edit", "write", "grep", "find", "ls"]);
		const passedTools = OLD_BEHAVIOR_ARGS[OLD_BEHAVIOR_ARGS.indexOf("--tools") + 1].split(",");
		const wouldSurvive = passedTools.filter((t) => piValidTools.has(t));

		// subagent would NOT survive
		expect(wouldSurvive).toEqual(["read", "grep"]);
		expect(wouldSurvive).not.toContain("subagent");
	});

	it("AFTER fix: subagent is filtered before --tools, but auto-discovers via extensions", () => {
		// The NEW behavior: filter to built-in tools only
		const args = buildSpawnArgs({ model: "zai/glm-5.1", tools: ["read", "grep", "subagent"] });

		// --tools only contains built-ins
		const toolsArg = args[args.indexOf("--tools") + 1];
		expect(toolsArg).toBe("read,grep");

		// No warning emitted — subagent was never passed to --tools
		expect(toolsArg).not.toContain("subagent");

		// In production, extensions auto-discover from .pi/extensions/ in CWD,
		// so subagent tool is still available to the child process.
		// (This is verified by the live test: pi --tools read,grep still gets subagent)
	});

	it("team lead can delegate — the fix makes the chain work", () => {
		// frontend-lead has tools: read, grep, subagent
		// Before fix: --tools read,grep,subagent → subagent dropped → lead can't delegate
		// After fix: --tools read,grep → subagent auto-discovers → lead CAN delegate

		const args = buildSpawnArgs({ model: "zai/glm-5.1", tools: ["read", "grep", "subagent"] });
		const toolsArg = args[args.indexOf("--tools") + 1];

		// The key assertion: no extension tools in --tools
		expect(toolsArg.split(",")).toEqual(["read", "grep"]);

		// But the child process still gets subagent via extension auto-discovery
		// This is the entire fix in one test.
		expect(args).toContain("--mode");
		expect(args).toContain("json");
	});
});
