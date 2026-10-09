import { getDefaultModel, getDefaultProvider } from "../providers/index.ts";
import type { ChatMessage } from "../providers/types.ts";
import { webSearchToolDef } from "../tools/web-search.ts";
import { runAgent } from "./loop.ts";

export type { ChatMessage };

export type AgentResult = {
	answer: string;
	messages: ChatMessage[];
};

/**
 * Backwards-compatible entry: single web_search tool via default provider.
 * New code should call runAgent() directly with any tools.
 */
export async function askAgent(
	userInput: string,
	previousMessages: ChatMessage[] = [],
): Promise<AgentResult> {
	const provider = getDefaultProvider();

	const result = await runAgent({
		provider,
		model: getDefaultModel(),
		userInput,
		previousMessages,
		tools: [webSearchToolDef],
		maxSteps: 10,
		onEvent: (event) => {
			if (event.type === "thinking") console.log("\n⏳ Asking Groq...");
			if (event.type === "tool_start")
				console.log(`\n🔎 Searching the web for: "${(event.args as { query?: string })?.query ?? ""}"`);
		},
	});

	return { answer: result.answer, messages: result.messages };
}
