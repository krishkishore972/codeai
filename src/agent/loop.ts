import type {
	ChatMessage,
	LLMProvider,
	Usage,
} from "../providers/types.ts";
import { buildToolMap, toOpenAITool, type Tool } from "../tools/types.ts";
import { DEFAULT_SYSTEM_PROMPT } from "./system.ts";

export type AgentEvent =
	| { type: "thinking"; step: number }
	| { type: "tool_start"; step: number; tool: string; args: unknown }
	| {
			type: "tool_end";
			step: number;
			tool: string;
			ok: boolean;
			ms: number;
	  }
	| { type: "done"; steps: number; usage: Usage };

export type RunAgentOptions = {
	provider: LLMProvider;
	model?: string;
	system?: string;
	userInput: string;
	previousMessages?: ChatMessage[];
	tools?: Tool[];
	maxSteps?: number;
	onEvent?: (event: AgentEvent) => void;
};

export type AgentResult = {
	answer: string;
	messages: ChatMessage[];
	steps: number;
	usage: Usage;
};

const emptyUsage = (): Usage => ({
	prompt_tokens: 0,
	completion_tokens: 0,
	total_tokens: 0,
});

function addUsage(a: Usage, b?: Usage): Usage {
	if (!b) return a;
	return {
		prompt_tokens: a.prompt_tokens + b.prompt_tokens,
		completion_tokens: a.completion_tokens + b.completion_tokens,
		total_tokens: a.total_tokens + b.total_tokens,
	};
}

function safeParseJson(raw: string): unknown {
	try {
		return raw.trim() === "" ? {} : JSON.parse(raw);
	} catch {
		throw new Error(`Invalid JSON tool arguments: ${raw}`);
	}
}

function ensureSystemMessage(
	messages: ChatMessage[],
	system: string,
): ChatMessage[] {
	if (messages.length > 0 && messages[0]?.role === "system") return messages;
	return [{ role: "system", content: system }, ...messages];
}

/**
 * Generic provider-agnostic ReAct loop.
 * Future file/shell tools just get added to `tools` — no loop changes needed.
 */
export async function runAgent(
	options: RunAgentOptions,
): Promise<AgentResult> {
	const {
		provider,
		model = provider.defaultModel,
		system = DEFAULT_SYSTEM_PROMPT,
		userInput,
		previousMessages = [],
		tools = [],
		maxSteps = 25,
		onEvent,
	} = options;

	const toolMap = buildToolMap(tools);
	const openAITools = tools.map(toOpenAITool);

	let messages: ChatMessage[] = ensureSystemMessage(
		[...previousMessages, { role: "user", content: userInput }],
		system,
	);

	let usage = emptyUsage();
	let steps = 0;

	while (true) {
		if (steps >= maxSteps) {
			throw new Error(
				`Agent exceeded maxSteps (${maxSteps}). Last input still unresolved.`,
			);
		}
		steps += 1;
		onEvent?.({ type: "thinking", step: steps });

		const { message, usage: turnUsage } = await provider.chat({
			model,
			messages,
			tools: openAITools.length > 0 ? openAITools : undefined,
			tool_choice: "auto",
		});
		usage = addUsage(usage, turnUsage);

		const toolCalls = message.tool_calls ?? [];

		// No tools requested -> final answer
		if (toolCalls.length === 0) {
			const answer = message.content ?? "";
			messages = [...messages, { role: "assistant", content: answer }];
			onEvent?.({ type: "done", steps, usage });
			return { answer, messages, steps, usage };
		}

		messages = [
			...messages,
			{
				role: "assistant",
				content: message.content,
				tool_calls: toolCalls,
			},
		];

		// Execute requested tools sequentially (keeps message order deterministic).
		// Parallel is possible later with Promise.all + ordered push.
		for (const call of toolCalls) {
			if (call.type !== "function") {
				messages = [
					...messages,
					{
						role: "tool",
						tool_call_id: call.id,
						content: JSON.stringify({
							error: "Only function tools are supported",
						}),
					},
				];
				continue;
			}

			const toolName = call.function.name;
			const tool = toolMap.get(toolName);
			const startedAt = Date.now();
			let args: unknown = null;

			try {
				args = safeParseJson(call.function.arguments);
			} catch (error) {
				messages = [
					...messages,
					{
						role: "tool",
						tool_call_id: call.id,
						content: JSON.stringify({
							error: error instanceof Error ? error.message : String(error),
						}),
					},
				];
				onEvent?.({
					type: "tool_end",
					step: steps,
					tool: toolName,
					ok: false,
					ms: Date.now() - startedAt,
				});
				continue;
			}

			if (!tool) {
				messages = [
					...messages,
					{
						role: "tool",
						tool_call_id: call.id,
						content: JSON.stringify({ error: `Unknown tool: ${toolName}` }),
					},
				];
				onEvent?.({
					type: "tool_end",
					step: steps,
					tool: toolName,
					ok: false,
					ms: Date.now() - startedAt,
				});
				continue;
			}

			onEvent?.({ type: "tool_start", step: steps, tool: toolName, args });

			try {
				const result = await tool.execute(args);
				messages = [
					...messages,
					{
						role: "tool",
						tool_call_id: call.id,
						content: JSON.stringify(result).slice(0, 20_000),
					},
				];
				onEvent?.({
					type: "tool_end",
					step: steps,
					tool: toolName,
					ok: true,
					ms: Date.now() - startedAt,
				});
			} catch (error) {
				messages = [
					...messages,
					{
						role: "tool",
						tool_call_id: call.id,
						content: JSON.stringify({
							error: error instanceof Error ? error.message : String(error),
						}),
					},
				];
				onEvent?.({
					type: "tool_end",
					step: steps,
					tool: toolName,
					ok: false,
					ms: Date.now() - startedAt,
				});
			}
		}
	}
}
