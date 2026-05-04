/**
 * Straico Provider Extension for Pi
 *
 * Routes requests through Straico's OpenAI-compatible API gateway.
 * Gives access to 70+ models (GPT, Claude, Gemini, Perplexity Sonar,
 * DeepSeek, Qwen, Grok, etc.) via a single API key with credit-based pricing.
 *
 * Limitations:
 * - No true SSE streaming (responses arrive complete)
 * - Tool calling is not proxied (Straico strips tool params)
 * - Best for text generation, research (Perplexity Sonar), and chat
 *
 * Usage:
 *   export STRAICO_API_KEY=your-key
 *   pi  # extension auto-discovered from ~/.pi/agent/extensions/straico/
 *   /model straico/perplexity/sonar
 *
 * Fetches available models dynamically from Straico's /v0/models endpoint.
 */

import {
	type AssistantMessage,
	type AssistantMessageEventStream,
	type Context,
	type Model,
	type SimpleStreamOptions,
	type Api,
	calculateCost,
	createAssistantMessageEventStream,
} from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const STRAICO_BASE_URL = "https://api.straico.com/v0";

// Known context windows (Straico doesn't expose this in their API)
const CONTEXT_WINDOWS: Record<string, number> = {
	"openai/gpt-5": 128000,
	"openai/gpt-5.2": 128000,
	"openai/gpt-5-mini": 128000,
	"openai/gpt-5-nano": 128000,
	"openai/gpt-4.1": 1047576,
	"openai/gpt-4.1-mini": 1047576,
	"openai/gpt-4.1-nano": 1047576,
	"anthropic/claude-sonnet-4.5": 200000,
	"anthropic/claude-sonnet-4": 200000,
	"anthropic/claude-opus-4": 200000,
	"claude-opus-4-5": 200000,
	"claude-haiku-4-5-5": 200000,
	"perplexity/sonar": 127072,
	"perplexity/sonar-deep-research": 127072,
	"google/gemini-3-flash-preview": 1048576,
	"google/gemini-3-pro-preview": 1048576,
	"google/gemini-2.5-flash-lite": 1048576,
	"deepseek/deepseek-chat-v3.1": 131000,
	"deepseek/deepseek-r1": 131000,
	"x-ai/grok-4": 256000,
	"x-ai/grok-4-fast": 1047576,
	"x-ai/grok-4-fast-reasoning": 1047576,
	"qwen/qwen3-coder": 131000,
};

// Models known to support reasoning
const REASONING_MODELS = new Set([
	"anthropic/claude-3.7-sonnet:thinking",
	"deepseek/deepseek-r1",
	"deepseek/deepseek-r1:nitro",
	"openai/o1",
	"openai/o1-pro",
	"openai/o1-mini",
	"o3-2025-04-16",
	"openai/o3-mini",
	"openai/o3-mini-high",
	"openai/o4-mini",
	"openai/o4-mini-high",
	"x-ai/grok-3-mini-beta",
	"x-ai/grok-4",
	"x-ai/grok-4-fast-reasoning",
	"qwen/qwen3-235b-a22b",
	"moonshotai/kimi-k2-thinking",
	"nvidia/llama-3.3-nemotron-super-49b-v1.5",
	"perplexity/sonar-deep-research",
]);

// Models that support image input
const IMAGE_MODELS = new Set([
	"openai/gpt-4o-2024-08-06",
	"openai/gpt-4o-2024-11-20",
	"openai/gpt-4o-mini",
	"openai/gpt-4.1",
	"openai/gpt-4.1-mini",
	"openai/gpt-4.1-nano",
	"openai/gpt-5",
	"openai/gpt-5.2",
	"google/gemini-3-flash-preview",
	"google/gemini-3-pro-preview",
	"google/gemini-2.5-flash-lite",
	"anthropic/claude-sonnet-4",
	"anthropic/claude-sonnet-4.5",
	"anthropic/claude-opus-4",
	"claude-opus-4-5",
	"claude-haiku-4-5-5",
	"qwen/qwen2.5-vl-32b-instruct:free",
	"qwen/qwen-2-vl-72b-instruct",
	"z-ai/glm-4.5v",
]);

interface StraicoApiModel {
	name: string;
	model: string;
	pricing: { coins: number; words: number };
	max_output: number;
}

async function fetchStraicoModels(apiKey: string): Promise<StraicoApiModel[]> {
	const response = await fetch(`${STRAICO_BASE_URL}/models`, {
		headers: { Authorization: `Bearer ${apiKey}` },
	});
	if (!response.ok) {
		throw new Error(`Straico /models failed: ${response.status}`);
	}
	const data = (await response.json()) as { data: StraicoApiModel[] };
	return data.data;
}

function toProviderModels(apiModels: StraicoApiModel[]) {
	return apiModels.map((m) => ({
		id: m.model,
		name: `${m.name} (${m.pricing.coins} coins/100w)`,
		reasoning: REASONING_MODELS.has(m.model),
		input: IMAGE_MODELS.has(m.model) ? (["text", "image"] as const) : (["text"] as const),
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: CONTEXT_WINDOWS[m.model] ?? 32000,
		maxTokens: m.max_output,
	}));
}

