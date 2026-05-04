/**
 * Context7 Tools Extension for Pi
 *
 * Searches up-to-date documentation and code examples via Context7 MCP server.
 * Spawns @upstash/context7-mcp as a child process for each request.
 *
 * Usage:
 *   export CONTEXT7_API_KEY=your-key
 *   pi  # extension auto-discovered from .pi/extensions/context7-tools/
 *
 * Get API key: https://context7.com
 */

import { spawn } from "node:child_process";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

const NPM_PACKAGE = "@upstash/context7-mcp";

function mcpCall(
	toolName: string,
	args: Record<string, string>,
	apiKey: string,
	signal?: AbortSignal,
): Promise<string> {
	return new Promise((resolve, reject) => {
		const payload = JSON.stringify({
			jsonrpc: "2.0",
			id: 1,
			method: "tools/call",
			params: { name: toolName, arguments: args },
		});

		const proc = spawn("npx", ["-y", NPM_PACKAGE, "--api-key", apiKey], {
			stdio: ["pipe", "pipe", "pipe"],
			shell: false,
		});

		let stdout = "";
		let stderr = "";

		proc.stdout.on("data", (data) => {
			stdout += data.toString();
		});

		proc.stderr.on("data", (data) => {
			stderr += data.toString();
		});

		proc.on("close", (code) => {
			if (code !== 0 && !stdout.trim()) {
				reject(new Error(`MCP server exited with code ${code}: ${stderr}`));
				return;
			}

			try {
				const result = JSON.parse(stdout);
				if (result.error) {
					reject(new Error(result.error.message || JSON.stringify(result.error)));
					return;
				}
				const content = result.result?.content?.[0]?.text;
				resolve(content || JSON.stringify(result, null, 2));
			} catch {
				resolve(stdout || "(no output)");
			}
		});

		proc.on("error", (err) => {
			reject(new Error(`Failed to spawn MCP server: ${err.message}`));
		});

		proc.stdin.write(payload);
		proc.stdin.end();

		if (signal) {
			const killProc = () => {
				proc.kill("SIGTERM");
				setTimeout(() => {
					if (!proc.killed) proc.kill("SIGKILL");
				}, 5000);
			};
			if (signal.aborted) killProc();
			else signal.addEventListener("abort", killProc, { once: true });
		}
	});
}

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "context7",
		label: "Context7",
		description:
			"Search up-to-date documentation and code examples for any library via Context7. " +
			'Commands: "resolve" to find a library ID, "query" to search docs. ' +
			"Requires CONTEXT7_API_KEY env var.",
		parameters: Type.Object({
			command: Type.String({
				description: 'Command to run: "resolve" (find library ID) or "query" (search docs)',
			}),
			libraryName: Type.Optional(
				Type.String({ description: "Library name to search for (required for resolve)" }),
			),
			libraryId: Type.Optional(
				Type.String({ description: 'Context7 library ID, e.g. "/vercel/next.js" (required for query)' }),
			),
			query: Type.Optional(
				Type.String({ description: "Search query describing what you need (used by both commands)" }),
			),
		}),

		async execute(_toolCallId, params, signal) {
			const apiKey = process.env.CONTEXT7_API_KEY;
			if (!apiKey) {
				return {
					content: [
						{
							type: "text",
							text: "Error: CONTEXT7_API_KEY environment variable not set.\n\n" +
								"To fix:\n" +
								"  1. Get API key: https://context7.com\n" +
								"  2. Add to ~/.zshrc: export CONTEXT7_API_KEY=your-key\n" +
								"  3. Reload: source ~/.zshrc",
						},
					],
					isError: true,
				};
			}

			try {
				switch (params.command) {
					case "resolve": {
						if (!params.libraryName) {
							return {
								content: [{ type: "text", text: "Error: resolve requires libraryName parameter." }],
								isError: true,
							};
						}
						const query = params.query || `documentation for ${params.libraryName}`;
						const result = await mcpCall(
							"resolve-library-id",
							{ libraryName: params.libraryName, query },
							apiKey,
							signal,
						);
						return { content: [{ type: "text", text: result }] };
					}

					case "query": {
						if (!params.libraryId || !params.query) {
							return {
								content: [{ type: "text", text: "Error: query requires both libraryId and query parameters." }],
								isError: true,
							};
						}
						const result = await mcpCall(
							"query-docs",
							{ libraryId: params.libraryId, query: params.query },
							apiKey,
							signal,
						);
						return { content: [{ type: "text", text: result }] };
					}

					default:
						return {
							content: [
								{
									type: "text",
									text: `Unknown command: ${params.command}\n\nAvailable commands: resolve, query`,
								},
							],
							isError: true,
						};
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				return {
					content: [{ type: "text", text: `Context7 error: ${message}` }],
					isError: true,
				};
			}
		},
	});
}
