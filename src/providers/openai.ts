// OpenAI provider — Chat Completions with streaming.
// Docs: https://developers.openai.com/api/docs/guides/function-calling

import { consola } from "consola";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { StopReason } from "../types.js";
import type { CompletionOptions, Provider, StreamEvent } from "./types.js";

// Translate our universal Message[] into OpenAI chat messages. Tool calls live
// on the assistant message; tool results become separate "tool" messages.
function toOpenAIMessages(messages: CompletionOptions["messages"]): ChatCompletionMessageParam[] {
	const out: ChatCompletionMessageParam[] = [];

	for (const m of messages) {
		if (m.role === "system") continue; // system prompt is sent separately

		if (typeof m.content === "string") {
			out.push({ role: m.role, content: m.content });
			continue;
		}

		let text = "";
		const toolCalls: Extract<ChatCompletionMessageParam, { role: "assistant" }>["tool_calls"] = [];

		for (const b of m.content) {
			if (b.type === "text") {
				text += b.text;
			} else if (b.type === "tool_use") {
				toolCalls.push({
					id: b.id,
					type: "function",
					function: { name: b.name, arguments: JSON.stringify(b.arguments) },
				});
			} else if (b.type === "tool_result") {
				out.push({ role: "tool", tool_call_id: b.tool_use_id, content: b.content });
			}
		}

		if (m.role === "assistant") {
			out.push({
				role: "assistant",
				content: text || null,
				...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
			});
		} else if (text) {
			out.push({ role: "user", content: text });
		}
	}

	return out;
}

function toStopReason(finishReason: string | null): StopReason {
	switch (finishReason) {
		case "tool_calls":
			return "tool_use";
		case "length":
			return "max_tokens";
		default:
			return "end_turn";
	}
}

// baseURL is optional so the same adapter can serve other OpenAI-compatible APIs.
export function createOpenAIProvider(apiKey: string, baseURL?: string): Provider {
	const client = new OpenAI({ apiKey, baseURL });

	return {
		name: "openai",

		async *complete(options: CompletionOptions): AsyncGenerator<StreamEvent> {
			const messages: ChatCompletionMessageParam[] = [
				{ role: "system", content: options.system },
				...toOpenAIMessages(options.messages),
			];

			const tools = options.tools.map((t) => ({
				type: "function" as const,
				function: {
					name: t.name,
					description: t.description,
					parameters: t.input_schema,
				},
			}));

			consola.debug(`openai: ${options.model}, ${messages.length} messages, ${tools.length} tools`);

			const stream = await client.chat.completions.create({
				model: options.model,
				messages,
				tools: tools.length > 0 ? tools : undefined,
				stream: true,
				stream_options: { include_usage: true }, // usage arrives in a final chunk
				max_completion_tokens: options.max_tokens,
				// Reasoning models reject temperature, so only send it when set.
				...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
			});

			// Tool-call arguments stream as string fragments, keyed by index.
			const toolCalls: Record<number, { id: string; name: string; args: string }> = {};
			let finishReason: string | null = null;
			let inputTokens = 0;
			let outputTokens = 0;
			let cachedTokens = 0;

			for await (const chunk of stream) {
				// The final usage chunk has an empty choices array.
				if (chunk.usage) {
					inputTokens = chunk.usage.prompt_tokens;
					outputTokens = chunk.usage.completion_tokens;
					cachedTokens = chunk.usage.prompt_tokens_details?.cached_tokens ?? 0;
				}

				const choice = chunk.choices[0];
				if (!choice) continue;
				if (choice.finish_reason) finishReason = choice.finish_reason;

				const delta = choice.delta;

				if (delta.content) {
					yield { type: "text_delta", delta: delta.content };
				}

				for (const tc of delta.tool_calls ?? []) {
					const idx = tc.index;

					// Only the first fragment of a call carries the id and name.
					if (tc.id) {
						const name = tc.function?.name ?? "";
						toolCalls[idx] = { id: tc.id, name, args: "" };
						yield { type: "tool_use_start", id: tc.id, name };
					}

					const args = tc.function?.arguments;
					const acc = toolCalls[idx];
					if (args && acc) {
						acc.args += args;
						yield { type: "tool_use_input_delta", id: acc.id, delta: args };
					}
				}
			}

			for (const tc of Object.values(toolCalls)) {
				yield { type: "tool_use_end", id: tc.id };
			}

			yield {
				type: "message_end",
				stop_reason: toStopReason(finishReason),
				usage: {
					input_tokens: inputTokens,
					output_tokens: outputTokens,
					...(cachedTokens > 0 ? { cache_read_tokens: cachedTokens } : {}),
				},
			};
		},
	};
}