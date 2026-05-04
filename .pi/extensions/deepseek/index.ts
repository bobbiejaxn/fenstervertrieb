/**
 * DeepSeek Provider Extension for Pi
 *
 * Routes requests through DeepSeek's OpenAI-compatible API.
 * Best for deep reasoning tasks with deepseek-reasoner model.
 *
 * Note: DeepSeek has knowledge cutoff (July 2024). For real-time web research,
 * use Straico's Perplexity Sonar instead. DeepSeek excels at complex reasoning
 * on existing knowledge.
 *
 * Usage:
 *   export DEEPSEEK_API_KEY=your-key
 *   pi  # extension auto-discovered from .pi/extensions/deepseek/
 *   /model deepseek/deepseek-reasoner
 *
 * Models:
 *   - deepseek-reasoner (DeepSeek-R1): Best for complex reasoning, research
 *   - deepseek-chat: General chat, faster responses
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

const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";

const DEEPSEEK_MODELS = [
	{
		id: "deepseek-reasoner",
		name: "DeepSeek-R1 (Reasoning Mode)",
		reasoning: true,
		input: ["text"] as const,
		cost: {
			input: 0.14 / 1_000_000,   // $0.14 per 1M input tokens
			output: 2.19 / 1_000_000,  // $2.19 per 1M output tokens
			cacheRead: 0.014 / 1_000_000,  // $0.014 per 1M cache read tokens
			cacheWrite: 0.28 / 1_000_000,  // $0.28 per 1M cache write tokens
		},
		contextWindow: 64000,
		maxTokens: 8000,
	},
	{
		id: "deepseek-chat",
		name: "DeepSeek Chat (General Purpose)",
		reasoning: false,
		input: ["text"] as const,
		cost: {
			input: 0.14 / 1_000_000,
			output: 0.28 / 1_000_000,
			cacheRead: 0.014 / 1_000_000,
			cacheWrite: 0.28 / 1_000_000,
		},
		contextWindow: 64000,
		maxTokens: 8000,
	},
];

/**
 * Custom streaming implementation for DeepSeek.
 * Uses OpenAI-compatible SSE streaming.
 */
function streamDeepSeek(
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
			const apiKey = options?.apiKey ?? process.env.DEEPSEEK_API_KEY ?? "";
			if (!apiKey) {
				throw new Error("DEEPSEEK_API_KEY environment variable not set");
			}

			// Convert pi messages to OpenAI format
			const messages = context.messages.map((msg) => {
				if (msg.role === "user") {
					return {
						role: "user" as const,
						content: typeof msg.content === "string" ? msg.content : msg.content.map(c => c.type === "text" ? c.text : "").join("\n")
					};
				}
				if (msg.role === "assistant") {
					const text = msg.content
						.filter((c) => c.type === "text")
						.map((c) => (c as { type: "text"; text: string }).text)
						.join("\n");
					return { role: "assistant" as const, content: text };
				}
				if (msg.role === "toolResult") {
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

			const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${apiKey}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					model: model.id,
					messages,
					max_tokens: options?.maxTokens || model.maxTokens,
					temperature: 0.7,
					stream: true,
				}),
				signal: options?.signal,
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`DeepSeek API error ${response.status}: ${errorText}`);
			}

			const reader = response.body?.getReader();
			if (!reader) throw new Error("No response body");

			const decoder = new TextDecoder();
			let buffer = "";
			let contentIndex = 0;
			let hasStartedContent = false;

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() || "";

				for (const line of lines) {
					if (!line.trim() || line.trim() === "data: [DONE]") continue;
					if (!line.startsWith("data: ")) continue;

					const json = line.slice(6);
					try {
						const data = JSON.parse(json) as {
							choices: Array<{
								delta: { content?: string; role?: string };
								finish_reason?: string;
							}>;
							usage?: {
								prompt_tokens: number;
								completion_tokens: number;
								total_tokens: number;
								prompt_cache_hit_tokens?: number;
								prompt_cache_miss_tokens?: number;
							};
						};

						const choice = data.choices?.[0];
						if (!choice) continue;

						const content = choice.delta?.content;
						if (content) {
							if (!hasStartedContent) {
								output.content.push({ type: "text", text: "" });
								stream.push({ type: "text_start", contentIndex, partial: output });
								hasStartedContent = true;
							}
							(output.content[contentIndex] as { type: "text"; text: string }).text += content;
							stream.push({ type: "text_delta", contentIndex, delta: content, partial: output });
						}

						if (choice.finish_reason) {
							if (hasStartedContent) {
								stream.push({
									type: "text_end",
									contentIndex,
									content: (output.content[contentIndex] as { type: "text"; text: string }).text,
									partial: output,
								});
							}

							if (data.usage) {
								output.usage.input = data.usage.prompt_tokens;
								output.usage.output = data.usage.completion_tokens;
								output.usage.totalTokens = data.usage.total_tokens;
								output.usage.cacheRead = data.usage.prompt_cache_hit_tokens || 0;
								output.usage.cacheWrite = data.usage.prompt_cache_miss_tokens || 0;
								calculateCost(model, output.usage);
							}

							output.stopReason = choice.finish_reason === "length" ? "length" : "stop";
							stream.push({
								type: "done",
								reason: output.stopReason as "stop" | "length",
								message: output,
							});
						}
					} catch (e) {
						// Skip malformed JSON chunks
					}
				}
			}

			if (output.stopReason !== "stop" && output.stopReason !== "length") {
				output.stopReason = "stop";
				stream.push({ type: "done", reason: "stop", message: output });
			}

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
	pi.registerProvider("deepseek", {
		baseUrl: DEEPSEEK_BASE_URL,
		apiKey: "DEEPSEEK_API_KEY",
		api: "openai" as Api,
		models: DEEPSEEK_MODELS,
		streamSimple: streamDeepSeek,
	});
}
