import { groqApiKeyValue, groqBaseUrl, model } from "../config.ts";
import { createOpenAIProvider } from "./openai.ts";
import type { LLMProvider } from "./types.ts";

let cached: LLMProvider | null = null;

/** Default provider: OpenAI SDK pointed at Groq. Swap/add providers here later. */
export function getDefaultProvider(): LLMProvider {
	if (!cached) {
		cached = createOpenAIProvider({
			apiKey: groqApiKeyValue,
			baseURL: groqBaseUrl,
			defaultModel: model,
		});
	}
	return cached;
}

export function getDefaultModel(): string {
	return model;
}
