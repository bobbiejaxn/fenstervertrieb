/**
 * Brave Search Extension for Pi
 *
 * Privacy-focused web search via Brave Search REST API.
 * Replaces the bash MCP wrappers (web-search.sh, brave-search-cli.sh, brave-search.ts).
 *
 * Usage:
 *   export BRAVE_API_KEY=your-key
 *   pi  # extension auto-discovered from .pi/extensions/brave-search/
 *
 * Get API key: https://api.search.brave.com/app/keys
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

interface BraveSearchResult {
	title: string;
	url: string;
	description: string;
	age?: string;
}

interface BraveWebSearchResponse {
	query: { original: string };
	web?: { results: BraveSearchResult[] };
	news?: {
		results: Array<{
			title: string;
			url: string;
			description: string;
			age: string;
			source: string;
		}>;
	};
	faq?: {
		results: Array<{
			question: string;
			answer: string;
		}>;
	};
	infobox?: {
		long_desc?: string;
		attributes?: Array<{ key: string; value: string }>;
	};
}

function formatResults(response: BraveWebSearchResponse): string {
	const sections: string[] = [];

	if (response.web?.results && response.web.results.length > 0) {
		sections.push("## Web Results\n");
		for (const [i, result] of response.web.results.slice(0, 10).entries()) {
			sections.push(`${i + 1}. **${result.title}**`);
			sections.push(`   ${result.description}`);
			sections.push(`   Source: ${result.url}\n`);
		}
	}

	if (response.news?.results && response.news.results.length > 0) {
		sections.push("## News\n");
		for (const [i, result] of response.news.results.slice(0, 5).entries()) {
			sections.push(`${i + 1}. **${result.title}** (${result.age})`);
			sections.push(`   ${result.description}`);
			sections.push(`   Source: ${result.source} - ${result.url}\n`);
		}
	}

	if (response.faq?.results && response.faq.results.length > 0) {
		sections.push("## Frequently Asked Questions\n");
		for (const faq of response.faq.results) {
			sections.push(`**Q: ${faq.question}**`);
			sections.push(`A: ${faq.answer}\n`);
		}
	}

	if (response.infobox) {
		sections.push("## Quick Info\n");
		if (response.infobox.long_desc) {
			sections.push(response.infobox.long_desc + "\n");
		}
		if (response.infobox.attributes) {
			for (const attr of response.infobox.attributes) {
				sections.push(`- **${attr.key}**: ${attr.value}`);
			}
		}
		sections.push("");
	}

	if (sections.length === 0) {
		return "No results found.";
	}

	return sections.join("\n");
}

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "web_search",
		label: "Web Search",
		description:
			"Search the web using Brave Search API. Privacy-focused alternative to Google. " +
			"Returns web results, news, FAQs, and info boxes. Requires BRAVE_API_KEY env var.",
		parameters: Type.Object({
			query: Type.String({ description: "Search query" }),
			count: Type.Optional(
				Type.Number({ description: "Number of results (default 10, max 20)", minimum: 1, maximum: 20 }),
			),
			freshness: Type.Optional(
				Type.String({
					description: 'Filter by age: "pd" (past day), "pw" (past week), "pm" (past month), "py" (past year)',
				}),
			),
			country: Type.Optional(Type.String({ description: 'Country code, e.g. "us", "gb", "ca"' })),
		}),

		async execute(_toolCallId, params) {
			const apiKey = process.env.BRAVE_API_KEY;
			if (!apiKey) {
				return {
					content: [
						{
							type: "text",
							text: "Error: BRAVE_API_KEY environment variable not set.\n\n" +
								"To fix:\n" +
								"  1. Get API key: https://api.search.brave.com/app/keys\n" +
								"  2. Add to ~/.zshrc: export BRAVE_API_KEY=your-key\n" +
								"  3. Reload: source ~/.zshrc",
						},
					],
					isError: true,
				};
			}

			const searchParams = new URLSearchParams({
				q: params.query,
				count: String(params.count ?? 10),
				safesearch: "moderate",
				text_decorations: "false",
				spellcheck: "true",
			});

			if (params.freshness) searchParams.set("freshness", params.freshness);
			if (params.country) searchParams.set("country", params.country);

			const response = await fetch(
				`https://api.search.brave.com/res/v1/web/search?${searchParams}`,
				{
					headers: {
						Accept: "application/json",
						"Accept-Encoding": "gzip",
						"X-Subscription-Token": apiKey,
					},
				},
			);

			if (!response.ok) {
				const body = await response.text();
				return {
					content: [{ type: "text", text: `Brave Search API error ${response.status}: ${body}` }],
					isError: true,
				};
			}

			const data = (await response.json()) as BraveWebSearchResponse;
			return {
				content: [{ type: "text", text: formatResults(data) }],
			};
		},
	});
}
