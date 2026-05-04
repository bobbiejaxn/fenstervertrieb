/**
 * Obsidian Direct Write Extension for Pi
 *
 * Write content directly to PKM vault with proper PARA location and frontmatter.
 * Migrated from .pi/tools/obsidian-write.sh
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { execFile } from "child_process";
import { resolve } from "path";

function runScript(args: string[]): Promise<string> {
	const scriptPath = resolve(__dirname, "obsidian-write.sh");
	return new Promise((resolve, reject) => {
		execFile("bash", [scriptPath, ...args], { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
			if (error) {
				reject(new Error(`${stderr || error.message}`));
				return;
			}
			resolve(stdout);
		});
	});
}

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "obsidian_write",
		label: "Obsidian Write",
		description:
			"Write content directly to the Obsidian PKM vault. " +
			"Places content in the correct PARA location with proper frontmatter. " +
			"Auto-detects type and domain if not provided.",
		parameters: Type.Object({
			title: Type.String({ description: "Note title (required)" }),
			content: Type.String({ description: "Note content in markdown (required)" }),
			type: Type.Optional(
				Type.String({
					description:
						'Content type: "adr", "spec", "research", "learning", "pattern", "reference", "task", "insight", "guide", "process". Auto-detected if omitted.',
				}),
			),
			domain: Type.Optional(
				Type.String({ description: "Subject area (e.g. ai-agents, cyber-risk). Auto-detected if omitted." }),
			),
			project: Type.Optional(Type.String({ description: "Target project name" })),
			area: Type.Optional(Type.String({ description: "Target area name" })),
			location: Type.Optional(Type.String({ description: "Override: write to specific vault-relative path" })),
			status: Type.Optional(
				Type.String({ description: 'Note status: "draft", "active", "archived". Default: "active"' }),
			),
			tags: Type.Optional(Type.String({ description: "Comma-separated tags" })),
			source: Type.Optional(Type.String({ description: "External source URL" })),
			relevant_projects: Type.Optional(
				Type.String({ description: "Comma-separated related project names" }),
			),
			dry_run: Type.Optional(Type.Boolean({ description: "Preview without writing" })),
		}),

		async execute(_toolCallId, params) {
			const args: string[] = ["--title", params.title, "--content", params.content];

			if (params.type) args.push("--type", params.type);
			if (params.domain) args.push("--domain", params.domain);
			if (params.project) args.push("--project", params.project);
			if (params.area) args.push("--area", params.area);
			if (params.location) args.push("--location", params.location);
			if (params.status) args.push("--status", params.status);
			if (params.tags) args.push("--tags", params.tags);
			if (params.source) args.push("--source", params.source);
			if (params.relevant_projects) args.push("--relevant-projects", params.relevant_projects);
			if (params.dry_run) args.push("--dry-run");

			try {
				const output = await runScript(args);
				return { content: [{ type: "text", text: output }] };
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				return {
					content: [{ type: "text", text: `Error writing to Obsidian vault: ${message}` }],
					isError: true,
				};
			}
		},
	});
}
