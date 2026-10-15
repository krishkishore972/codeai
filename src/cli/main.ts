import { runAgent } from "../agent/loop.js";
import { buildSystemPrompt } from "../config/system-prompt.js";
import { allowAll } from "../permissions/types.js";
import { getDefaultModel, getModelInfo, MODELS } from "../providers/index.js";
import type { Message } from "../types.js";

const DEFAULT_PROVIDER = "groq";

export async function main(): Promise<void> {
	console.log("======================================");
	console.log("        CodeAI Agent (Groq)");
	console.log("======================================");
	console.log('Type "exit" or "quit" to exit.\n');

	const model = getDefaultModel(DEFAULT_PROVIDER);

	const system = await buildSystemPrompt();

	let messages: Message[] = [];

	console.write("You: ");

	for await (const line of console) {
		const input = line.trim();
		if (!input) {
			console.write("You: ");
			continue;
		}
		if (input.toLowerCase() === "exit" || input.toLowerCase() === "quit") {
			console.log("\nGoodbye!");
			break;
		}

		messages.push({ role: "user", content: input });

		try {
			let assistantResponse = "";

			for await (const event of runAgent({
				providerName: DEFAULT_PROVIDER,
				model,
				system,
				messages,
				maxTurns: 20,
				canUseTool: allowAll,
			})) {
				switch (event.type) {
					case "text_delta":
						assistantResponse += event.delta;
						break;
					case "tool_start":
						console.log(`\n🔧 Tool: ${event.name}`);
						break;
					case "tool_end":
						if (event.isError) {
							console.log(`   ❌ Error: ${event.result}`);
						} else {
							console.log(`   ✅ Done`);
						}
						break;
					case "tool_denied":
						console.log(`   🚫 Denied: ${event.reason}`);
						break;
					case "turn_end":
						console.log(`\n   [Turn ended: ${event.stop_reason}, tokens: ${event.usage.input_tokens}+${event.usage.output_tokens}]`);
						break;
					case "agent_end":
						messages = event.messages;
						break;
				}
			}

			if (assistantResponse) {
				console.log(`\nAI: ${assistantResponse}\n`);
			}
		} catch (error) {
			console.error(
				"\nError:",
				error instanceof Error ? error.message : error,
				"\n",
			);
		}

		console.write("You: ");
	}
}

await main();