import type { OpenAIToolDefinition } from "../providers/types.ts";

export interface Tool<TArgs = unknown, TResult = unknown> {
	name: string;
	description: string;
	/** JSON Schema for args */
	parameters: Record<string, unknown>;
	execute(args: TArgs): Promise<TResult>;
}

export function toOpenAITool(tool: Tool): OpenAIToolDefinition {
	return {
		type: "function",
		function: {
			name: tool.name,
			description: tool.description,
			parameters: tool.parameters,
		},
	};
}

export function buildToolMap(tools: Tool[]): Map<string, Tool> {
	const map = new Map<string, Tool>();
	for (const tool of tools) {
		if (map.has(tool.name)) {
			throw new Error(`Duplicate tool name: ${tool.name}`);
		}
		map.set(tool.name, tool);
	}
	return map;
}