// Hardcoded fallback if API fetch fails
const FALLBACK_MODELS = [
	{
		id: "perplexity/sonar",
		name: "Perplexity Sonar (web search, 1 coin/100w)",
		reasoning: false,
		input: ["text"] as const,
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 127072,
		maxTokens: 127072,
	},
	{
		id: "perplexity/sonar-deep-research",
		name: "Perplexity Sonar Deep Research (192 coins/100w)",
		reasoning: true,
		input: ["text"] as const,
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 127072,
		maxTokens: 127072,
	},
	{
		id: "deepseek/deepseek-chat-v3.1",
		name: "DeepSeek V3.1 (2 coins/100w)",
		reasoning: false,
		input: ["text"] as const,
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 131000,
		maxTokens: 131000,
	},
	{
		id: "openai/gpt-4.1-mini",
		name: "GPT-4.1 Mini (1 coin/100w)",
		reasoning: false,
		input: ["text", "image"] as const,
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 1047576,
		maxTokens: 1047576,
	},
	{
		id: "google/gemini-3-flash-preview",
		name: "Gemini 3 Flash Preview (2 coins/100w)",
		reasoning: false,
		input: ["text", "image"] as const,
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 1048576,
		maxTokens: 66000,
	},
];

/**
 * Custom streaming implementation for Straico.
 *
 * Straico doesn't support true SSE streaming — it always returns the complete
 * response as a single JSON object. We wrap it in the pi event stream format.
 */
function streamStraico(
	model: Model<Api>,
	context: Context,
	options?: SimpleStreamOptions,
): AssistantMessageEventStream {
	const stream = createAssistantMessageEventStream();

	(async () => {
		const output: AssistantMessage = {
			role: "assistant",
			content: [],
			api: model.api,
			provider: model.provider,
			model: model.id,
			usage: {
				input: 0,
				output: 0,
				cacheRead: 0,
				cacheWrite: 0,
				totalTokens: 0,
				cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
			},
			stopReason: "stop",
			timestamp: Date.now(),
		};

		try {
			const apiKey = options?.apiKey ?? process.env.STRAICO_API_KEY ?? "";

			// Convert pi messages to OpenAI format
			const messages = context.messages.map((msg) => {
				if (msg.role === "user") {
					if (typeof msg.content === "string") {
						return { role: "user" as const, content: msg.content };
					}
					// Handle image content
					const parts = msg.content.map((c) => {
						if (c.type === "text") return { type: "text" as const, text: c.text };
						return {
							type: "image_url" as const,
							image_url: { url: `data:${c.mimeType};base64,${c.data}` },
						};
					});
					return { role: "user" as const, content: parts };
				}
				if (msg.role === "assistant") {
					const text = msg.content
						.filter((c) => c.type === "text")
						.map((c) => (c as { type: "text"; text: string }).text)
						.join("\n");
					return { role: "assistant" as const, content: text };
				}
				if (msg.role === "toolResult") {
					// Straico doesn't support tool results — convert to user message
					const text = msg.content
						.filter((c) => c.type === "text")
						.map((c) => (c as { type: "text"; text: string }).text)
						.join("\n");
					return { role: "user" as const, content: `[Tool result]: ${text}` };
				}
				return { role: "user" as const, content: "" };
			});

			// Add system prompt
			if (context.systemPrompt) {
				messages.unshift({ role: "system" as any, content: context.systemPrompt });
			}

			stream.push({ type: "start", partial: output });

			const response = await fetch(`${STRAICO_BASE_URL}/chat/completions`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${apiKey}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					model: model.id,
					messages,
					max_tokens: options?.maxTokens || Math.min(model.maxTokens, 16384),
					temperature: 0.7,
				}),
				signal: options?.signal,
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Straico API error ${response.status}: ${errorText}`);
			}

			const data = (await response.json()) as {
				choices: Array<{
					message: { content: string; role: string };
					finish_reason: string;
				}>;
				usage?: {
					prompt_tokens: number;
					completion_tokens: number;
					total_tokens: number;
				};
			};

			const choice = data.choices?.[0];
			if (!choice) {
				throw new Error("Straico returned empty choices");
			}

			const text = choice.message.content ?? "";

			// Emit the complete text as a single block
			output.content.push({ type: "text", text });
			stream.push({ type: "text_start", contentIndex: 0, partial: output });
			stream.push({ type: "text_delta", contentIndex: 0, delta: text, partial: output });
			stream.push({ type: "text_end", contentIndex: 0, content: text, partial: output });

			// Usage
			if (data.usage) {
				output.usage.input = data.usage.prompt_tokens;
				output.usage.output = data.usage.completion_tokens;
				output.usage.totalTokens = data.usage.total_tokens;
				calculateCost(model, output.usage);
			}

			output.stopReason = choice.finish_reason === "length" ? "length" : "stop";

			stream.push({
				type: "done",
				reason: output.stopReason as "stop" | "length",
				message: output,
			});
			stream.end();
		} catch (error) {
			output.stopReason = options?.signal?.aborted ? "aborted" : "error";
			output.errorMessage = error instanceof Error ? error.message : String(error);
			stream.push({ type: "error", reason: output.stopReason, error: output });
			stream.end();
		}
	})();

	return stream;
}

export default function (pi: ExtensionAPI) {
	// Register synchronously with fallback models so pi sees the provider immediately.
	// The factory function must call registerProvider before returning.
	pi.registerProvider("straico", {
		baseUrl: STRAICO_BASE_URL,
		apiKey: "STRAICO_API_KEY",
		api: "straico-api" as Api,
		models: FALLBACK_MODELS,
		streamSimple: streamStraico,
	});

	// Then upgrade to the full model list asynchronously (if API key is set).
	// registerProvider after init takes effect immediately without /reload.
	const apiKey = process.env.STRAICO_API_KEY;
	if (apiKey) {
		fetchStraicoModels(apiKey)
			.then((apiModels) => {
				const models = toProviderModels(apiModels);
				pi.registerProvider("straico", {
					baseUrl: STRAICO_BASE_URL,
					apiKey: "STRAICO_API_KEY",
					api: "straico-api" as Api,
					models,
					streamSimple: streamStraico,
				});
			})
			.catch(() => {
				// Already registered with fallback models — nothing to do
			});
	}
}
