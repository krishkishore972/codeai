import { askAgent, type ChatMessage } from "../agent/ask-agent.ts";

export async function main() {
	console.log("======================================");
	console.log("          Groq Web Search Agent");
	console.log("======================================");
	console.log('Type "exit" to quit.\n');

	let conversation: ChatMessage[] = [];
	console.write("You: ");

	for await (const line of console) {
		const input = line.trim();
		if (!input) {
			console.write("You: ");
			continue;
		}
		if (input.toLowerCase() === "exit") {
			console.log("\nGoodbye");
			break;
		}

		try {
			const result = await askAgent(input, conversation);
			conversation = result.messages;
			console.log(`\nAI: ${result.answer}\n`);
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
