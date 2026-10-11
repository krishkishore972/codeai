import type { Provider } from "./types";
import { createGroqProvider } from "./groq.js";
export {
	MODELS,
	getDefaultModel,
	getModelInfo,
	getProviderModels,
} from "./model-info";

export function createProvider(providerName: string, apiKey: string): Provider {
  switch (providerName) {
    case "groq":
      return createGroqProvider(apiKey);
    default:
      // later add anthropic, gemini, etc
      throw new Error(`Unknown provider: "${providerName}". Available: groq`);
  }
}

