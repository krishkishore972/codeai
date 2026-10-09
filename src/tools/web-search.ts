import { tvly } from "../config.ts";
import type { Tool } from "./types.ts";

export type WebSearchArgs = { query: string };

export type WebSearchResult = {
	answer: string | null;
	results: { title: string; url: string; content: string }[];
};

async function executeWebSearch(args: WebSearchArgs): Promise<WebSearchResult> {
	if (!args?.query || typeof args.query !== "string" || !args.query.trim()) {
		throw new Error("web_search requires a non-empty 'query' string");
	}

	const response = await tvly.search(args.query, {
		maxResults: 3,
		includeAnswer: true,
		searchDepth: "basic",
		timeout: 30_000,
	});

	return {
		answer: response.answer ?? null,
		results: response.results.map((result) => ({
			title: result.title,
			url: result.url,
			content: result.content,
		})),
	};
}

export const webSearchToolDef: Tool<WebSearchArgs, WebSearchResult> = {
	name: "web_search",
	description:
		"Search the live web for current or external information. " +
		"Use this when the user's question requires up-to-date information, " +
		"recent events, current products, current documentation, or facts " +
		"that may have changed.",
	parameters: {
		type: "object",
		properties: {
			query: {
				type: "string",
				description: "The search query to send to the web search engine.",
			},
		},
		required: ["query"],
	},
	execute: executeWebSearch,
};

// --- Backwards-compatible exports (old ask-agent imports these) ---
export const webSearchTool = {
	type: "function" as const,
	function: {
		name: webSearchToolDef.name,
		description: webSearchToolDef.description,
		parameters: webSearchToolDef.parameters,
	},
};

export async function webSearch(
	args: WebSearchArgs,
): Promise<WebSearchResult> {
	return webSearchToolDef.execute(args);
}
