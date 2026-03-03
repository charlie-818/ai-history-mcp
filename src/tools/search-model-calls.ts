/**
 * Tool: search_model_calls
 * Purpose: Search for logged model calls with various filters.
 */

import { z } from "zod";
import { MetricsStore } from "../store.js";
import { ModelCallLog, SearchCallsParams } from "../schema.js";

const MAX_CONTENT_LENGTH = 500;

// Input validation schema
export const searchModelCallsInputSchema = z.object({
  project: z.string().optional(),
  environment: z.string().optional(),
  userId: z.string().optional(),
  modelName: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.number().positive().max(100).default(50),
});

export type SearchModelCallsInput = z.infer<typeof searchModelCallsInputSchema>;

/**
 * Truncate message content for safety in large result sets
 */
function truncateContent(content: string, maxLength: number = MAX_CONTENT_LENGTH): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength) + "...[truncated]";
}

/**
 * Truncate messages in a call log for safe transmission
 */
function truncateCallLog(call: ModelCallLog): ModelCallLog {
  return {
    ...call,
    inputMessages: call.inputMessages.map((m) => ({
      ...m,
      content: truncateContent(m.content),
    })),
    outputMessages: call.outputMessages.map((m) => ({
      ...m,
      content: truncateContent(m.content),
    })),
    retrievedContext: call.retrievedContext?.map((ctx) => ({
      ...ctx,
      // Keep context references but don't include full content
    })),
  };
}

/**
 * Create the search_model_calls tool handler
 */
export function createSearchModelCallsTool(store: MetricsStore) {
  return async (input: unknown): Promise<ModelCallLog[]> => {
    const parsed = searchModelCallsInputSchema.parse(input);

    const params: SearchCallsParams = {
      project: parsed.project,
      environment: parsed.environment,
      userId: parsed.userId,
      modelName: parsed.modelName,
      from: parsed.from,
      to: parsed.to,
      limit: parsed.limit,
    };

    const calls = await store.searchCalls(params);

    // Truncate content for safety
    return calls.map(truncateCallLog);
  };
}

// MCP tool definition
export const searchModelCallsToolDefinition = {
  name: "search_model_calls",
  description:
    "Search for logged model calls with optional filters. Returns calls sorted by timestamp (most recent first).",
  inputSchema: {
    type: "object" as const,
    properties: {
      project: {
        type: "string",
        description: "Filter by project",
      },
      environment: {
        type: "string",
        description: "Filter by environment (dev, staging, prod)",
      },
      userId: {
        type: "string",
        description: "Filter by user ID",
      },
      modelName: {
        type: "string",
        description: "Filter by model name",
      },
      from: {
        type: "string",
        description: "Filter calls from this ISO date onwards",
      },
      to: {
        type: "string",
        description: "Filter calls up to this ISO date",
      },
      limit: {
        type: "number",
        description: "Maximum number of results (default 50, max 100)",
        default: 50,
      },
    },
    required: [],
  },
};
