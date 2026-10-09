import OpenAI from "openai";
import type {
	ChatRequest,
	LLMProvider,
	Usage,
} from "./types.ts";

export type OpenAIProviderOptions = {
	apiKey: string;
	baseURL?: string;
	defaultModel: string;
	timeoutMs?: number;
};

export function createOpenAIProvider(
	options: OpenAIProviderOptions,
): LLMProvider {
	const client = new OpenAI({
		apiKey: options.apiKey,
		baseURL: options.baseURL,
		timeout: options.timeoutMs ?? 30_000,
	});

	return {
		name: "openai-compatible",
		defaultModel: options.defaultModel,
		async chat(request: ChatRequest) {
			const response = await client.chat.completions.create({
				model: request.model,
				messages: request.messages,
				tools: request.tools as OpenAI.Chat.Completions.ChatCompletionTool[] | undefined,
				tool_choice: request.tool_choice ?? "auto",
			});

			const message = response.choices[0]?.message;
			if (!message) throw new Error("LLM returned no choices");

			const usage: Usage | undefined = response.usage
				? {
						prompt_tokens: response.usage.prompt_tokens,
						completion_tokens: response.usage.completion_tokens,
						total_tokens: response.usage.total_tokens,
					}
				: undefined;

			return {
				message: {
					content: message.content,
					tool_calls: message.tool_calls,
				},
				usage,
			};
		},
	};
}
