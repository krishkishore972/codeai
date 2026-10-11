/**
 * Web Search Tool
 * 
 * Searches the live web using the Tavily API for current or external information.
 * Use this when the user's question requires up-to-date information, recent events,
 * current products, current documentation, or facts that may have changed.
 * Returns a structured result with an answer summary and individual search results.
 */
import { tvly } from "../config.ts";
import type { Tool } from "./types.ts";
import { errorResult, okResult } from "./types.ts";

export type WebSearchArgs = { query: string };

export type WebSearchResult = {
	answer: string | null;
	results: { title: string; url: string; content: string }[];
};

async function executeWebSearch(args: WebSearchArgs): Promise<ReturnType<typeof okResult>> {
	if (!args?.query || typeof args.query !== "string" || !args.query.trim()) {
		return errorResult("web_search requires a non-empty 'query' string");
	}

	try {
		const response = await tvly.search(args.query, {
			maxResults: 3,
			includeAnswer: true,
			searchDepth: "basic",
			timeout: 30_000,
		});

		const result: WebSearchResult = {
			answer: response.answer ?? null,
			results: response.results.map((result) => ({
				title: result.title,
				url: result.url,
				content: result.content,
			})),
		};

		return okResult(JSON.stringify(result));
	} catch (err) {
		return errorResult(err);
	}
}

export const webSearchTool: Tool = {
	name: "web_search",
	description:
		"Search the live web for current or external information. " +
		"Use this when the user's question requires up-to-date information, " +
		"recent events, current products, current documentation, or facts " +
		"that may have changed.",
	inputSchema: {
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
export const webSearchToolDef = {
	type: "function" as const,
	function: {
		name: webSearchTool.name,
		description: webSearchTool.description,
		parameters: webSearchTool.inputSchema,
	},
};

export async function webSearch(
	args: WebSearchArgs,
): Promise<WebSearchResult> {
	const result = await webSearchTool.execute(args);
	if (result.isError) {
		throw new Error(result.output);
	}
	return JSON.parse(result.output) as WebSearchResult;
}