import type { ToolDefinition } from "../providers/types.js";
import type { Tool } from "./types.js";
import { readFileTool } from "./read-file.js";
import { webSearchTool } from "./web-search.js";

// All tools registered here — add new tools to this list
export const ALL_TOOLS: Tool[] = [readFileTool, webSearchTool];

// Convert our Tool format to the JSON Schema format the LLM expects
export function getToolDefinitions(): ToolDefinition[] {
  return ALL_TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema,
  }));
}

// Look up a tool by name — used in the agent loop when LLM calls a tool
export function getTool(name: string): Tool | undefined {
  return ALL_TOOLS.find((t) => t.name === name);
}