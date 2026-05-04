/**
 * GitHub Tools Extension for Pi
 *
 * Direct GitHub REST API integration for issues and pull requests.
 * Replaces the bash MCP wrapper (github.sh).
 *
 * Usage:
 *   export GITHUB_TOKEN=$(gh auth token)
 *   pi  # extension auto-discovered from .pi/extensions/github-tools/
 *
 * Get token: gh auth token OR https://github.com/settings/tokens
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

const GITHUB_API = "https://api.github.com";

async function githubFetch(path: string, token: string): Promise<unknown> {
	const response = await fetch(`${GITHUB_API}${path}`, {
		headers: {
			Accept: "application/vnd.github+json",
			Authorization: `Bearer ${token}`,
			"X-GitHub-Api-Version": "2022-11-28",
		},
	});

	if (!response.ok) {
		const body = await response.text();
		throw new Error(`GitHub API error ${response.status}: ${body}`);
	}

	return response.json();
}

interface GitHubIssue {
	number: number;
	title: string;
	state: string;
	user: { login: string };
	created_at: string;
	updated_at: string;
	body?: string;
	labels: Array<{ name: string }>;
	html_url: string;
}

interface GitHubPR {
	number: number;
	title: string;
	state: string;
	user: { login: string };
	created_at: string;
	updated_at: string;
	body?: string;
	head: { ref: string };
	base: { ref: string };
	html_url: string;
	merged_at?: string;
	draft?: boolean;
}

interface GitHubSearchResult {
	total_count: number;
	items: GitHubIssue[];
}

function formatIssue(issue: GitHubIssue): string {
	const labels = issue.labels.map((l) => l.name).join(", ");
	const lines = [
		`#${issue.number}: ${issue.title}`,
		`  State: ${issue.state} | Author: ${issue.user.login}`,
		`  Created: ${issue.created_at} | Updated: ${issue.updated_at}`,
	];
	if (labels) lines.push(`  Labels: ${labels}`);
	lines.push(`  URL: ${issue.html_url}`);
	if (issue.body) {
		const preview = issue.body.length > 200 ? issue.body.slice(0, 200) + "..." : issue.body;
		lines.push(`  Body: ${preview}`);
	}
	return lines.join("\n");
}

function formatPR(pr: GitHubPR): string {
	const lines = [
		`#${pr.number}: ${pr.title}`,
		`  State: ${pr.state}${pr.draft ? " (draft)" : ""}${pr.merged_at ? " (merged)" : ""} | Author: ${pr.user.login}`,
		`  Branch: ${pr.head.ref} -> ${pr.base.ref}`,
		`  Created: ${pr.created_at} | Updated: ${pr.updated_at}`,
		`  URL: ${pr.html_url}`,
	];
	if (pr.body) {
		const preview = pr.body.length > 200 ? pr.body.slice(0, 200) + "..." : pr.body;
		lines.push(`  Body: ${preview}`);
	}
	return lines.join("\n");
}

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "github",
		label: "GitHub",
		description:
			"Interact with GitHub issues and pull requests via REST API. " +
			"Commands: list-issues, get-issue, search-issues, list-prs, get-pr. " +
			"Requires GITHUB_TOKEN or GH_TOKEN env var.",
		parameters: Type.Object({
			command: Type.String({
				description: "Command to run: list-issues, get-issue, search-issues, list-prs, get-pr",
			}),
			owner: Type.Optional(Type.String({ description: "Repository owner (e.g. facebook)" })),
			repo: Type.Optional(Type.String({ description: "Repository name (e.g. react)" })),
			number: Type.Optional(Type.Number({ description: "Issue or PR number" })),
			query: Type.Optional(Type.String({ description: "Search query for search-issues" })),
			state: Type.Optional(Type.String({ description: 'Filter by state: open, closed, all (default: open)' })),
		}),

		async execute(_toolCallId, params) {
			const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
			if (!token) {
				return {
					content: [
						{
							type: "text",
							text: "Error: GITHUB_TOKEN environment variable not set.\n\n" +
								"To fix:\n" +
								"  1. Use gh CLI: export GITHUB_TOKEN=$(gh auth token)\n" +
								"  2. Or create token: https://github.com/settings/tokens\n" +
								"     export GITHUB_TOKEN=ghp_xxx...",
						},
					],
					isError: true,
				};
			}

			try {
				switch (params.command) {
					case "list-issues": {
						if (!params.owner || !params.repo) {
							return {
								content: [{ type: "text", text: "Error: list-issues requires owner and repo parameters." }],
								isError: true,
							};
						}
						const state = params.state || "open";
						const issues = (await githubFetch(
							`/repos/${params.owner}/${params.repo}/issues?state=${state}&per_page=30`,
							token,
						)) as GitHubIssue[];
						const filtered = issues.filter((i) => !("pull_request" in i));
						if (filtered.length === 0) {
							return { content: [{ type: "text", text: `No ${state} issues found.` }] };
						}
						return {
							content: [{ type: "text", text: filtered.map(formatIssue).join("\n\n") }],
						};
					}

					case "get-issue": {
						if (!params.owner || !params.repo || params.number === undefined) {
							return {
								content: [{ type: "text", text: "Error: get-issue requires owner, repo, and number parameters." }],
								isError: true,
							};
						}
						const issue = (await githubFetch(
							`/repos/${params.owner}/${params.repo}/issues/${params.number}`,
							token,
						)) as GitHubIssue;
						return { content: [{ type: "text", text: formatIssue(issue) }] };
					}

					case "search-issues": {
						if (!params.query) {
							return {
								content: [{ type: "text", text: "Error: search-issues requires a query parameter." }],
								isError: true,
							};
						}
						const result = (await githubFetch(
							`/search/issues?q=${encodeURIComponent(params.query)}&per_page=20`,
							token,
						)) as GitHubSearchResult;
						if (result.items.length === 0) {
							return { content: [{ type: "text", text: "No issues found matching the query." }] };
						}
						const header = `Found ${result.total_count} results (showing ${result.items.length}):\n\n`;
						return {
							content: [{ type: "text", text: header + result.items.map(formatIssue).join("\n\n") }],
						};
					}

					case "list-prs": {
						if (!params.owner || !params.repo) {
							return {
								content: [{ type: "text", text: "Error: list-prs requires owner and repo parameters." }],
								isError: true,
							};
						}
						const state = params.state || "open";
						const prs = (await githubFetch(
							`/repos/${params.owner}/${params.repo}/pulls?state=${state}&per_page=30`,
							token,
						)) as GitHubPR[];
						if (prs.length === 0) {
							return { content: [{ type: "text", text: `No ${state} pull requests found.` }] };
						}
						return {
							content: [{ type: "text", text: prs.map(formatPR).join("\n\n") }],
						};
					}

					case "get-pr": {
						if (!params.owner || !params.repo || params.number === undefined) {
							return {
								content: [{ type: "text", text: "Error: get-pr requires owner, repo, and number parameters." }],
								isError: true,
							};
						}
						const pr = (await githubFetch(
							`/repos/${params.owner}/${params.repo}/pulls/${params.number}`,
							token,
						)) as GitHubPR;
						return { content: [{ type: "text", text: formatPR(pr) }] };
					}

					default:
						return {
							content: [
								{
									type: "text",
									text: `Unknown command: ${params.command}\n\nAvailable commands: list-issues, get-issue, search-issues, list-prs, get-pr`,
								},
							],
							isError: true,
						};
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				return {
					content: [{ type: "text", text: `GitHub API error: ${message}` }],
					isError: true,
				};
			}
		},
	});
}
