import { tavily } from "@tavily/core";

const groqApiKey = Bun.env.GROQ_API_KEY;
const tavilyApiKey = Bun.env.TAVILY_API_KEY;

if (!groqApiKey) throw new Error("GROQ_API_KEY is missing");
if (!tavilyApiKey) throw new Error("TAVILY_API_KEY is missing");

export const groqBaseUrl = "https://api.groq.com/openai/v1";
export const groqApiKeyValue = groqApiKey;
export const model = Bun.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
export const tvly = tavily({ apiKey: tavilyApiKey });
