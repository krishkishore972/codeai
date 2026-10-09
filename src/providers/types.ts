import type OpenAI from "openai";

export type ChatMessage =
	OpenAI.Chat.Completions.ChatCompletionMessageParam;

export type OpenAIToolDefinition = {
	type: "function";
	function: {
		name: string;
		description: string;
		parameters: Record<string, unknown>;
	};
};

export type ChatRequest = {
	model: string;
	messages: ChatMessage[];
	tools?: OpenAIToolDefinition[];
	tool_choice?: "auto" | "none" | "required";
};

export type Usage = {
	prompt_tokens: number;
	completion_tokens: number;
	total_tokens: number;
};

export type ChatResponseMessage = {
	content: string | null;
	tool_calls?: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[];
};

export interface LLMProvider {
	readonly name: string;
	readonly defaultModel: string;
	chat(request: ChatRequest): Promise<{
		message: ChatResponseMessage;
		usage?: Usage;
	}>;
}
