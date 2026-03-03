/**
 * Tool: list_sessions
 * Purpose: List session summaries with optional filters.
 */

import { z } from "zod";
import { MetricsStore } from "../store.js";
import { SessionSummary, ListSessionsParams } from "../schema.js";

// Input validation schema
export const listSessionsInputSchema = z.object({
  project: z.string().optional(),
  environment: z.string().optional(),
  limit: z.number().positive().max(100).default(50),
});

export type ListSessionsInput = z.infer<typeof listSessionsInputSchema>;

/**
 * Create the list_sessions tool handler
 */
export function createListSessionsTool(store: MetricsStore) {
  return async (input: unknown): Promise<SessionSummary[]> => {
    const parsed = listSessionsInputSchema.parse(input);

    const params: ListSessionsParams = {
      project: parsed.project,
      environment: parsed.environment,
      limit: parsed.limit,
    };

    return store.listSessions(params);
  };
}

// MCP tool definition
export const listSessionsToolDefinition = {
  name: "list_sessions",
  description:
    "List session summaries showing aggregated metrics for each session. Sessions are groups of related model calls.",
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
      limit: {
        type: "number",
        description: "Maximum number of results (default 50, max 100)",
        default: 50,
      },
    },
    required: [],
  },
};
